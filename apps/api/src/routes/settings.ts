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
  const rows = await query("select id, full_name, role, email from profiles where role::text in ('admin','subadmin','therapist') order by full_name");
  res.json(rows);
}));

settingsRouter.put('/staff/:id/role', requireAdmin, asyncHandler(async (req, res) => {
  const { role } = z.object({ role: z.enum(['admin', 'subadmin', 'therapist', 'patient']) }).parse(req.body);
  const row = await queryOne(`update profiles set role = $1::text::user_role where id = $2 returning *`, [role, req.params.id]);
  if (!row) throw notFound('Usuário não encontrado');
  res.json(row);
}));

settingsRouter.put('/staff/promote-email', requireAdmin, asyncHandler(async (req, res) => {
  const { email, role } = z.object({ 
    email: z.string().email(), 
    role: z.enum(['admin', 'subadmin', 'therapist']) 
  }).parse(req.body);
  const row = await queryOne(`update profiles set role = $1::text::user_role where lower(email) = lower($2) returning *`, [role, email]);
  if (!row) throw notFound('Nenhuma conta encontrada com este e-mail');
  res.json(row);
}));

settingsRouter.get('/backup', requireAdmin, asyncHandler(async (_req, res) => {
  const [patients, treatments, consultations, appointments, services, settings] = await Promise.all([
    query('select * from patients'),
    query('select * from treatments'),
    query('select * from consultations'),
    query('select * from appointments'),
    query('select * from service_types'),
    query('select * from clinic_settings'),
  ]);
  const backupData = {
    exportDate: new Date().toISOString(),
    data: { patients, treatments, consultations, appointments, services, settings }
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=backup-fisioforme-${Date.now()}.json`);
  res.send(JSON.stringify(backupData, null, 2));
}));
