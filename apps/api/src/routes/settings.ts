import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff, requireAdmin } from '../middleware/auth.js';

export const settingsRouter = Router();

// GET público — dados básicos da clínica (nome etc.)
settingsRouter.get('/', asyncHandler(async (_req, res) => {
  const row = await queryOne<{ value: any }>("select value from clinic_settings where key = 'clinic'");
  res.json(row?.value ?? {});
}));

settingsRouter.put('/', requireStaff, asyncHandler(async (req, res) => {
  const value = z.record(z.any()).parse(req.body);
  const row = await queryOne(
    `insert into clinic_settings (key, value, updated_at) values ('clinic', $1, now())
     on conflict (key) do update set value = $1, updated_at = now() returning value`,
    [value]
  );
  res.json((row as any)?.value ?? value);
}));

// Lista de terapeutas (para atribuição)
settingsRouter.get('/staff', requireStaff, asyncHandler(async (_req, res) => {
  const rows = await query("select id, full_name, role, email from profiles where role in ('admin','therapist') order by full_name");
  res.json(rows);
}));

settingsRouter.put('/staff/:id/promote', requireAdmin, asyncHandler(async (req, res) => {
  const row = await queryOne(`update profiles set role = 'therapist' where id = $1 returning *`, [req.params.id]);
  if (!row) throw notFound('Usuário não encontrado');
  res.json(row);
}));
