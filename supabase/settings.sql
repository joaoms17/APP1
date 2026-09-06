-- Tabela de configurações da app (ex.: URL do Google Calendar).
-- Correr uma vez no SQL Editor do Supabase.
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;
create policy "auth read settings"  on settings for select to authenticated using (true);
create policy "auth write settings" on settings for all    to authenticated using (true) with check (true);
