import { Router } from 'express';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, forbidden, notFound } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { signedUrl } from '../lib/supabase.js';

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
  const stages = await query('select * from treatment_stages where treatment_id = $1 order by order_index', [req.params.id]);
  res.json({ ...t, stages });
}));
