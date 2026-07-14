import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound, badRequest, forbidden } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import { isSlotFree } from '../services/availability.js';

export const appointmentsRouter = Router();
appointmentsRouter.use(requireStaff);

const APPT_SELECT = `
  select a.*,
         case when a.patient_id is not null then row_to_json(p) end as patient,
         json_build_object('id', s.id, 'name', s.name, 'color', s.color, 'duration_minutes', s.duration_minutes) as service_type
    from appointments a
    left join lateral (select p2.id, p2.full_name, p2.phone from patients p2 where p2.id = a.patient_id) p on true
    left join service_types s on s.id = a.service_type_id`;

// GET /appointments?from=&to=&status=
appointmentsRouter.get('/', asyncHandler(async (req, res) => {
  const params: any[] = [];
  let where = 'where 1=1';
  if (req.query.from) { params.push(req.query.from); where += ` and a.start_time >= $${params.length}`; }
  if (req.query.to) { params.push(req.query.to); where += ` and a.start_time <= $${params.length}`; }
  if (req.query.status) { params.push(req.query.status); where += ` and a.status = $${params.length}`; }
  if (req.query.patient_id) { params.push(req.query.patient_id); where += ` and a.patient_id = $${params.length}`; }
  const rows = await query(`${APPT_SELECT} ${where} order by a.start_time asc limit 1000`, params);
  res.json(rows);
}));

appointmentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = await queryOne(`${APPT_SELECT} where a.id = $1`, [req.params.id]);
  if (!row) throw notFound('Agendamento não encontrado');
  res.json(row);
}));

const createSchema = z.object({
  patient_id: z.string().uuid().nullish(),
  service_type_id: z.string().uuid(),
  therapist_id: z.string().uuid().nullish(),
  start_time: z.string(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().nullish(),
});

async function endFromService(serviceTypeId: string, startIso: string): Promise<string> {
  const svc = await queryOne<{ duration_minutes: number }>(
    'select duration_minutes from service_types where id = $1',
    [serviceTypeId]
  );
  if (!svc) throw badRequest('Serviço inválido');
  return new Date(new Date(startIso).getTime() + svc.duration_minutes * 60000).toISOString();
}

appointmentsRouter.post('/', asyncHandler(async (req, res) => {
  const d = createSchema.parse(req.body);
  const end = await endFromService(d.service_type_id, d.start_time);
  const row = await queryOne(
    `insert into appointments (patient_id, service_type_id, therapist_id, start_time, end_time, status, notes)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [d.patient_id ?? null, d.service_type_id, d.therapist_id ?? null, d.start_time, end, d.status ?? 'confirmed', d.notes ?? null]
  );
  res.status(201).json(row);
}));

const updateSchema = createSchema.partial().extend({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
});

appointmentsRouter.put('/:id', asyncHandler(async (req, res) => {
  const d = updateSchema.parse(req.body);
  const current = await queryOne<{ service_type_id: string; start_time: string }>(
    'select service_type_id, start_time from appointments where id = $1',
    [req.params.id]
  );
  if (!current) throw notFound('Agendamento não encontrado');

  const patch: Record<string, any> = { ...d };
  // recomputa end_time se mudou horário ou serviço
  if (d.start_time || d.service_type_id) {
    const svcId = d.service_type_id ?? current.service_type_id;
    const start = d.start_time ?? current.start_time;
    patch.end_time = await endFromService(svcId, start);
  }
  const keys = Object.keys(patch);
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => patch[k]);
  values.push(req.params.id);
  const row = await queryOne(`update appointments set ${set} where id = $${values.length} returning *`, values);
  res.json(row);
}));

// PATCH status rápido
appointmentsRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
  }).parse(req.body);
  const row = await queryOne('update appointments set status = $1 where id = $2 returning *', [status, req.params.id]);
  if (!row) throw notFound('Agendamento não encontrado');
  res.json(row);
}));

appointmentsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await query('delete from appointments where id = $1', [req.params.id]);
  res.status(204).end();
}));

// ─────────────────────────────────────────────────────────────
// Router público (sem autenticação) para agendamento externo
// ─────────────────────────────────────────────────────────────
export const publicBookingRouter = Router();

const publicSchema = z.object({
  service_type_id: z.string().uuid(),
  start_time: z.string(),
  guest_name: z.string().min(2),
  guest_email: z.string().email(),
  guest_phone: z.string().min(6),
  notes: z.string().nullish(),
});

publicBookingRouter.post('/', asyncHandler(async (req, res) => {
  const d = publicSchema.parse(req.body);
  const svc = await queryOne<{ duration_minutes: number }>(
    'select duration_minutes from service_types where id = $1 and active = true',
    [d.service_type_id]
  );
  if (!svc) throw badRequest('Serviço inválido');

  const free = await isSlotFree(d.start_time, svc.duration_minutes);
  if (!free) throw badRequest('Este horário acabou de ser reservado. Escolha outro.');

  const end = new Date(new Date(d.start_time).getTime() + svc.duration_minutes * 60000).toISOString();
  const row = await queryOne(
    `insert into appointments
       (service_type_id, start_time, end_time, status, is_public_booking, guest_name, guest_email, guest_phone, notes)
     values ($1,$2,$3,'pending',true,$4,$5,$6,$7)
     returning id, start_time, end_time, status`,
    [d.service_type_id, d.start_time, end, d.guest_name, d.guest_email, d.guest_phone, d.notes ?? null]
  );
  res.status(201).json({
    ...row,
    message: 'Solicitação de agendamento recebida! Entraremos em contato para confirmar.',
  });
}));
