-- Remove the last authenticated-callable SECURITY DEFINER functions from the
-- exposed public schema while keeping the public RPC contract stable.
-- The privileged bodies move to private_api; public wrappers stay as
-- SECURITY INVOKER entry points.

create schema if not exists private_api;

revoke all on schema private_api from public, anon;
grant usage on schema private_api to authenticated, service_role;

do $$
declare
  v_signature text;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.activate_subscription_credit_for_current_user(text,text)',
    'public.schedule_subscription_credit_plan_change(text,text)',
    'public.cancel_subscription_credit_with_refund(text)',
    'public.set_subscription_credit_no_renewal(text)',
    'public.reactivate_subscription_credit_renewal(text)',
    'public.create_subscription_credit_individual_order(text)',
    'public.update_subscription_credit_automatic_order(text,text[])',
    'public.change_delivery_character_for_current_user(uuid,uuid)',
    'public.change_delivery_collection_choice_for_current_user(uuid,uuid,uuid,text,text)',
    'public.customer_submit_character_choice(text,uuid)',
    'public.customer_change_character_choice(uuid,uuid,text)',
    'public.create_subscription_checkout_for_current_user(uuid,uuid,text,text)',
    'public.submit_standalone_balance_voucher(uuid,text)',
    'public.current_user_role()',
    'public.has_role(uuid,text)'
  ]
  loop
    select pg_get_functiondef(v_signature::regprocedure::oid)
      into v_definition;

    if v_definition is null then
      raise exception 'Function not found: %', v_signature;
    end if;

    v_definition := regexp_replace(
      v_definition,
      'CREATE OR REPLACE FUNCTION public\.',
      'CREATE OR REPLACE FUNCTION private_api.',
      'i'
    );

    v_definition := regexp_replace(
      v_definition,
      '\mpublic\.current_user_role\s*\(',
      'private_api.current_user_role(',
      'gi'
    );

    v_definition := regexp_replace(
      v_definition,
      '\mpublic\.has_role\s*\(',
      'private_api.has_role(',
      'gi'
    );

    execute v_definition;
  end loop;
end;
$$;

do $$
declare
  v_target regprocedure;
begin
  for v_target in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'private_api'
      and p.proname = any(array[
        'activate_subscription_credit_for_current_user',
        'schedule_subscription_credit_plan_change',
        'cancel_subscription_credit_with_refund',
        'set_subscription_credit_no_renewal',
        'reactivate_subscription_credit_renewal',
        'create_subscription_credit_individual_order',
        'update_subscription_credit_automatic_order',
        'change_delivery_character_for_current_user',
        'change_delivery_collection_choice_for_current_user',
        'customer_submit_character_choice',
        'customer_change_character_choice',
        'create_subscription_checkout_for_current_user',
        'submit_standalone_balance_voucher',
        'current_user_role',
        'has_role'
      ])
  loop
    execute format(
      'revoke all on function %s from public, anon',
      v_target
    );
    execute format(
      'grant execute on function %s to authenticated, service_role',
      v_target
    );
  end loop;
end;
$$;

create or replace function public.activate_subscription_credit_for_current_user(
  p_plan_type text,
  p_payment_method_id text default null
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.activate_subscription_credit_for_current_user(
    p_plan_type,
    p_payment_method_id
  );
$function$;

create or replace function public.schedule_subscription_credit_plan_change(
  p_subscription_id text,
  p_new_plan_type text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.schedule_subscription_credit_plan_change(
    p_subscription_id,
    p_new_plan_type
  );
$function$;

create or replace function public.cancel_subscription_credit_with_refund(
  p_subscription_id text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.cancel_subscription_credit_with_refund(p_subscription_id);
$function$;

create or replace function public.set_subscription_credit_no_renewal(
  p_subscription_id text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.set_subscription_credit_no_renewal(p_subscription_id);
$function$;

create or replace function public.reactivate_subscription_credit_renewal(
  p_subscription_id text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.reactivate_subscription_credit_renewal(p_subscription_id);
$function$;

create or replace function public.create_subscription_credit_individual_order(
  p_character_id text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.create_subscription_credit_individual_order(p_character_id);
$function$;

create or replace function public.update_subscription_credit_automatic_order(
  p_order_id text,
  p_character_ids text[]
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.update_subscription_credit_automatic_order(
    p_order_id,
    p_character_ids
  );
$function$;

create or replace function public.change_delivery_character_for_current_user(
  p_delivery_id uuid,
  p_character_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.change_delivery_character_for_current_user(
    p_delivery_id,
    p_character_id
  );
$function$;

create or replace function public.change_delivery_collection_choice_for_current_user(
  p_delivery_id uuid,
  p_new_collection_id uuid,
  p_user_id uuid,
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.change_delivery_collection_choice_for_current_user(
    p_delivery_id,
    p_new_collection_id,
    p_user_id,
    p_ip_address,
    p_user_agent
  );
$function$;

create or replace function public.customer_submit_character_choice(
  p_order_id text,
  p_character_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.customer_submit_character_choice(
    p_order_id,
    p_character_id
  );
$function$;

create or replace function public.customer_change_character_choice(
  p_choice_id uuid,
  p_character_id uuid,
  p_reason text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.customer_change_character_choice(
    p_choice_id,
    p_character_id,
    p_reason
  );
$function$;

create or replace function public.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_payment_method text,
  p_payment_voucher_url text default null
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.create_subscription_checkout_for_current_user(
    p_plan_id,
    p_collection_id,
    p_payment_method,
    p_payment_voucher_url
  );
$function$;

create or replace function public.submit_standalone_balance_voucher(
  p_purchase_id uuid,
  p_balance_voucher_url text
)
returns jsonb
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.submit_standalone_balance_voucher(
    p_purchase_id,
    p_balance_voucher_url
  );
$function$;

create or replace function public.current_user_role()
returns public.user_role
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.current_user_role();
$function$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
security invoker
set search_path = public, private_api, pg_temp
as $function$
  select private_api.has_role(_user_id, _role);
$function$;

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
        'activate_subscription_credit_for_current_user',
        'schedule_subscription_credit_plan_change',
        'cancel_subscription_credit_with_refund',
        'set_subscription_credit_no_renewal',
        'reactivate_subscription_credit_renewal',
        'create_subscription_credit_individual_order',
        'update_subscription_credit_automatic_order',
        'change_delivery_character_for_current_user',
        'change_delivery_collection_choice_for_current_user',
        'customer_submit_character_choice',
        'customer_change_character_choice',
        'create_subscription_checkout_for_current_user',
        'submit_standalone_balance_voucher',
        'current_user_role',
        'has_role'
      ])
  loop
    execute format(
      'revoke all on function %s from public, anon',
      v_target
    );
    execute format(
      'grant execute on function %s to authenticated, service_role',
      v_target
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
