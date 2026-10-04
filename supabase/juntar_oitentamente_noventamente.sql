-- Juntar o projeto "Oitentamente" ao "Noventamente".
-- Tudo o que pertencia ao Oitentamente (eventos, despesas, orçamentos,
-- calendários Google, ...) passa para o Noventamente e o Oitentamente é apagado.
-- Correr UMA vez no SQL Editor do Supabase (é seguro correr de novo: não faz nada).
begin;

do $$
declare
  from_id uuid := (select id from projects where name = 'Oitentamente');
  to_id   uuid := (select id from projects where name = 'Noventamente');
  fk      record;
begin
  if from_id is null then
    raise notice 'Oitentamente já não existe — nada a fazer.';
    return;
  end if;
  if to_id is null then
    -- não há Noventamente: basta mudar o nome
    update projects set name = 'Noventamente' where id = from_id;
    return;
  end if;

  -- mover todas as linhas de qualquer tabela que aponte para projects(id)
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'projects'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col)
      using to_id, from_id;
  end loop;

  -- o Noventamente fica ativo durante todo o período dos dois
  update projects n set active = n.active or o.active
  from projects o where n.id = to_id and o.id = from_id;
  if exists (select 1 from information_schema.columns
             where table_name = 'projects' and column_name = 'active_from') then
    execute $q$
      update projects n set
        active_from = case when n.active_from is null or o.active_from is null then null
                           else least(n.active_from, o.active_from) end,
        active_to   = case when n.active_to is null or o.active_to is null then null
                           else greatest(n.active_to, o.active_to) end
      from projects o where n.id = $1 and o.id = $2
    $q$ using to_id, from_id;
  end if;

  delete from projects where id = from_id;
end $$;

commit;
