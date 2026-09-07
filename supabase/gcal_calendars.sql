-- Calendários Google ligados a projetos (um feed iCal secreto por projeto).
-- Correr uma vez no SQL Editor do Supabase.
create table if not exists gcal_calendars (
  id         uuid primary key default gen_random_uuid(),
  url        text not null unique,
  project_id uuid not null references projects(id),
  created_at timestamptz not null default now()
);

alter table gcal_calendars enable row level security;
create policy "auth read gcal"  on gcal_calendars for select to authenticated using (true);
create policy "auth write gcal" on gcal_calendars for all    to authenticated using (true) with check (true);
