-- ═══════════════════════════════════════════════════════════════
-- FisioForme — Dados de exemplo (opcional)
-- Rode DEPOIS de 0001_init.sql. Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- Tipos de serviço padrão
insert into service_types (name, description, duration_minutes, price, color) values
  ('Avaliação Fisioterapêutica', 'Primeira consulta, anamnese e avaliação completa', 60, 150, '#3182CE'),
  ('Sessão de Fisioterapia', 'Sessão de tratamento padrão', 50, 120, '#38A169'),
  ('Pilates Clínico', 'Sessão de pilates terapêutico', 55, 130, '#805AD5'),
  ('RPG', 'Reeducação Postural Global', 60, 160, '#DD6B20'),
  ('Fisioterapia Domiciliar', 'Atendimento em domicílio', 60, 200, '#D53F8C')
on conflict do nothing;

-- Disponibilidade: seg-sex 08:00-12:00 e 13:00-18:00; sáb 08:00-12:00
insert into availability_rules (weekday, start_time, end_time) values
  (1, '08:00', '12:00'), (1, '13:00', '18:00'),
  (2, '08:00', '12:00'), (2, '13:00', '18:00'),
  (3, '08:00', '12:00'), (3, '13:00', '18:00'),
  (4, '08:00', '12:00'), (4, '13:00', '18:00'),
  (5, '08:00', '12:00'), (5, '13:00', '18:00'),
  (6, '08:00', '12:00')
on conflict do nothing;

-- Pacientes de exemplo
insert into patients (full_name, email, phone, birth_date, gender, main_complaint, active) values
  ('Maria Oliveira', 'maria@exemplo.com', '(11) 98888-1111', '1985-03-12', 'female', 'Dor lombar crônica', true),
  ('João Santos', 'joao@exemplo.com', '(11) 97777-2222', '1990-07-25', 'male', 'Reabilitação pós-cirúrgica de joelho', true),
  ('Ana Costa', 'ana@exemplo.com', '(11) 96666-3333', '1978-11-02', 'female', 'Cervicalgia e tensão muscular', true)
on conflict do nothing;
