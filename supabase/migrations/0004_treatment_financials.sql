-- Adicionar campos financeiros e de classificação ao tratamento
alter table treatments
add column if not exists treatment_type text,
add column if not exists price numeric(10, 2) not null default 0,
add column if not exists amount_paid numeric(10, 2) not null default 0;
