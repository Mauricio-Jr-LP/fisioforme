-- ═══════════════════════════════════════════════════════════════
-- FisioForme — Bucket de anexos (Storage)
-- Rode no SQL Editor do Supabase. O backend usa service role para
-- upload/assinatura, mas o front (staff logado) também sobe direto.
-- ═══════════════════════════════════════════════════════════════

-- Cria o bucket privado "attachments"
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Helper já criado em 0001_init.sql: public.is_staff()

-- Somente staff pode ler/gravar objetos do bucket (via sessão do usuário).
-- O backend (service role) ignora estas policies.
drop policy if exists "attachments staff read" on storage.objects;
create policy "attachments staff read" on storage.objects
  for select using (bucket_id = 'attachments' and public.is_staff());

drop policy if exists "attachments staff insert" on storage.objects;
create policy "attachments staff insert" on storage.objects
  for insert with check (bucket_id = 'attachments' and public.is_staff());

drop policy if exists "attachments staff update" on storage.objects;
create policy "attachments staff update" on storage.objects
  for update using (bucket_id = 'attachments' and public.is_staff());

drop policy if exists "attachments staff delete" on storage.objects;
create policy "attachments staff delete" on storage.objects
  for delete using (bucket_id = 'attachments' and public.is_staff());
