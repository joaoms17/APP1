-- Eventos do Google entram sozinhos na agenda: gcal_key liga o evento da app ao evento do Google
-- (calendário|dia|hora|uid). O índice único impede que o mesmo evento entre duas vezes.
-- Correr uma vez no SQL Editor do Supabase.
alter table events add column if not exists gcal_key text;
create unique index if not exists events_gcal_key_idx on events (gcal_key);
