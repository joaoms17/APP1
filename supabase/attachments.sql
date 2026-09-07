-- Anexos (fotos de recibos/faturas) em eventos e despesas.
-- Correr uma vez no SQL Editor do Supabase. Seguro de repetir.

-- 1. Bucket privado no Storage
insert into storage.buckets (id, name, public) values ('anexos', 'anexos', false)
on conflict (id) do nothing;

drop policy if exists "auth read anexos"   on storage.objects;
drop policy if exists "auth insert anexos" on storage.objects;
drop policy if exists "auth delete anexos" on storage.objects;
create policy "auth read anexos"   on storage.objects for select to authenticated using (bucket_id = 'anexos');
create policy "auth insert anexos" on storage.objects for insert to authenticated with check (bucket_id = 'anexos');
create policy "auth delete anexos" on storage.objects for delete to authenticated using (bucket_id = 'anexos');

-- 2. Registo dos anexos
create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  parent_kind text not null check (parent_kind in ('event', 'expense')),
  parent_id   uuid not null,
  path        text not null,
  name        text,
  created_at  timestamptz not null default now()
);
create index if not exists attachments_parent_idx on attachments (parent_kind, parent_id);

alter table attachments enable row level security;
drop policy if exists "auth read attachments"  on attachments;
drop policy if exists "auth write attachments" on attachments;
create policy "auth read attachments"  on attachments for select to authenticated using (true);
create policy "auth write attachments" on attachments for all    to authenticated using (true) with check (true);
