do $$
declare
  fk record;
  index_name text;
  column_list text;
begin
  for fk in
    select
      con.conrelid,
      con.conname,
      con.conrelid::regclass as table_name,
      string_agg(quote_ident(att.attname), ', ' order by cols.ordinality) as columns
    from pg_constraint con
    join unnest(con.conkey) with ordinality as cols(attnum, ordinality) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = cols.attnum
    where con.contype = 'f'
      and con.connamespace = 'public'::regnamespace
      and not exists (
        select 1
        from pg_index idx
        where idx.indrelid = con.conrelid
          and idx.indkey::smallint[] @> con.conkey
      )
    group by con.conrelid, con.conname
  loop
    index_name := left('idx_' || replace(fk.table_name::text, '.', '_') || '_' || fk.conname, 63);
    column_list := fk.columns;
    execute format('create index if not exists %I on %s (%s)', index_name, fk.table_name, column_list);
  end loop;
end $$;

create index if not exists idx_warehouse_priorities_warehouse_id on public.warehouse_priorities(warehouse_id);
