import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';

export const treatmentsRouter = Router();
treatmentsRouter.use(requireStaff);

const schema = z.object({
  patient_id: z.string().uuid(),
  treatment_type: z.string().nullish(),
  title: z.string().min(1),
  description: z.string().nullish(),
  diagnosis: z.string().nullish(),
  price: z.number().min(0).optional(),
  amount_paid: z.number().min(0).optional(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
});

// GET /treatments?patient_id=&status=
treatmentsRouter.get('/', asyncHandler(async (req, res) => {
  const params: any[] = [];
  let where = 'where 1=1';
  if (req.query.patient_id) { params.push(req.query.patient_id); where += ` and t.patient_id = $${params.length}`; }
  if (req.query.status) { params.push(req.query.status); where += ` and t.status = $${params.length}`; }
  const rows = await query(
    `select t.*, json_build_object('id', p.id, 'full_name', p.full_name) as patient
       from treatments t join patients p on p.id = t.patient_id
       ${where} order by t.created_at desc limit 500`,
    params
  );
  res.json(rows);
}));

// GET /treatments/:id (com etapas + consultas)
treatmentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const t = await queryOne(
    `select t.*, json_build_object('id', p.id, 'full_name', p.full_name) as patient
       from treatments t join patients p on p.id = t.patient_id where t.id = $1`,
    [req.params.id]
  );
  if (!t) throw notFound('Tratamento não encontrado');
  const [stages, consultations] = await Promise.all([
    query('select * from treatment_stages where treatment_id = $1 order by order_index asc, created_at asc', [req.params.id]),
    query('select * from consultations where treatment_id = $1 order by date desc, created_at desc', [req.params.id]),
  ]);
  res.json({ ...t, stages, consultations });
}));

treatmentsRouter.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const row = await queryOne(
    `insert into treatments (patient_id, treatment_type, title, description, diagnosis, price, amount_paid, status, start_date, end_date)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [
      d.patient_id, d.treatment_type ?? null, d.title, d.description ?? null, d.diagnosis ?? null,
      d.price ?? 0, d.amount_paid ?? 0, d.status ?? 'active', d.start_date ?? null, d.end_date ?? null
    ]
  );
  res.status(201).json(row);
}));

treatmentsRouter.put('/:id', asyncHandler(async (req, res) => {
  const d = schema.partial().parse(req.body);
  const keys = Object.keys(d);
  if (!keys.length) throw notFound('Nada para atualizar');
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (d as any)[k]);
  values.push(req.params.id);
  const row = await queryOne(`update treatments set ${set} where id = $${values.length} returning *`, values);
  if (!row) throw notFound('Tratamento não encontrado');
  res.json(row);
}));

treatmentsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await query('delete from treatments where id = $1', [req.params.id]);
  res.status(204).end();
}));

// ── Etapas ───────────────────────────────────────────────────
const stageSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  order_index: z.number().int().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  target_sessions: z.number().int().min(0).optional(),
  completed_sessions: z.number().int().min(0).optional(),
});

treatmentsRouter.post('/:id/stages', asyncHandler(async (req, res) => {
  const d = stageSchema.parse(req.body);
  const nextIdx = await queryOne<{ n: number }>(
    'select coalesce(max(order_index)+1, 0) as n from treatment_stages where treatment_id = $1',
    [req.params.id]
  );
  const row = await queryOne(
    `insert into treatment_stages (treatment_id, title, description, order_index, status, target_sessions, completed_sessions)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [req.params.id, d.title, d.description ?? null, d.order_index ?? nextIdx?.n ?? 0, d.status ?? 'pending', d.target_sessions ?? 0, d.completed_sessions ?? 0]
  );
  res.status(201).json(row);
}));

treatmentsRouter.put('/:id/stages/:stageId', asyncHandler(async (req, res) => {
  const d = stageSchema.partial().parse(req.body);
  const keys = Object.keys(d);
  if (!keys.length) throw notFound('Nada para atualizar');
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (d as any)[k]);
  values.push(req.params.stageId);
  const row = await queryOne(`update treatment_stages set ${set} where id = $${values.length} returning *`, values);
  if (!row) throw notFound('Etapa não encontrada');
  res.json(row);
}));

treatmentsRouter.delete('/:id/stages/:stageId', asyncHandler(async (req, res) => {
  await query('delete from treatment_stages where id = $1', [req.params.stageId]);
  res.status(204).end();
}));
