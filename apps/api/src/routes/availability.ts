import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import { computeSlots } from '../services/availability.js';

export const availabilityRouter = Router();

// ── Slots livres (público) ───────────────────────────────────
// GET /availability/slots?date=YYYY-MM-DD&service_type_id=...
availabilityRouter.get('/slots', asyncHandler(async (req, res) => {
  const date = String(req.query.date || '');
  const serviceTypeId = String(req.query.service_type_id || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('Parâmetro date inválido');

  let duration = Number(req.query.duration) || 0;
  if (!duration && serviceTypeId) {
    const svc = await queryOne<{ duration_minutes: number }>(
      'select duration_minutes from service_types where id = $1',
      [serviceTypeId]
    );
    duration = svc?.duration_minutes ?? 60;
  }
  if (!duration) duration = 60;

  const slots = await computeSlots(date, duration);
  res.json(slots);
}));

// ── Regras semanais ──────────────────────────────────────────
availabilityRouter.get('/rules', asyncHandler(async (_req, res) => {
  const rows = await query('select * from availability_rules order by weekday, start_time');
  res.json(rows);
}));

const ruleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().optional(),
});

availabilityRouter.post('/rules', requireStaff, asyncHandler(async (req, res) => {
  const d = ruleSchema.parse(req.body);
  const row = await queryOne(
    'insert into availability_rules (weekday, start_time, end_time, active) values ($1,$2,$3,$4) returning *',
    [d.weekday, d.start_time, d.end_time, d.active ?? true]
  );
  res.status(201).json(row);
}));

availabilityRouter.delete('/rules/:id', requireStaff, asyncHandler(async (req, res) => {
  await query('delete from availability_rules where id = $1', [req.params.id]);
  res.status(204).end();
}));

// ── Exceções (bloqueios / extras) ────────────────────────────
availabilityRouter.get('/exceptions', asyncHandler(async (_req, res) => {
  const rows = await query('select * from availability_exceptions order by date desc limit 200');
  res.json(rows);
}));

const excSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_available: z.boolean(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  reason: z.string().nullish(),
});

availabilityRouter.post('/exceptions', requireStaff, asyncHandler(async (req, res) => {
  const d = excSchema.parse(req.body);
  const row = await queryOne(
    'insert into availability_exceptions (date, is_available, start_time, end_time, reason) values ($1,$2,$3,$4,$5) returning *',
    [d.date, d.is_available, d.start_time ?? null, d.end_time ?? null, d.reason ?? null]
  );
  res.status(201).json(row);
}));

availabilityRouter.delete('/exceptions/:id', requireStaff, asyncHandler(async (req, res) => {
  await query('delete from availability_exceptions where id = $1', [req.params.id]);
  res.status(204).end();
}));
