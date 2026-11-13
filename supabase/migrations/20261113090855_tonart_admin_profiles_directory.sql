create or replace function private_api.tonart_admin_profiles_directory(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_total integer;
  v_rows jsonb;
begin
  if (select auth.uid()) is null
     or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if length(coalesce(v_search, '')) > 160
     or p_limit is null or p_limit not between 1 and 100
     or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid profile directory query' using errcode='22023';
  end if;

  select count(*)::integer
  into v_total
  from public.profiles p
  where v_search is null
     or position(v_search in lower(p.email)) > 0
     or position(v_search in lower(coalesce(p.full_name, ''))) > 0;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'email', x.email,
        'fullName', x.full_name,
        'createdAt', x.created_at
      )
      order by x.created_at desc, x.id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select p.id, p.email, p.full_name, p.created_at
    from public.profiles p
    where v_search is null
       or position(v_search in lower(p.email)) > 0
       or position(v_search in lower(coalesce(p.full_name, ''))) > 0
    order by p.created_at desc, p.id desc
    limit p_limit
    offset p_offset
  ) x;

  return jsonb_build_object(
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'rows', v_rows
  );
end;
$fn$;

revoke all on function private_api.tonart_admin_profiles_directory(text,integer,integer)
  from public, anon;
grant execute on function private_api.tonart_admin_profiles_directory(text,integer,integer)
  to authenticated, service_role;

create or replace function public.tonart_admin_profiles_directory(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $fn$
  select private_api.tonart_admin_profiles_directory(p_search,p_limit,p_offset);
$fn$;

revoke all on function public.tonart_admin_profiles_directory(text,integer,integer)
  from public, anon;
grant execute on function public.tonart_admin_profiles_directory(text,integer,integer)
  to authenticated, service_role;

comment on function public.tonart_admin_profiles_directory(text,integer,integer) is
  'Bounded read-only TONART administrator directory over customer profiles.';
notify pgrst, 'reload schema';
