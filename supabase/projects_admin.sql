-- Período de atividade dos projetos (para a página de gestão).
-- Correr uma vez no SQL Editor do Supabase.
alter table projects add column if not exists active_from int;  -- ano de início (null = desde sempre)
alter table projects add column if not exists active_to   int;  -- ano de fim (null = ainda ativo)
