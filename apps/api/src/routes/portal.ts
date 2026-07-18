import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, forbidden, notFound, badRequest } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { signedUrl } from '../lib/supabase.js';
import { isSlotFree } from '../services/availability.js';

// Portal do paciente — o usuário logado só acessa a própria ficha.
export const portalRouter = Router();
portalRouter.use(requireAuth);

function patientId(req: any): string {
  if (!req.user?.patient_id) throw forbidden('Nenhuma ficha de paciente vinculada a esta conta.');
  return req.user.patient_id;
}

// GET /portal/me — ficha + resumo
portalRouter.get('/me', asyncHandler(async (req, res) => {
  const pid = patientId(req);
  const patient = await queryOne('select * from patients where id = $1', [pid]);
  if (!patient) throw notFound('Ficha não encontrada');
  const [treatments, appointments] = await Promise.all([
    query('select * from treatments where patient_id = $1 order by created_at desc', [pid]),
    query(`select a.*, json_build_object('name', s.name, 'color', s.color) as service_type
             from appointments a left join service_types s on s.id = a.service_type_id
             where a.patient_id = $1 order by a.start_time desc limit 50`, [pid]),
  ]);
  res.json({ patient, treatments, appointments });
}));

// GET /portal/consultations
portalRouter.get('/consultations', asyncHandler(async (req, res) => {
  const pid = patientId(req);
  const rows = await query<any>(
    'select * from consultations where patient_id = $1 order by date desc, created_at desc',
    [pid]
  );
  for (const r of rows) {
    const atts = await query<any>(
      "select * from attachments where entity_type = 'consultation' and entity_id = $1",
      [r.id]
    );
    for (const a of atts) a.file_url = await signedUrl(a.file_path);
    r.attachments = atts;
  }
  res.json(rows);
}));

// GET /portal/treatments/:id
portalRouter.get('/treatments/:id', asyncHandler(async (req, res) => {
  const pid = patientId(req);
  const t = await queryOne('select * from treatments where id = $1 and patient_id = $2', [req.params.id, pid]);
  if (!t) throw notFound('Tratamento não encontrado');
  
  const [stages, consultations] = await Promise.all([
    query('select * from treatment_stages where treatment_id = $1 order by order_index', [req.params.id]),
    query('select * from consultations where treatment_id = $1 order by date desc, created_at desc', [req.params.id]),
  ]);
  
  for (const r of consultations) {
    const atts = await query<any>("select * from attachments where entity_type = 'consultation' and entity_id = $1", [r.id]);
    for (const a of atts) a.file_url = await signedUrl(a.file_path);
    r.attachments = atts;
  }
  
  res.json({ ...t, stages, consultations });
}));

// POST /portal/appointments
portalRouter.post('/appointments', asyncHandler(async (req, res) => {
  const pid = patientId(req);
  const schema = z.object({
    service_type_id: z.string().uuid(),
    start_time: z.string(),
    notes: z.string().nullish(),
  });
  const d = schema.parse(req.body);

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
       (patient_id, service_type_id, start_time, end_time, status, notes)
     values ($1,$2,$3,$4,'pending',$5)
     returning id, start_time, end_time, status`,
    [pid, d.service_type_id, d.start_time, end, d.notes ?? null]
  );
  res.status(201).json(row);
}));

// PUT /portal/appointments/:id/cancel
portalRouter.put('/appointments/:id/cancel', asyncHandler(async (req, res) => {
  const pid = patientId(req);
  const appt = await queryOne('select * from appointments where id = $1 and patient_id = $2', [req.params.id, pid]);
  if (!appt) throw notFound('Agendamento não encontrado');
  if (appt.status === 'cancelled') throw forbidden('Agendamento já está cancelado');
  if (appt.status === 'completed') throw forbidden('Não é possível cancelar um agendamento concluído');

  // Validação de desmarque (24h de antecedência)
  // Em um sistema real, poderíamos ler o tempo de antecedência das configurações (clinic_settings)
  const settings = await queryOne("select value from clinic_settings where key = 'cancellation_notice_hours'");
  const noticeHours = settings ? Number(settings.value) : 24;

  const now = new Date();
  const start = new Date(appt.start_time);
  const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < noticeHours) {
    res.status(400).json({ error: `O cancelamento só é permitido com no mínimo ${noticeHours} horas de antecedência.` });
    return;
  }

  await query("update appointments set status = 'cancelled' where id = $1", [req.params.id]);
  res.json({ success: true });
}));
