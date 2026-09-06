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
  gross_value    numeric(10,2),          -- valor bruto acordado
  value          numeric(10,2) not null default 0,  -- valor final (o que é recebido)
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
-- paleta pastel "Rosé Elegante"; a ordem (sort_order) é a ordem validada
-- para daltonismo nas séries adjacentes dos gráficos — não trocar à toa
insert into projects (name, kind, color, sort_order) values
  ('Cabelos',          'hair',  '#d46a8f', 1),
  ('Noventamente',     'music', '#cf9c3f', 2),
  ('Banda do Algarve', 'music', '#12a89e', 3),
  ('Outros',           'music', '#cd7c5a', 4),
  ('Oitentamente',     'music', '#9c7ed4', 5),
  ('Gospel',           'music', '#4f9f68', 6),
  ('Tune Up',          'music', '#6d8ed6', 7),
  ('Mickael',          'music', '#a49b3f', 8),
  ('Lady Gaga',        'music', '#c263ac', 9);

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
