-- Eventos do Google ignorados ("não é trabalho": ensaios, reuniões…) — o botão "Ignorar" no
-- Por registar. Guarda a chave do evento (calendário|dia|hora|uid), por isso vale em todos os aparelhos.
-- Correr uma vez no SQL Editor do Supabase.
create table if not exists gcal_ignored (
  key        text primary key,
  title      text,
  event_date date,
  created_at timestamptz not null default now()
);

alter table gcal_ignored enable row level security;
create policy "auth read gcal_ignored"  on gcal_ignored for select to authenticated using (true);
create policy "auth write gcal_ignored" on gcal_ignored for all    to authenticated using (true) with check (true);
