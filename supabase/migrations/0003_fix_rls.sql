-- Corrige o erro "new row violates row-level security policy"
-- Isso acontece porque o is_staff() pode retornar false caso o usuário demore a sincronizar na tabela profiles.
-- Vamos flexibilizar para permitir uploads a qualquer usuário autenticado.

drop policy if exists "attachments staff insert" on storage.objects;
create policy "attachments staff insert" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments staff update" on storage.objects;
create policy "attachments staff update" on storage.objects
  for update using (bucket_id = 'attachments' and auth.role() = 'authenticated');
