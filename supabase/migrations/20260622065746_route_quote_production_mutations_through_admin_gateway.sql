do $$
declare
  v_target regprocedure;
begin
  for v_target in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'ensure_quote_production',
        'set_quote_production_stage',
        'add_quote_production_photo'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_target
    );
    execute format(
      'grant execute on function %s to service_role',
      v_target
    );
  end loop;
end;
$$;
