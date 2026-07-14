import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import { signedUrl, supabaseAdmin } from '../lib/supabase.js';
import { env } from '../config/env.js';

export const attachmentsRouter = Router();
attachmentsRouter.use(requireStaff);

const schema = z.object({
  entity_type: z.enum(['consultation', 'treatment', 'patient']),
  entity_id: z.string().uuid(),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  file_type: z.string().nullish(),
  size_bytes: z.number().int().nullish(),
  caption: z.string().nullish(),
});

// GET /attachments?entity_type=&entity_id=
attachmentsRouter.get('/', asyncHandler(async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const rows = await query<any>(
    'select * from attachments where entity_type = $1 and entity_id = $2 order by created_at',
    [entity_type, entity_id]
  );
  for (const r of rows) r.file_url = await signedUrl(r.file_path);
  res.json(rows);
}));

// POST /attachments — registra metadados após upload no Storage
attachmentsRouter.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const row = await queryOne<any>(
    `insert into attachments (entity_type, entity_id, file_path, file_name, file_type, size_bytes, caption, uploaded_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [d.entity_type, d.entity_id, d.file_path, d.file_name, d.file_type ?? null, d.size_bytes ?? null, d.caption ?? null, req.user!.id]
  );
  row.file_url = await signedUrl(row.file_path);
  res.status(201).json(row);
}));

// PATCH legenda
attachmentsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { caption } = z.object({ caption: z.string().nullish() }).parse(req.body);
  const row = await queryOne('update attachments set caption = $1 where id = $2 returning *', [caption ?? null, req.params.id]);
  if (!row) throw notFound('Anexo não encontrado');
  res.json(row);
}));

// DELETE — remove do storage e do banco
attachmentsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const row = await queryOne<{ file_path: string }>('select file_path from attachments where id = $1', [req.params.id]);
  if (row) {
    await supabaseAdmin.storage.from(env.storageBucket).remove([row.file_path]).catch(() => {});
    await query('delete from attachments where id = $1', [req.params.id]);
  }
  res.status(204).end();
}));
