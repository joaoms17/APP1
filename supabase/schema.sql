-- =============================================================
-- Joana — Agenda & Finanças
-- Corre este ficheiro no Supabase → SQL Editor → New query → Run
-- ATENÇÃO: apaga as tabelas da app antiga (Ramo).
-- =============================================================

-- 1. Limpar a app antiga -------------------------------------------------
drop table if exists schedules cascade;
drop table if exists proposals cascade;
drop table if exists price_table cascade;
drop table if exists settings cascade;
drop table if exists agenda cascade;
drop table if exists bookings cascade;
drop table if exists leads cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists team cascade;

drop table if exists expenses cascade;
drop table if exists events cascade;
drop table if exists projects cascade;

-- 2. Projetos (áreas de trabalho) ---------------------------------------
create table projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  kind       text not null check (kind in ('hair', 'music')),
  color      text not null,          -- cor usada no calendário e nos gráficos
  sort_order int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Eventos (concertos e serviços de cabelo) ---------------------------
create table events (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id),
  title          text not null,
  event_date     date not null,
  start_time     time,
  location       text,
  value          numeric(10,2) not null default 0,
  paid           boolean not null default false,
  paid_at        date,
  receipt_issued boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index events_date_idx    on events (event_date);
create index events_project_idx on events (project_id);

-- 4. Despesas ------------------------------------------------------------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id),   -- opcional: despesa geral se nulo
  expense_date date not null,
  description  text not null,
  amount       numeric(10,2) not null,
  category     text,
  created_at   timestamptz not null default now()
);

create index expenses_date_idx on expenses (expense_date);

-- 5. Seed dos projetos ---------------------------------------------------
insert into projects (name, kind, color, sort_order) values
  ('Cabelos',          'hair',  '#2a78d6', 1),
  ('Banda do Algarve', 'music', '#eb6834', 2),
  ('Oitentamente',     'music', '#1baf7a', 3),
  ('Noventamente',     'music', '#eda100', 4),
  ('Tune Up',          'music', '#e87ba4', 5),
  ('Gospel',           'music', '#008300', 6),
  ('Outros',           'music', '#4a3aa7', 7);

-- 6. Segurança (RLS): só utilizadores autenticados ----------------------
alter table projects enable row level security;
alter table events   enable row level security;
alter table expenses enable row level security;

create policy "auth read projects"  on projects for select to authenticated using (true);
create policy "auth write projects" on projects for all    to authenticated using (true) with check (true);
create policy "auth read events"    on events   for select to authenticated using (true);
create policy "auth write events"   on events   for all    to authenticated using (true) with check (true);
create policy "auth read expenses"  on expenses for select to authenticated using (true);
create policy "auth write expenses" on expenses for all    to authenticated using (true) with check (true);

-- 7. Contas de utilizador ------------------------------------------------
-- No painel Supabase → Authentication → Users → "Add user":
-- cria as contas (email + password) da Joana e do João.
-- Em Authentication → Sign In / Up, desativa "Enable sign ups"
-- para mais ninguém se poder registar.
