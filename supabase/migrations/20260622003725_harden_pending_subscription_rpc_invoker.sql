alter table public.subscriptions validate constraint subscriptions_payment_voucher_url_safe;
alter table public.subscriptions validate constraint subscriptions_payment_rejection_reason_safe;

drop policy if exists subscriptions_insert_own on public.subscriptions;

create policy subscriptions_insert_own_pending_checkout
on public.subscriptions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending_payment'::public.subscription_status
  and payment_status = 'pending'::public.payment_status
  and payment_method in ('pix', 'credit_card', 'boleto')
  and coalesce(total_paid, 0) >= 0
  and coalesce(deliveries_total, 0) >= 0
  and coalesce(deliveries_completed, 0) = 0
  and pause_count = 0
  and payment_id is null
  and payment_rejection_reason is null
  and cancelled_at is null
  and completed_at is null
  and exists (
    select 1
    from public.subscription_plans plan
    where plan.id = plan_id
      and plan.is_active = true
  )
  and (
    collection_id is null
    or exists (
      select 1
      from public.collections collection
      where collection.id = collection_id
        and collection.is_active = true
        and collection.status = 'active'::public.collection_status
    )
  )
);

create or replace function public.create_pending_subscription_for_current_user(
  p_plan_type text,
  p_payment_method text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_type text := lower(nullif(btrim(coalesce(p_plan_type, '')), ''));
  v_payment_method text := lower(nullif(btrim(coalesce(p_payment_method, '')), ''));
  v_plan record;
  v_subscription public.subscriptions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if v_plan_type not in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual') then
    raise exception 'INVALID_SUBSCRIPTION_PLAN_TYPE' using errcode = '22023';
  end if;

  if v_payment_method not in ('pix', 'credit_card', 'boleto') then
    raise exception 'INVALID_SUBSCRIPTION_PAYMENT_METHOD' using errcode = '22023';
  end if;

  select id, plan_type, billing_interval, price_full, price, deliveries_total
    into v_plan
    from public.subscription_plans
   where is_active = true
     and (
       plan_type = v_plan_type
       or billing_interval = v_plan_type
       or slug = v_plan_type
     )
   order by display_order asc, created_at asc, id asc
   limit 1;

  if not found then
    raise exception 'SUBSCRIPTION_PLAN_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1
      from public.subscriptions
     where user_id = v_user_id
       and status::text in ('active', 'pending_payment')
  ) then
    raise exception 'SUBSCRIPTION_ALREADY_EXISTS' using errcode = '22023';
  end if;

  insert into public.subscriptions (
    user_id,
    plan_id,
    plan_type,
    status,
    payment_status,
    payment_method,
    total_paid,
    deliveries_total
  )
  values (
    v_user_id,
    v_plan.id,
    coalesce(v_plan.plan_type, v_plan.billing_interval, v_plan_type),
    'pending_payment',
    'pending',
    v_payment_method,
    coalesce(v_plan.price_full, v_plan.price, 0)::numeric,
    coalesce(v_plan.deliveries_total, 0)
  )
  returning * into v_subscription;

  return to_jsonb(v_subscription);
end;
$$;
