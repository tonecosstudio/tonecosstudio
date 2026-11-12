-- TONART backoffice read model: one bounded, read-only view of canonical production data.
-- No secondary users, wallets, quotes, or permissions. Restricted to the existing admin membership.
create or replace function public.tonart_admin_workspace_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'profileCount', (select count(*)::int from public.profiles),
    'quoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null),
    'pendingQuoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null and status = 'pending'),
    'reviewingQuoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null and status = 'reviewing'),
    'coinEntryCount', (select count(*)::int from public.tonecos_coin_entries),
    'recentProfiles', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'fullName', p.full_name,
        'createdAt', p.created_at
      ) order by p.created_at desc), '[]'::jsonb)
      from (
        select id, email, full_name, created_at
        from public.profiles
        order by created_at desc, id desc
        limit 25
      ) p
    )
  );
end;
$function$;

revoke all on function public.tonart_admin_workspace_overview() from public, anon;
grant execute on function public.tonart_admin_workspace_overview() to authenticated;
