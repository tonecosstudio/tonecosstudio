-- TONART commercial MVP: immutable quote activity + public RPC hardening.
-- Quote data remains the single commercial authority; this table records only its lifecycle.
create table public.quote_events (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('submitted','status_changed','answered')),
  from_status text
    check (from_status is null or from_status in ('pending','reviewing','answered','archived')),
  to_status text not null
    check (to_status in ('pending','reviewing','answered','archived')),
  amount numeric(10,2),
  created_at timestamptz not null default clock_timestamp(),
  constraint tonecos_quote_events_amount check (
    (event_type = 'answered' and amount is not null and amount > 0)
    or (event_type <> 'answered' and amount is null)
  ),
  constraint tonecos_quote_events_submitted_transition check (
    event_type <> 'submitted'
    or (from_status is null and to_status = 'pending')
  )
);

create index tonecos_quote_events_quote_recent_idx
  on public.quote_events (quote_id, created_at desc, id desc);

alter table public.quote_events enable row level security;
revoke all on public.quote_events from public, anon, authenticated;
grant select on public.quote_events to authenticated;

create policy tonecos_quote_events_read_own_or_admin
  on public.quote_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_events.quote_id
        and (
          q.user_id = (select auth.uid())
          or (select private_api.is_current_admin())
        )
    )
  );

create or replace function private_api.submit_catalog_quote_request(
  p_models jsonb,
  p_notes text default null,
  p_whatsapp text default null,
  p_postal_code text default null,
  p_scale text default 'a definir',
  p_finishing text default 'a definir'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_whatsapp text := nullif(regexp_replace(coalesce(p_whatsapp,''), '[ ()+.-]', '', 'g'),'');
  v_postal text := nullif(regexp_replace(coalesce(p_postal_code,''), '[^0-9]', '', 'g'),'');
  v_entry jsonb;
  v_slug text;
  v_quantity text;
  v_models jsonb := '[]'::jsonb;
  v_seen text[] := array[]::text[];
  v_quote_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id=v_user_id) then
    raise exception 'Customer account not initialized' using errcode = '23503';
  end if;
  if p_models is null or jsonb_typeof(p_models) <> 'array'
     or jsonb_array_length(p_models) not between 1 and 50 then
    raise exception 'Select between 1 and 50 models' using errcode='22023';
  end if;
  if length(coalesce(v_notes,'')) > 2000 then
    raise exception 'Quote notes exceed 2000 characters' using errcode='22023';
  end if;
  if length(coalesce(p_whatsapp,'')) > 40
     or (v_whatsapp is not null and v_whatsapp !~ '^[0-9]{10,13}$')
     or (v_postal is not null and v_postal !~ '^[0-9]{8}$')
     or p_scale not in ('a definir', '1/10', '1/6', 'outro')
     or p_finishing not in ('a definir', 'pintado', 'sem pintura')
     or p_scale is null or p_finishing is null then
    raise exception 'Quote contact or preferences invalid' using errcode='22023';
  end if;
  for v_entry in select value from jsonb_array_elements(p_models) loop
    if jsonb_typeof(v_entry) <> 'object'
       or (v_entry - 'slug' - 'quantity') <> '{}'::jsonb
       or jsonb_typeof(v_entry->'slug') <> 'string'
       or jsonb_typeof(v_entry->'quantity') <> 'number' then
      raise exception 'Invalid quote item' using errcode='22023';
    end if;
    v_slug := v_entry->>'slug';
    v_quantity := v_entry->>'quantity';
    if v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
       or v_quantity !~ '^(?:[1-9]|10)$'
       or v_slug = any(v_seen) then
      raise exception 'Invalid or duplicate model' using errcode='22023';
    end if;
    v_seen := array_append(v_seen, v_slug);
    v_models := v_models || jsonb_build_array(
      jsonb_build_object('slug',v_slug,'quantity',v_quantity::integer)
    );
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 77231));
  if exists (
    select 1 from public.quotes
    where user_id = v_user_id
      and created_at > clock_timestamp() - interval '60 seconds'
  ) then
    raise exception 'Wait before submitting another quote'
      using errcode='P0001';
  end if;
  insert into public.quotes (
    user_id, notes, requested_catalog_models,
    customer_whatsapp, postal_code, desired_scale, finishing
  )
  values (
    v_user_id, v_notes, v_models,
    v_whatsapp, v_postal, p_scale, p_finishing
  )
  returning id into v_quote_id;

  insert into public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status
  )
  values (v_quote_id, v_user_id, 'submitted', null, 'pending');

  return v_quote_id;
end;
$fn$;

create or replace function private_api.answer_catalog_quote_request(
  p_quote_id uuid, p_amount numeric
)
returns uuid
language plpgsql security definer
set search_path=''
as $fn$
declare
  v_previous text;
  v_updated uuid;
begin
  if (select auth.uid()) is null
     or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_quote_id is null or p_amount is null
     or p_amount <= 0 or p_amount > 99999999.99
     or p_amount <> round(p_amount,2) then
    raise exception 'Invalid quote amount' using errcode='22023';
  end if;
  select status into v_previous
  from public.quotes
  where id=p_quote_id
  for update;
  if v_previous is null or v_previous not in ('pending','reviewing') then
    raise exception 'Quote unavailable for pricing' using errcode='P0002';
  end if;
  update public.quotes
  set total_amount=p_amount, status='answered', updated_at=clock_timestamp()
  where id=p_quote_id
  returning id into v_updated;
  insert into public.quote_events (
    quote_id, actor_user_id, event_type,
    from_status, to_status, amount
  )
  values (
    p_quote_id, (select auth.uid()), 'answered',
    v_previous, 'answered', p_amount
  );
  return v_updated;
end;
$fn$;

create or replace function private_api.admin_update_quote_status(
  p_quote_id uuid, p_status text
)
returns uuid
language plpgsql security definer
set search_path=''
as $fn$
declare
  v_previous text;
  v_updated uuid;
begin
  if (select auth.uid()) is null
     or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_quote_id is null or p_status is null
     or p_status not in ('pending', 'reviewing', 'archived') then
    raise exception 'Invalid quote status' using errcode='22023';
  end if;
  select status into v_previous
  from public.quotes
  where id=p_quote_id
  for update;
  if v_previous is null or not (
    (v_previous='pending' and p_status in ('reviewing', 'archived'))
    or (v_previous='reviewing' and p_status in ('pending', 'archived'))
    or (v_previous='answered' and p_status='archived')
  ) then
    raise exception 'Quote unavailable for status change' using errcode='P0002';
  end if;
  update public.quotes
  set status=p_status, updated_at=clock_timestamp()
  where id=p_quote_id
  returning id into v_updated;
  insert into public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status
  )
  values (
    p_quote_id, (select auth.uid()), 'status_changed', v_previous, p_status
  );
  return v_updated;
end;
$fn$;

create or replace function private_api.tonart_admin_workspace_overview()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
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
$fn$;

revoke all on function private_api.tonart_admin_workspace_overview()
  from public, anon;
grant execute on function private_api.tonart_admin_workspace_overview()
  to authenticated, service_role;

create or replace function public.tonart_admin_workspace_overview()
returns jsonb
language sql stable security invoker
set search_path = ''
as $fn$
  select private_api.tonart_admin_workspace_overview();
$fn$;
revoke all on function public.tonart_admin_workspace_overview()
  from public, anon;
grant execute on function public.tonart_admin_workspace_overview()
  to authenticated, service_role;

comment on table public.quote_events is
  'Immutable customer/admin-visible history for the canonical TONART quote workflow.';
notify pgrst, 'reload schema';
