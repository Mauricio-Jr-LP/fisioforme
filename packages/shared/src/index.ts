// ─────────────────────────────────────────────────────────────
// FisioForme — Tipos de domínio compartilhados (backend + web)
// ─────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO timestamp
export type TimeString = string; // HH:MM

export type UserRole = 'admin' | 'subadmin' | 'therapist' | 'patient';

export interface Profile {
  id: UUID;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: ISODateTime;
}

// ── Pacientes ────────────────────────────────────────────────
export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export interface Patient {
  id: UUID;
  profile_id: UUID | null; // vinculado a um login (portal)
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: ISODate | null;
  gender: Gender;
  document: string | null; // CPF / documento
  address: string | null;
  emergency_contact: string | null;
  // Anamnese / dados clínicos base
  main_complaint: string | null;
  medical_history: string | null;
  allergies: string | null;
  medications: string | null;
  notes: string | null;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type PatientInput = Partial<Omit<Patient, 'id' | 'created_at' | 'updated_at'>> &
  Pick<Patient, 'full_name'>;

// ── Notas de evolução do paciente (linha do tempo) ───────────
export interface PatientNote {
  id: UUID;
  patient_id: UUID;
  author_id: UUID | null;
  title: string | null;
  body: string;
  created_at: ISODateTime;
}

// ── Tipos de serviço ─────────────────────────────────────────
export interface ServiceType {
  id: UUID;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string; // hex para agenda
  active: boolean;
  created_at: ISODateTime;
}

export type ServiceTypeInput = Partial<Omit<ServiceType, 'id' | 'created_at'>> &
  Pick<ServiceType, 'name' | 'duration_minutes'>;

// ── Disponibilidade ──────────────────────────────────────────
// Regra semanal recorrente
export interface AvailabilityRule {
  id: UUID;
  weekday: number; // 0=domingo ... 6=sábado
  start_time: TimeString;
  end_time: TimeString;
  active: boolean;
}

// Exceção pontual (feriado, bloqueio ou disponibilidade extra)
export interface AvailabilityException {
  id: UUID;
  date: ISODate;
  is_available: boolean; // false = bloqueio, true = disponibilidade extra
  start_time: TimeString | null;
  end_time: TimeString | null;
  reason: string | null;
}

export interface TimeSlot {
  start: ISODateTime;
  end: ISODateTime;
  label: string; // HH:MM
}

// ── Agendamentos ─────────────────────────────────────────────
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: UUID;
  patient_id: UUID | null;
  service_type_id: UUID | null;
  therapist_id: UUID | null;
  start_time: ISODateTime;
  end_time: ISODateTime;
  status: AppointmentStatus;
  notes: string | null;
  // agendamento público (sem login)
  is_public_booking: boolean;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  created_at: ISODateTime;
  // joins opcionais
  patient?: Pick<Patient, 'id' | 'full_name' | 'phone'> | null;
  service_type?: Pick<ServiceType, 'id' | 'name' | 'color' | 'duration_minutes'> | null;
}

export interface AppointmentInput {
  patient_id?: UUID | null;
  service_type_id: UUID;
  therapist_id?: UUID | null;
  start_time: ISODateTime;
  status?: AppointmentStatus;
  notes?: string | null;
}

export interface PublicBookingInput {
  service_type_id: UUID;
  start_time: ISODateTime;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  notes?: string | null;
}

// ── Tratamentos ──────────────────────────────────────────────
export type TreatmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Treatment {
  id: UUID;
  patient_id: UUID;
  treatment_type: string | null;
  title: string;
  description: string | null;
  diagnosis: string | null;
  price: number;
  amount_paid: number;
  status: TreatmentStatus;
  start_date: ISODate | null;
  end_date: ISODate | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  stages?: TreatmentStage[];
  patient?: Pick<Patient, 'id' | 'full_name'> | null;
}

export type TreatmentInput = Partial<Omit<Treatment, 'id' | 'created_at' | 'updated_at'>> &
  Pick<Treatment, 'patient_id' | 'title'>;

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface TreatmentStage {
  id: UUID;
  treatment_id: UUID;
  title: string;
  description: string | null;
  order_index: number;
  status: StageStatus;
  target_sessions: number;
  completed_sessions: number;
  created_at: ISODateTime;
}

export type TreatmentStageInput = Partial<Omit<TreatmentStage, 'id' | 'treatment_id' | 'created_at'>> &
  Pick<TreatmentStage, 'title'>;

// ── Consultas / evoluções (SOAP) ─────────────────────────────
export interface Consultation {
  id: UUID;
  patient_id: UUID;
  treatment_id: UUID | null;
  stage_id: UUID | null;
  appointment_id: UUID | null;
  date: ISODate;
  pain_level: number | null; // 0-10 EVA
  subjective: string | null; // S - relato do paciente
  objective: string | null; // O - avaliação objetiva
  assessment: string | null; // A - diagnóstico/análise
  plan: string | null; // P - conduta/plano
  notes: string | null;
  created_by: UUID | null;
  created_at: ISODateTime;
  attachments?: Attachment[];
}

export type ConsultationInput = Partial<Omit<Consultation, 'id' | 'created_at' | 'created_by'>> &
  Pick<Consultation, 'patient_id' | 'date'>;

// ── Anexos (fotos / arquivos) ────────────────────────────────
export type AttachmentEntity = 'consultation' | 'treatment' | 'patient';

export interface Attachment {
  id: UUID;
  entity_type: AttachmentEntity;
  entity_id: UUID;
  file_path: string; // caminho no bucket
  file_url: string | null; // url pública/assinada
  file_name: string;
  file_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  uploaded_by: UUID | null;
  created_at: ISODateTime;
}

// ── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  patients_total: number;
  appointments_today: number;
  appointments_week: number;
  active_treatments: number;
  pending_appointments: number;
  upcoming: Appointment[];
  next_available: TimeSlot[];
}

// ── API helpers ──────────────────────────────────────────────
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  skipped: 'Ignorada',
};

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];
