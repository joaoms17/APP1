-- Pagamentos parciais (sinal + restante) por evento.
-- Correr uma vez no SQL Editor do Supabase.
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  paid_at    date not null,
  amount     numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists payments_event_idx on payments (event_id);

alter table payments enable row level security;
create policy "auth read payments"  on payments for select to authenticated using (true);
create policy "auth write payments" on payments for all    to authenticated using (true) with check (true);
