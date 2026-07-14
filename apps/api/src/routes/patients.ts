import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireStaff);

const patientSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().nullish().or(z.literal('')),
  phone: z.string().nullish(),
  birth_date: z.string().nullish(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  document: z.string().nullish(),
  address: z.string().nullish(),
  emergency_contact: z.string().nullish(),
  main_complaint: z.string().nullish(),
  medical_history: z.string().nullish(),
  allergies: z.string().nullish(),
  medications: z.string().nullish(),
  notes: z.string().nullish(),
  active: z.boolean().optional(),
  profile_id: z.string().uuid().nullish(),
});

const COLS = [
  'full_name', 'email', 'phone', 'birth_date', 'gender', 'document', 'address',
  'emergency_contact', 'main_complaint', 'medical_history', 'allergies',
  'medications', 'notes', 'active', 'profile_id',
] as const;

// GET /patients?search=&active=
patientsRouter.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const params: any[] = [];
  let where = 'where 1=1';
  if (search) {
    params.push(`%${search}%`);
    where += ` and (full_name ilike $${params.length} or coalesce(phone,'') ilike $${params.length} or coalesce(email,'') ilike $${params.length} or coalesce(document,'') ilike $${params.length})`;
  }
  if (req.query.active === 'true') where += ' and active = true';
  const rows = await query(
    `select * from patients ${where} order by full_name asc limit 500`,
    params
  );
  res.json(rows);
}));

// GET /patients/:id (com resumo)
patientsRouter.get('/:id', asyncHandler(async (req, res) => {
  const patient = await queryOne('select * from patients where id = $1', [req.params.id]);
  if (!patient) throw notFound('Paciente não encontrado');
  const [treatments, consultations, notes, appointments, attachments] = await Promise.all([
    query('select * from treatments where patient_id = $1 order by created_at desc', [req.params.id]),
    query('select * from consultations where patient_id = $1 order by date desc, created_at desc', [req.params.id]),
    query('select n.*, p.full_name as author_name from patient_notes n left join profiles p on p.id = n.author_id where n.patient_id = $1 order by n.created_at desc', [req.params.id]),
    query(`select a.*, s.name as service_name, s.color as service_color
             from appointments a left join service_types s on s.id = a.service_type_id
             where a.patient_id = $1 order by a.start_time desc limit 50`, [req.params.id]),
    query("select * from attachments where entity_type = 'patient' and entity_id = $1 order by created_at desc", [req.params.id])
  ]);
  
  // assinar urls
  const { signedUrl } = await import('../lib/supabase.js');
  for (const a of attachments) {
    a.file_url = await signedUrl(a.file_path);
  }

  res.json({ ...patient, treatments, consultations, notes, appointments, attachments });
}));

// POST /patients
patientsRouter.post('/', asyncHandler(async (req, res) => {
  const data = patientSchema.parse(req.body);
  const values = COLS.map((c) => (data as any)[c] ?? (c === 'active' ? true : c === 'gender' ? 'unspecified' : null));
  const placeholders = COLS.map((_, i) => `$${i + 1}`).join(', ');
  const row = await queryOne(
    `insert into patients (${COLS.join(', ')}) values (${placeholders}) returning *`,
    values
  );
  res.status(201).json(row);
}));

// PUT /patients/:id
patientsRouter.put('/:id', asyncHandler(async (req, res) => {
  const data = patientSchema.partial().parse(req.body);
  const keys = Object.keys(data).filter((k) => (COLS as readonly string[]).includes(k));
  if (keys.length === 0) throw notFound('Nada para atualizar');
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => (data as any)[k]);
  values.push(req.params.id);
  const row = await queryOne(
    `update patients set ${set} where id = $${values.length} returning *`,
    values
  );
  if (!row) throw notFound('Paciente não encontrado');
  res.json(row);
}));

// DELETE /patients/:id
patientsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await query('delete from patients where id = $1', [req.params.id]);
  res.status(204).end();
}));

// ── Notas de evolução ────────────────────────────────────────
patientsRouter.post('/:id/notes', asyncHandler(async (req, res) => {
  const schema = z.object({ title: z.string().nullish(), body: z.string().min(1) });
  const { title, body } = schema.parse(req.body);
  const row = await queryOne(
    'insert into patient_notes (patient_id, author_id, title, body) values ($1,$2,$3,$4) returning *',
    [req.params.id, req.user!.id, title ?? null, body]
  );
  res.status(201).json(row);
}));

patientsRouter.delete('/:id/notes/:noteId', asyncHandler(async (req, res) => {
  await query('delete from patient_notes where id = $1 and patient_id = $2', [req.params.noteId, req.params.id]);
  res.status(204).end();
}));
