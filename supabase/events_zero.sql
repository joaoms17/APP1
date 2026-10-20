-- Eventos de 0 € confirmados (ex.: um concerto sem cachê). Correr uma vez no SQL Editor do Supabase.
-- Sem esta coluna, um evento com 0 € fica sempre "Valor pendente" (0 € = valor ainda por saber).
alter table events add column if not exists zero_confirmed boolean not null default false;
