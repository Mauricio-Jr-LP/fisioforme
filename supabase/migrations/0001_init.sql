-- ═══════════════════════════════════════════════════════════════
-- FisioForme — Schema inicial
-- Rode no SQL Editor do Supabase (ou via `supabase db push`).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'therapist', 'patient');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_type as enum ('male', 'female', 'other', 'unspecified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type treatment_status as enum ('active', 'paused', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stage_status as enum ('pending', 'in_progress', 'completed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attachment_entity as enum ('consultation', 'treatment', 'patient');
exception when duplicate_object then null; end $$;

-- ── updated_at trigger helper ──────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── profiles (espelha auth.users) ──────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'patient',
  full_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- Cria profile automaticamente quando um usuário é criado no Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── patients ───────────────────────────────────────────────────
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  gender gender_type not null default 'unspecified',
  document text,
  address text,
  emergency_contact text,
  main_complaint text,
  medical_history text,
  allergies text,
  medications text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_patients_profile on patients(profile_id);
create index if not exists idx_patients_name on patients using gin (to_tsvector('portuguese', full_name));
drop trigger if exists trg_patients_updated on patients;
create trigger trg_patients_updated before update on patients
  for each row execute function set_updated_at();

-- ── patient_notes (linha do tempo simples) ─────────────────────
create table if not exists patient_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  title text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_patient_notes_patient on patient_notes(patient_id);

-- ── service_types ──────────────────────────────────────────────
create table if not exists service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  price numeric(10,2),
  color text not null default '#3182CE',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── availability_rules (semanal recorrente) ────────────────────
create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  check (end_time > start_time)
);
create index if not exists idx_avail_weekday on availability_rules(weekday);

-- ── availability_exceptions (bloqueios / extras) ───────────────
create table if not exists availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  reason text
);
create index if not exists idx_avail_exc_date on availability_exceptions(date);

-- ── appointments ───────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete set null,
  service_type_id uuid references service_types(id) on delete set null,
  therapist_id uuid references profiles(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  is_public_booking boolean not null default false,
  guest_name text,
  guest_email text,
  guest_phone text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_appt_start on appointments(start_time);
create index if not exists idx_appt_patient on appointments(patient_id);
create index if not exists idx_appt_status on appointments(status);

-- ── treatments ─────────────────────────────────────────────────
create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title text not null,
  description text,
  diagnosis text,
  status treatment_status not null default 'active',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_treatments_patient on treatments(patient_id);
drop trigger if exists trg_treatments_updated on treatments;
create trigger trg_treatments_updated before update on treatments
  for each row execute function set_updated_at();

-- ── treatment_stages ───────────────────────────────────────────
create table if not exists treatment_stages (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  status stage_status not null default 'pending',
  target_sessions int not null default 0,
  completed_sessions int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_stages_treatment on treatment_stages(treatment_id);

-- ── consultations (evoluções SOAP) ─────────────────────────────
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  stage_id uuid references treatment_stages(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  date date not null default current_date,
  pain_level int check (pain_level between 0 and 10),
  subjective text,
  objective text,
  assessment text,
  plan text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_consult_patient on consultations(patient_id);
create index if not exists idx_consult_treatment on consultations(treatment_id);

-- ── attachments (fotos / arquivos) ─────────────────────────────
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type attachment_entity not null,
  entity_id uuid not null,
  file_path text not null,
  file_name text not null,
  file_type text,
  size_bytes bigint,
  caption text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_attach_entity on attachments(entity_type, entity_id);

-- ── clinic_settings (config chave/valor) ───────────────────────
create table if not exists clinic_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into clinic_settings (key, value) values
  ('clinic', '{"name":"FisioForme","phone":"","address":"","slot_granularity_minutes":30}')
on conflict (key) do nothing;

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- O backend usa a SERVICE ROLE (bypassa RLS). As policies abaixo
-- protegem acesso direto via anon/authenticated (portal do paciente).
-- ═══════════════════════════════════════════════════════════════
alter table profiles enable row level security;
alter table patients enable row level security;
alter table patient_notes enable row level security;
alter table service_types enable row level security;
alter table availability_rules enable row level security;
alter table availability_exceptions enable row level security;
alter table appointments enable row level security;
alter table treatments enable row level security;
alter table treatment_stages enable row level security;
alter table consultations enable row level security;
alter table attachments enable row level security;
alter table clinic_settings enable row level security;

-- Helper: usuário é staff (admin/therapist)?
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'therapist')
  );
$$;

-- profiles: cada um vê o próprio; staff vê todos
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select
  using (id = auth.uid() or is_staff());
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid());

-- staff vê tudo; paciente vê os próprios registros
drop policy if exists patients_staff on patients;
create policy patients_staff on patients for all
  using (is_staff()) with check (is_staff());
drop policy if exists patients_self on patients;
create policy patients_self on patients for select
  using (profile_id = auth.uid());

drop policy if exists treatments_staff on treatments;
create policy treatments_staff on treatments for all
  using (is_staff()) with check (is_staff());
drop policy if exists treatments_self on treatments;
create policy treatments_self on treatments for select
  using (exists (select 1 from patients p where p.id = treatments.patient_id and p.profile_id = auth.uid()));

drop policy if exists stages_staff on treatment_stages;
create policy stages_staff on treatment_stages for all
  using (is_staff()) with check (is_staff());
drop policy if exists stages_self on treatment_stages;
create policy stages_self on treatment_stages for select
  using (exists (
    select 1 from treatments t join patients p on p.id = t.patient_id
    where t.id = treatment_stages.treatment_id and p.profile_id = auth.uid()
  ));

drop policy if exists consult_staff on consultations;
create policy consult_staff on consultations for all
  using (is_staff()) with check (is_staff());
drop policy if exists consult_self on consultations;
create policy consult_self on consultations for select
  using (exists (select 1 from patients p where p.id = consultations.patient_id and p.profile_id = auth.uid()));

drop policy if exists notes_staff on patient_notes;
create policy notes_staff on patient_notes for all
  using (is_staff()) with check (is_staff());

drop policy if exists attach_staff on attachments;
create policy attach_staff on attachments for all
  using (is_staff()) with check (is_staff());

drop policy if exists appt_staff on appointments;
create policy appt_staff on appointments for all
  using (is_staff()) with check (is_staff());
drop policy if exists appt_self on appointments;
create policy appt_self on appointments for select
  using (exists (select 1 from patients p where p.id = appointments.patient_id and p.profile_id = auth.uid()));

-- service_types e disponibilidade: leitura pública (para agendamento sem login)
drop policy if exists services_read on service_types;
create policy services_read on service_types for select using (true);
drop policy if exists services_write on service_types;
create policy services_write on service_types for all using (is_staff()) with check (is_staff());

drop policy if exists avail_rules_read on availability_rules;
create policy avail_rules_read on availability_rules for select using (true);
drop policy if exists avail_rules_write on availability_rules;
create policy avail_rules_write on availability_rules for all using (is_staff()) with check (is_staff());

drop policy if exists avail_exc_read on availability_exceptions;
create policy avail_exc_read on availability_exceptions for select using (true);
drop policy if exists avail_exc_write on availability_exceptions;
create policy avail_exc_write on availability_exceptions for all using (is_staff()) with check (is_staff());

drop policy if exists settings_read on clinic_settings;
create policy settings_read on clinic_settings for select using (true);
drop policy if exists settings_write on clinic_settings;
create policy settings_write on clinic_settings for all using (is_staff()) with check (is_staff());
