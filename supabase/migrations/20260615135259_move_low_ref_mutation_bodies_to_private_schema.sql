create schema if not exists private_api;

revoke all on schema private_api from public, anon;
grant usage on schema private_api to authenticated, service_role;

create or replace function private_api.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_payment_method text := lower(nullif(btrim(coalesce(p_payment_method, '')), ''));
  v_external_reference text := left(nullif(btrim(coalesce(p_external_reference, '')), ''), 255);
  v_subscription record;
  v_payment public.subscription_payments%rowtype;
  v_coins integer;
  v_balance jsonb;
  v_new_balance integer := 0;
  v_next_billing_date timestamptz;
begin
  perform public.assert_admin_access();

  if p_subscription_id is null then
    raise exception 'SUBSCRIPTION_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = '22023';
  end if;

  if v_payment_method not in ('pix', 'credit_card', 'boleto', 'manual') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;

  if v_external_reference is not null and v_external_reference ~ '[<>]' then
    raise exception 'INVALID_EXTERNAL_REFERENCE' using errcode = '22023';
  end if;

  select
    s.*,
    sp.total_credits as plan_total_credits
    into v_subscription
    from public.subscriptions s
    left join public.subscription_plans sp on sp.id = s.plan_id
   where s.id = p_subscription_id
   for update of s;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_subscription.status::text in ('cancelled', 'expired') then
    raise exception 'INVALID_SUBSCRIPTION_STATUS:%', v_subscription.status using errcode = '22023';
  end if;

  v_coins := coalesce(
    nullif(v_subscription.coins_per_month, 0),
    nullif(v_subscription.plan_total_credits, 0),
    case v_subscription.plan_type
      when 'anual' then 2800
      when 'semestral' then 1300
      when 'trimestral' then 600
      else 0
    end
  );

  if v_coins <= 0 then
    raise exception 'SUBSCRIPTION_CREDITS_NOT_CONFIGURED' using errcode = '22023';
  end if;

  v_next_billing_date := case v_subscription.plan_type
    when 'bimestral' then now() + interval '2 months'
    when 'trimestral' then now() + interval '3 months'
    when 'semestral' then now() + interval '6 months'
    when 'anual' then now() + interval '1 year'
    else now() + interval '1 month'
  end;

  insert into public.subscription_payments (
    subscription_id,
    user_id,
    amount,
    status,
    payment_method,
    external_reference,
    coins_credited,
    paid_at
  )
  values (
    p_subscription_id,
    v_subscription.user_id,
    p_amount,
    'approved',
    v_payment_method,
    v_external_reference,
    v_coins,
    now()
  )
  returning * into v_payment;

  update public.subscriptions
     set status = 'active',
         payment_status = 'paid',
         started_at = coalesce(started_at, now()),
         next_billing_date = v_next_billing_date,
         coins_per_month = v_coins,
         total_coins_received = coalesce(total_coins_received, 0) + v_coins,
         updated_at = now()
   where id = p_subscription_id;

  v_balance := public.admin_add_coins_to_user(
    v_subscription.user_id,
    v_coins,
    concat('Credito de assinatura - ', coalesce(v_subscription.plan_type, 'plano')),
    v_payment.id::text,
    'subscription_payment'
  );

  v_new_balance := coalesce((v_balance->>'new_balance')::integer, 0);

  return jsonb_build_object(
    'success', true,
    'payment', to_jsonb(v_payment),
    'coins_credited', v_coins,
    'new_balance', v_new_balance,
    'message', concat('Pagamento aprovado. Coins creditados: ', v_coins)
  );
end;
$function$;

create or replace function private_api.close_monthly_sales(reason text default 'manual'::text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current_month integer;
  v_current_year integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and public.current_user_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can close monthly sales';
  end if;

  v_current_month := extract(month from current_date)::integer;
  v_current_year := extract(year from current_date)::integer;

  update public.monthly_production
     set is_closed = true,
         closed_reason = left(coalesce(nullif(btrim(reason), ''), 'manual'), 100),
         closed_at = now(),
         updated_at = now()
   where month = v_current_month
     and year = v_current_year;

  return true;
end;
$function$;

create or replace function private_api.reopen_monthly_sales()
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current_month integer;
  v_current_year integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and public.current_user_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can reopen monthly sales';
  end if;

  v_current_month := extract(month from current_date)::integer;
  v_current_year := extract(year from current_date)::integer;

  update public.monthly_production
     set is_closed = false,
         closed_reason = null,
         closed_at = null,
         updated_at = now()
   where month = v_current_month
     and year = v_current_year;

  return true;
end;
$function$;

create or replace function private_api.initialize_current_user_coin_balance(
  p_initial_amount integer default 0,
  p_description text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := public.coin_require_user();
  v_amount integer := coalesce(p_initial_amount, 0);
  v_description text := public.coin_validate_text(p_description, 'description', 500, false);
  v_balance integer;
  v_transaction_id uuid;
  v_is_admin boolean := coalesce(public.has_role(auth.uid(), 'admin'), false);
begin
  if v_amount < 0 then
    raise exception 'Initial amount must be non-negative' using errcode = '22023';
  end if;

  if v_amount > 0 and not v_is_admin then
    raise exception 'Only admins can initialize a positive coin balance' using errcode = '42501';
  end if;

  if exists (select 1 from public.user_coins where user_id = v_user_id) then
    raise exception 'User already has a coin balance' using errcode = '23505';
  end if;

  insert into public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  values (
    v_user_id,
    v_amount,
    v_amount,
    0
  )
  returning balance into v_balance;

  if v_amount > 0 then
    insert into public.coin_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      reference_type,
      balance_after,
      metadata
    )
    values (
      v_user_id,
      v_amount,
      'bonus',
      coalesce(v_description, 'Initial coin balance'),
      'initial_balance',
      v_balance,
      '{}'::jsonb
    )
    returning id into v_transaction_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'balance', v_balance,
    'transaction_id', v_transaction_id
  );
end;
$function$;

create or replace function private_api.refund_coin_purchase_for_current_user(
  p_item_id text,
  p_item_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := public.coin_require_user();
  v_item_id text := public.coin_validate_text(p_item_id, 'item_id', 80, true);
  v_item_type text := lower(public.coin_validate_text(p_item_type, 'item_type', 20, true));
  v_reason text := public.coin_validate_text(p_reason, 'reason', 500, true);
  v_refund_amount integer;
  v_balance integer;
  v_transaction_id uuid;
  v_reference_uuid uuid;
begin
  if v_item_type not in ('character', 'collection') then
    raise exception 'Invalid item_type' using errcode = '22023';
  end if;

  if v_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_reference_uuid := v_item_id::uuid;
  else
    raise exception 'Invalid item_id' using errcode = '22023';
  end if;

  if v_item_type = 'character' then
    select price_paid
      into v_refund_amount
      from public.user_characters
     where user_id = v_user_id
       and character_id::text = v_item_id
     for update;

    if not found then
      raise exception 'Purchase not found' using errcode = 'P0002';
    end if;

    delete from public.user_characters
     where user_id = v_user_id
       and character_id::text = v_item_id;
  else
    select price_paid
      into v_refund_amount
      from public.user_collections
     where user_id = v_user_id
       and collection_id::text = v_item_id
     for update;

    if not found then
      raise exception 'Purchase not found' using errcode = 'P0002';
    end if;

    delete from public.user_collections
     where user_id = v_user_id
       and collection_id::text = v_item_id;
  end if;

  if coalesce(v_refund_amount, 0) <= 0 then
    raise exception 'Invalid refund amount' using errcode = '22023';
  end if;

  insert into public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  values (
    v_user_id,
    v_refund_amount,
    v_refund_amount,
    0
  )
  on conflict (user_id) do update
    set balance = public.user_coins.balance + excluded.balance,
        total_earned = public.user_coins.total_earned + excluded.total_earned,
        updated_at = now()
  returning balance into v_balance;

  insert into public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type,
    balance_after,
    metadata
  )
  values (
    v_user_id,
    v_refund_amount,
    'refund',
    concat('Refund: ', v_reason),
    v_reference_uuid,
    v_item_type,
    v_balance,
    jsonb_build_object('item_type', v_item_type)
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true,
    'message', concat('Refund of ', v_refund_amount, ' coins completed'),
    'new_balance', v_balance,
    'item_id', v_item_id,
    'transaction_id', v_transaction_id::text
  );
end;
$function$;

revoke all on function private_api.admin_process_subscription_payment(uuid, numeric, text, text) from public, anon;
revoke all on function private_api.close_monthly_sales(text) from public, anon;
revoke all on function private_api.reopen_monthly_sales() from public, anon;
revoke all on function private_api.initialize_current_user_coin_balance(integer, text) from public, anon;
revoke all on function private_api.refund_coin_purchase_for_current_user(text, text, text) from public, anon;

grant execute on function private_api.admin_process_subscription_payment(uuid, numeric, text, text) to authenticated, service_role;
grant execute on function private_api.close_monthly_sales(text) to authenticated, service_role;
grant execute on function private_api.reopen_monthly_sales() to authenticated, service_role;
grant execute on function private_api.initialize_current_user_coin_balance(integer, text) to authenticated, service_role;
grant execute on function private_api.refund_coin_purchase_for_current_user(text, text, text) to authenticated, service_role;

create or replace function public.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text default null::text
)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.admin_process_subscription_payment(
    p_subscription_id,
    p_amount,
    p_payment_method,
    p_external_reference
  );
$function$;

create or replace function public.close_monthly_sales(reason text default 'manual'::text)
returns boolean
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.close_monthly_sales(reason);
$function$;

create or replace function public.reopen_monthly_sales()
returns boolean
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.reopen_monthly_sales();
$function$;

create or replace function public.initialize_current_user_coin_balance(
  p_initial_amount integer default 0,
  p_description text default null::text
)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.initialize_current_user_coin_balance(p_initial_amount, p_description);
$function$;

create or replace function public.refund_coin_purchase_for_current_user(
  p_item_id text,
  p_item_type text,
  p_reason text
)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.refund_coin_purchase_for_current_user(p_item_id, p_item_type, p_reason);
$function$;

revoke all on function public.admin_process_subscription_payment(uuid, numeric, text, text) from public, anon;
revoke all on function public.close_monthly_sales(text) from public, anon;
revoke all on function public.reopen_monthly_sales() from public, anon;
revoke all on function public.initialize_current_user_coin_balance(integer, text) from public, anon;
revoke all on function public.refund_coin_purchase_for_current_user(text, text, text) from public, anon;

grant execute on function public.admin_process_subscription_payment(uuid, numeric, text, text) to authenticated, service_role;
grant execute on function public.close_monthly_sales(text) to authenticated, service_role;
grant execute on function public.reopen_monthly_sales() to authenticated, service_role;
grant execute on function public.initialize_current_user_coin_balance(integer, text) to authenticated, service_role;
grant execute on function public.refund_coin_purchase_for_current_user(text, text, text) to authenticated, service_role;
