create or replace function private_api.tonart_admin_quotes_directory(
  p_quote_id uuid default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path=''
as $fn$
declare
  v_total integer;
  v_rows jsonb;
begin
  if (select auth.uid()) is null
     or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if (p_status is not null and p_status not in ('pending','reviewing','answered','archived'))
     or p_limit is null or p_limit not between 1 and 100
     or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid quote directory query' using errcode='22023';
  end if;

  select count(*)::integer into v_total
  from public.quotes q
  where q.catalog_requested_at is not null
    and (p_quote_id is null or q.id = p_quote_id)
    and (p_status is null or q.status = p_status);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'userId', x.user_id, 'customerName', x.full_name,
      'customerEmail', x.email, 'status', x.status, 'createdAt', x.created_at,
      'notes', x.notes,
      'quotedAmount', case when x.status in ('answered','archived') and x.total_amount > 0 then x.total_amount else null end,
      'responseMessage', x.admin_response, 'items', x.requested_catalog_models,
      'whatsapp', x.customer_whatsapp, 'postalCode', x.postal_code,
      'scale', x.desired_scale, 'finishing', x.finishing
    ) order by x.created_at desc, x.id desc), '[]'::jsonb)
  into v_rows
  from (
    select q.id, q.user_id, p.full_name, p.email, q.status, q.created_at,
           q.notes, q.total_amount, q.admin_response, q.requested_catalog_models,
           q.customer_whatsapp, q.postal_code, q.desired_scale, q.finishing
    from public.quotes q
    join public.profiles p on p.id = q.user_id
    where q.catalog_requested_at is not null
      and (p_quote_id is null or q.id = p_quote_id)
      and (p_status is null or q.status = p_status)
    order by q.created_at desc, q.id desc
    limit p_limit offset p_offset
  ) x;

  return jsonb_build_object('total',v_total,'limit',p_limit,'offset',p_offset,'rows',v_rows);
end;
$fn$;
revoke all on function private_api.tonart_admin_quotes_directory(uuid,text,integer,integer) from public, anon;
grant execute on function private_api.tonart_admin_quotes_directory(uuid,text,integer,integer) to authenticated, service_role;
create or replace function public.tonart_admin_quotes_directory(
  p_quote_id uuid default null, p_status text default null,
  p_limit integer default 25, p_offset integer default 0
)
returns jsonb language sql stable security invoker set search_path=''
as $fn$
  select private_api.tonart_admin_quotes_directory(p_quote_id,p_status,p_limit,p_offset);
$fn$;
revoke all on function public.tonart_admin_quotes_directory(uuid,text,integer,integer) from public, anon;
grant execute on function public.tonart_admin_quotes_directory(uuid,text,integer,integer) to authenticated, service_role;
comment on function public.tonart_admin_quotes_directory(uuid,text,integer,integer) is
  'Paginated admin-only directory over the canonical TONART catalog quote authority.';
notify pgrst, 'reload schema';
