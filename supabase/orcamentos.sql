-- Orçamentos, tabela de preços e cronograma do dia (vertente Cabelos).
-- Correr uma vez no SQL Editor do Supabase. Seguro de repetir.

-- 1. Tabela de preços dos serviços
create table if not exists services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  price      numeric(10,2) not null default 0,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Orçamentos
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  client_name text not null,
  event_date  date,
  location    text,
  status      text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  discount    numeric(10,2) not null default 0,
  notes       text,
  event_id    uuid references events(id) on delete set null,  -- criado ao aceitar
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists quote_items (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references quotes(id) on delete cascade,
  service_name text not null,
  unit_price   numeric(10,2) not null default 0,
  qty          int not null default 1,
  sort_order   int not null default 0
);
create index if not exists quote_items_quote_idx on quote_items (quote_id);

-- 3. Cronograma do dia (linhas hora → pessoa → serviço por evento)
create table if not exists schedule_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  time_at    time not null,
  person     text not null,
  service    text,
  created_at timestamptz not null default now()
);
create index if not exists schedule_items_event_idx on schedule_items (event_id);

-- 4. RLS
alter table services       enable row level security;
alter table quotes         enable row level security;
alter table quote_items    enable row level security;
alter table schedule_items enable row level security;

drop policy if exists "auth all services"  on services;
drop policy if exists "auth all quotes"    on quotes;
drop policy if exists "auth all qitems"    on quote_items;
drop policy if exists "auth all schedule"  on schedule_items;
create policy "auth all services" on services       for all to authenticated using (true) with check (true);
create policy "auth all quotes"   on quotes         for all to authenticated using (true) with check (true);
create policy "auth all qitems"   on quote_items    for all to authenticated using (true) with check (true);
create policy "auth all schedule" on schedule_items for all to authenticated using (true) with check (true);

-- 5. Seed de serviços de exemplo (edita os preços na app)
insert into services (name, price, sort_order) values
  ('Penteado de noiva',       150, 1),
  ('Prova de penteado',        50, 2),
  ('Penteado de convidada',    45, 3),
  ('Penteado de criança',      25, 4),
  ('Deslocação',               30, 5)
on conflict (name) do nothing;
