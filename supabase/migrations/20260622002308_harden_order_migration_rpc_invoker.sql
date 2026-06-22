grant execute on function public.customer_mutation_validate_email(text, text, boolean) to authenticated;
grant insert on table public.order_migrations to authenticated;

alter table public.order_migrations
  drop constraint if exists order_migrations_full_name_valid,
  drop constraint if exists order_migrations_email_valid,
  drop constraint if exists order_migrations_phone_valid,
  drop constraint if exists order_migrations_old_order_number_valid,
  drop constraint if exists order_migrations_description_valid;

alter table public.order_migrations
  add constraint order_migrations_full_name_valid
    check (full_name = btrim(full_name) and length(full_name) between 1 and 160),
  add constraint order_migrations_email_valid
    check (
      email = lower(btrim(email))
      and length(email) between 1 and 320
      and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ),
  add constraint order_migrations_phone_valid
    check (
      phone is null
      or (phone = btrim(phone) and phone ~ '^[0-9+(). -]{8,40}$')
    ),
  add constraint order_migrations_old_order_number_valid
    check (
      old_order_number is null
      or (old_order_number = btrim(old_order_number) and length(old_order_number) between 1 and 80)
    ),
  add constraint order_migrations_description_valid
    check (
      order_description = btrim(order_description)
      and length(order_description) between 1 and 4000
    );

alter table public.order_migrations validate constraint order_migrations_status_check;

drop policy if exists order_migrations_insert_own_pending on public.order_migrations;
drop policy if exists order_migrations_select_own_or_admin on public.order_migrations;

create policy order_migrations_insert_own_pending
on public.order_migrations
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
);

create policy order_migrations_select_own_or_admin
on public.order_migrations
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'super_admin'))
);

create or replace function public.submit_order_migration_request(
  p_full_name text,
  p_email text,
  p_phone text,
  p_old_order_number text,
  p_order_description text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_full_name text := public.customer_mutation_validate_text(p_full_name, 'full_name', 160, true);
  v_email text := public.customer_mutation_validate_email(p_email, 'email', true);
  v_phone text := public.customer_mutation_validate_text(p_phone, 'phone', 40, false);
  v_old_order_number text := public.customer_mutation_validate_text(p_old_order_number, 'old_order_number', 80, false);
  v_order_description text := public.customer_mutation_validate_text(p_order_description, 'order_description', 4000, true);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if v_phone is not null and v_phone !~ '^[0-9+(). -]{8,40}$' then
    raise exception 'phone is invalid' using errcode = '22023';
  end if;

  perform public.ensure_profile_row_from_auth_user(v_user_id);

  insert into public.order_migrations (
    user_id,
    full_name,
    email,
    phone,
    old_order_number,
    order_description,
    status
  )
  values (
    v_user_id,
    v_full_name,
    v_email,
    v_phone,
    v_old_order_number,
    v_order_description,
    'pending'
  )
  returning id into v_id;

  return v_id;
end;
$$;
