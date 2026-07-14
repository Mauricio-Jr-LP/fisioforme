import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import { signedUrl } from '../lib/supabase.js';

export const consultationsRouter = Router();
consultationsRouter.use(requireStaff);

const schema = z.object({
  patient_id: z.string().uuid(),
  treatment_id: z.string().uuid().nullish(),
  stage_id: z.string().uuid().nullish(),
  appointment_id: z.string().uuid().nullish(),
  date: z.string(),
  pain_level: z.number().int().min(0).max(10).nullish(),
  subjective: z.string().nullish(),
  objective: z.string().nullish(),
  assessment: z.string().nullish(),
  plan: z.string().nullish(),
  notes: z.string().nullish(),
});

async function withAttachments(consultationId: string) {
  const atts = await query<any>(
    "select * from attachments where entity_type = 'consultation' and entity_id = $1 order by created_at",
    [consultationId]
  );
  for (const a of atts) a.file_url = await signedUrl(a.file_path);
  return atts;
}

consultationsRouter.get('/', asyncHandler(async (req, res) => {
  const params: any[] = [];
  let where = 'where 1=1';
  if (req.query.patient_id) { params.push(req.query.patient_id); where += ` and patient_id = $${params.length}`; }
  if (req.query.treatment_id) { params.push(req.query.treatment_id); where += ` and treatment_id = $${params.length}`; }
  const rows = await query(`select * from consultations ${where} order by date desc, created_at desc limit 500`, params);
  res.json(rows);
}));

consultationsRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = await queryOne<any>('select * from consultations where id = $1', [req.params.id]);
  if (!row) throw notFound('Consulta não encontrada');
  row.attachments = await withAttachments(req.params.id);
  res.json(row);
}));

consultationsRouter.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const row = await queryOne(
    `insert into consultations
       (patient_id, treatment_id, stage_id, appointment_id, date, pain_level, subjective, objective, assessment, plan, notes, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [d.patient_id, d.treatment_id ?? null, d.stage_id ?? null, d.appointment_id ?? null, d.date,
     d.pain_level ?? null, d.subjective ?? null, d.objective ?? null, d.assessment ?? null, d.plan ?? null, d.notes ?? null, req.user!.id]
  );
  // se vinculada a etapa, incrementa sessões concluídas
  if (d.stage_id) {
    await query('update treatment_stages set completed_sessions = completed_sessions + 1 where id = $1', [d.stage_id]);
  }
  res.status(201).json(row);
}));

consultationsRouter.put('/:id', asyncHandler(async (req, res) => {
  const d = schema.partial().parse(req.body);
  const keys = Object.keys(d);
  if (!keys.length) throw notFound('Nada para atualizar');
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (d as any)[k]);
  values.push(req.params.id);
  const row = await queryOne(`update consultations set ${set} where id = $${values.length} returning *`, values);
  if (!row) throw notFound('Consulta não encontrada');
  res.json(row);
}));

consultationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await query('delete from consultations where id = $1', [req.params.id]);
  res.status(204).end();
}));
