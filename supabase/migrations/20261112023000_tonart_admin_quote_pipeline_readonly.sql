-- Extend the canonical, admin-only overview with quote pipeline and quote-value reporting.
-- Monetary values are quotations, never revenue or confirmed sales.
-- No payment operations, tables, users or permissions are created.
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
    'answeredQuoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null and status = 'answered'),
    'archivedQuoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null and status = 'archived'),
    'pricedQuoteCount', (select count(*)::int from public.quotes where catalog_requested_at is not null and total_amount > 0 and status in ('answered','archived')),
    'quotedTotalCents', (select coalesce(sum(round(total_amount * 100)),0)::bigint from public.quotes where catalog_requested_at is not null and total_amount > 0 and status in ('answered','archived')),
    'recentQuotes', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', q.id, 'status', q.status, 'customerEmail', q.email,
        'createdAt', q.created_at, 'quotedAmountCents', q.quoted_amount_cents,
        'modelCount', q.model_count
      ) order by q.created_at desc, q.id desc), '[]'::jsonb)
      from (
        select cq.id, cq.status, p.email, cq.created_at,
          case when cq.status in ('answered','archived') and cq.total_amount > 0
            then round(cq.total_amount * 100)::bigint else null end as quoted_amount_cents,
          jsonb_array_length(cq.requested_catalog_models) as model_count
        from public.quotes cq
        left join public.profiles p on p.id = cq.user_id
        where cq.catalog_requested_at is not null
        order by cq.created_at desc, cq.id desc
        limit 25
      ) q
    ),
    'coinEntryCount', (select count(*)::int from public.tonecos_coin_entries),
    'recentProfiles', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', p.id, 'email', p.email,
        'fullName', p.full_name, 'createdAt', p.created_at
      ) order by p.created_at desc, p.id desc), '[]'::jsonb)
      from (
        select id, email, full_name, created_at
        from public.profiles
        order by created_at desc, id desc
        limit 25
      ) p
    ),
    'recentCoinEntries', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', e.id, 'userId', e.user_id, 'userEmail', e.email,
        'type', e.entry_type, 'delta', e.delta, 'reason', e.reason,
        'createdAt', e.created_at
      ) order by e.created_at desc, e.id desc), '[]'::jsonb)
      from (
        select ce.id, ce.user_id, p.email, ce.entry_type,
               ce.delta, ce.reason, ce.created_at
        from public.tonecos_coin_entries ce
        left join public.profiles p on p.id = ce.user_id
        order by ce.created_at desc, ce.id desc
        limit 25
      ) e
    )
  );
end;
$function$;

revoke all on function public.tonart_admin_workspace_overview() from public, anon;
grant execute on function public.tonart_admin_workspace_overview() to authenticated;
