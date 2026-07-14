import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';

export const serviceTypesRouter = Router();

const schema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  duration_minutes: z.number().int().positive(),
  price: z.number().nullish(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

// GET público (para agendamento sem login) — só ativos por padrão
serviceTypesRouter.get('/', asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user;
  const rows = await query(
    `select * from service_types ${all ? '' : 'where active = true'} order by name asc`
  );
  res.json(rows);
}));

serviceTypesRouter.post('/', requireStaff, asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const row = await queryOne(
    `insert into service_types (name, description, duration_minutes, price, color, active)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [d.name, d.description ?? null, d.duration_minutes, d.price ?? null, d.color ?? '#3182CE', d.active ?? true]
  );
  res.status(201).json(row);
}));

serviceTypesRouter.put('/:id', requireStaff, asyncHandler(async (req, res) => {
  const d = schema.partial().parse(req.body);
  const keys = Object.keys(d);
  if (!keys.length) throw notFound('Nada para atualizar');
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (d as any)[k]);
  values.push(req.params.id);
  const row = await queryOne(`update service_types set ${set} where id = $${values.length} returning *`, values);
  if (!row) throw notFound('Serviço não encontrado');
  res.json(row);
}));

serviceTypesRouter.delete('/:id', requireStaff, asyncHandler(async (req, res) => {
  await query('update service_types set active = false where id = $1', [req.params.id]);
  res.status(204).end();
}));
