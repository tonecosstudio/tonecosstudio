-- Tonecos Coins phase 2: one append-only ledger is the balance authority.
-- No checkout, conversion to BRL, self-credit, subscriptions or automatic bonuses.
create table public.tonecos_coin_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('admin_credit', 'purchase_spend', 'refund')),
  delta integer not null check (delta between -100000 and 100000 and delta <> 0),
  reference_key uuid not null,
  reason text not null check (char_length(reason) between 4 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tonecos_coin_direction check (
    (entry_type = 'purchase_spend' and delta < 0)
    or (entry_type in ('admin_credit','refund') and delta > 0)
  ),
  unique (user_id, reference_key)
);
create index tonecos_coin_entries_recent_idx
on public.tonecos_coin_entries(user_id,created_at desc,id desc);

alter table public.tonecos_coin_entries enable row level security;
revoke all on public.tonecos_coin_entries from public, anon, authenticated;
grant select on public.tonecos_coin_entries to authenticated, service_role;
create policy tonecos_coin_entries_read_own
  on public.tonecos_coin_entries for select to authenticated
  using (user_id = (select auth.uid()));

-- No cached mutable balance; the ledger is the only canonical amount.
create or replace function public.get_my_tonecos_coin_balance()
returns jsonb
language sql stable security invoker set search_path = ''
as $fn$
  select jsonb_build_object(
    'balance', coalesce(sum(delta),0)::bigint,
    'total_earned', coalesce(sum(delta) filter (where delta > 0),0)::bigint,
    'total_spent', coalesce(-sum(delta) filter (where delta < 0),0)::bigint,
    'entry_count', count(*)::bigint,
    'updated_at', max(created_at)
  )
  from public.tonecos_coin_entries
  where user_id = (select auth.uid());
$fn$;
revoke all on function public.get_my_tonecos_coin_balance() from public,anon;
grant execute on function public.get_my_tonecos_coin_balance() to authenticated,service_role;

-- Privileged crediting is bounded, audited, and idempotent by caller supplied reference_key.
-- No direct insert DML permission exists for clients.
create or replace function private_api.credit_tonecos_coins(
  p_user_id uuid,
  p_amount integer,
  p_reference_key uuid,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_reason text := btrim(coalesce(p_reason,''));
  v_existing public.tonecos_coin_entries%rowtype;
  v_current bigint;
  v_credit_id uuid;
begin
  if v_actor is null or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_user_id is null or p_reference_key is null
    or p_amount is null or p_amount < 1 or p_amount > 10000
    or char_length(v_reason) < 4 or char_length(v_reason) > 500 then
    raise exception 'Invalid coin credit request' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id = p_user_id) then
    raise exception 'Coin recipient not found' using errcode='P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 773042));
  select * into v_existing from public.tonecos_coin_entries
  where user_id = p_user_id and reference_key = p_reference_key;
  if found then
    if v_existing.entry_type <> 'admin_credit'
       or v_existing.delta <> p_amount
       or v_existing.reason <> v_reason then
      raise exception 'Coin credit reference conflicts with different request'
        using errcode='23505';
    end if;
    select coalesce(sum(delta),0)::bigint into v_current
    from public.tonecos_coin_entries where user_id = p_user_id;
    return jsonb_build_object(
      'user_id',p_user_id,'credited',p_amount,'balance',v_current,
      'transaction_id',v_existing.id,'idempotent',true
    );
  end if;
  select coalesce(sum(delta),0)::bigint into v_current
    from public.tonecos_coin_entries where user_id = p_user_id;
  if v_current + p_amount > 1000000 then
    raise exception 'Coin balance cap exceeded' using errcode='22003';
  end if;
  insert into public.tonecos_coin_entries(
    user_id,entry_type,delta,reference_key,reason,created_by
  ) values (p_user_id,'admin_credit',p_amount,p_reference_key,v_reason,v_actor)
  returning id into v_credit_id;
  return jsonb_build_object(
    'user_id',p_user_id,'credited',p_amount,'balance',v_current + p_amount,
    'transaction_id',v_credit_id,'idempotent',false
  );
end;
$fn$;
revoke all on function private_api.credit_tonecos_coins(uuid,integer,uuid,text)
  from public,anon;
grant execute on function private_api.credit_tonecos_coins(uuid,integer,uuid,text)
  to authenticated,service_role;

create or replace function public.admin_credit_tonecos_coins(
  p_user_id uuid,
  p_amount integer,
  p_reference_key uuid,
  p_reason text
) returns jsonb
language sql security invoker set search_path=''
as $fn$
  select private_api.credit_tonecos_coins(
    p_user_id,p_amount,p_reference_key,p_reason
  );
$fn$;
revoke all on function public.admin_credit_tonecos_coins(uuid,integer,uuid,text)
  from public,anon;
grant execute on function public.admin_credit_tonecos_coins(uuid,integer,uuid,text)
  to authenticated,service_role;

comment on table public.tonecos_coin_entries is
  'Tonecos virtual coins canonical immutable ledger; not cash or purchases.';
comment on function public.get_my_tonecos_coin_balance() is
  'Authenticated owner-only derived coin balance. No balance row or synthetic credit.';
notify pgrst,'reload schema';