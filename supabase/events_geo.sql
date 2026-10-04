-- Coordenadas do local dos eventos (mapa do mês). Correr uma vez no SQL Editor do Supabase.
alter table events add column if not exists lat double precision;
alter table events add column if not exists lng double precision;
