create schema if not exists private_api;

revoke all on schema private_api from public, anon;
grant usage on schema private_api to authenticated, service_role;

create or replace function private_api.add_current_user_public_collection_item(
  p_model_id uuid,
  p_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_notes text := public.customer_mutation_validate_text(p_notes, 'notes', 500, false);
  v_order integer;
  v_row public.public_collection%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if p_model_id is null or not exists (
    select 1
    from public.models
    where id = p_model_id
      and is_active = true
  ) then
    raise exception 'Model not found' using errcode = 'P0002';
  end if;

  select *
    into v_row
    from public.public_collection
   where user_id = v_user_id
     and model_id = p_model_id
   order by created_at asc
   limit 1;

  if v_row.id is not null then
    update public.public_collection
       set notes = coalesce(v_notes, notes),
           updated_at = now()
     where id = v_row.id
    returning * into v_row;

    return public.public_collection_row_to_json(v_row);
  end if;

  select coalesce(max(display_order), -1) + 1
    into v_order
    from public.public_collection
   where user_id = v_user_id;

  insert into public.public_collection (
    user_id,
    model_id,
    notes,
    display_order
  )
  values (
    v_user_id,
    p_model_id,
    v_notes,
    v_order
  )
  returning * into v_row;

  return public.public_collection_row_to_json(v_row);
end;
$function$;

create or replace function private_api.remove_current_user_public_collection_item(p_collection_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  delete from public.public_collection
   where id = p_collection_id
     and user_id = v_user_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'Collection item not found' using errcode = 'P0002';
  end if;

  return v_deleted_id;
end;
$function$;

create or replace function private_api.update_current_user_public_collection_notes(
  p_collection_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_notes text := public.customer_mutation_validate_text(p_notes, 'notes', 500, false);
  v_row public.public_collection%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  update public.public_collection
     set notes = v_notes,
         updated_at = now()
   where id = p_collection_id
     and user_id = v_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Collection item not found' using errcode = 'P0002';
  end if;

  return public.public_collection_row_to_json(v_row);
end;
$function$;

create or replace function private_api.update_current_user_public_collection_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_id uuid;
  v_display_order integer;
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 200 then
    raise exception 'too many collection items' using errcode = '22023';
  end if;

  for v_item in select jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'collection order item must be an object' using errcode = '22023';
    end if;

    v_id := (v_item->>'id')::uuid;
    v_display_order := (v_item->>'display_order')::integer;

    if v_id is null or v_display_order is null or v_display_order < 0 or v_display_order > 10000 then
      raise exception 'invalid collection order item' using errcode = '22023';
    end if;

    update public.public_collection
       set display_order = v_display_order,
           updated_at = now()
     where id = v_id
       and user_id = v_user_id;

    if not found then
      raise exception 'Collection item not found' using errcode = 'P0002';
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('updated', v_count);
end;
$function$;

create or replace function private_api.delete_profile_payment_method(p_payment_method_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.payment_methods
     set is_active = false,
         is_default = false,
         updated_at = now()
   where id = p_payment_method_id
     and user_id = v_user_id
     and is_active = true
  returning id into v_result_id;

  if v_result_id is null then
    raise exception 'Payment method not found' using errcode = 'P0002';
  end if;

  return v_result_id;
end;
$function$;

create or replace function private_api.set_default_profile_payment_method(p_payment_method_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.payment_methods
     where id = p_payment_method_id
       and user_id = v_user_id
       and is_active = true
  ) then
    raise exception 'Payment method not found' using errcode = 'P0002';
  end if;

  update public.payment_methods
     set is_default = false,
         updated_at = now()
   where user_id = v_user_id
     and id <> p_payment_method_id
     and is_default = true;

  update public.payment_methods
     set is_default = true,
         updated_at = now()
   where id = p_payment_method_id
     and user_id = v_user_id
  returning id into v_result_id;

  return v_result_id;
end;
$function$;

create or replace function private_api.delete_wishlist_item(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  delete from public.wishlist
   where id = p_item_id
     and user_id = v_user_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Wishlist item not found' using errcode = 'P0002';
  end if;

  return v_id;
end;
$function$;

create or replace function private_api.update_wishlist_item(
  p_item_id uuid,
  p_notes text,
  p_priority integer,
  p_notify_when_available boolean
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_notes text := public.admin_validate_collection_text(p_notes, 'Notes', 1000, false);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if p_priority < 0 or p_priority > 5 then
    raise exception 'Invalid wishlist priority' using errcode = '22023';
  end if;

  update public.wishlist
     set notes = v_notes,
         priority = p_priority,
         notify_when_available = coalesce(p_notify_when_available, false)
   where id = p_item_id
     and user_id = v_user_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Wishlist item not found' using errcode = 'P0002';
  end if;

  return v_id;
end;
$function$;

revoke all on function private_api.add_current_user_public_collection_item(uuid, text) from public, anon;
revoke all on function private_api.remove_current_user_public_collection_item(uuid) from public, anon;
revoke all on function private_api.update_current_user_public_collection_notes(uuid, text) from public, anon;
revoke all on function private_api.update_current_user_public_collection_order(jsonb) from public, anon;
revoke all on function private_api.delete_profile_payment_method(uuid) from public, anon;
revoke all on function private_api.set_default_profile_payment_method(uuid) from public, anon;
revoke all on function private_api.delete_wishlist_item(uuid) from public, anon;
revoke all on function private_api.update_wishlist_item(uuid, text, integer, boolean) from public, anon;

grant execute on function private_api.add_current_user_public_collection_item(uuid, text) to authenticated, service_role;
grant execute on function private_api.remove_current_user_public_collection_item(uuid) to authenticated, service_role;
grant execute on function private_api.update_current_user_public_collection_notes(uuid, text) to authenticated, service_role;
grant execute on function private_api.update_current_user_public_collection_order(jsonb) to authenticated, service_role;
grant execute on function private_api.delete_profile_payment_method(uuid) to authenticated, service_role;
grant execute on function private_api.set_default_profile_payment_method(uuid) to authenticated, service_role;
grant execute on function private_api.delete_wishlist_item(uuid) to authenticated, service_role;
grant execute on function private_api.update_wishlist_item(uuid, text, integer, boolean) to authenticated, service_role;

create or replace function public.add_current_user_public_collection_item(
  p_model_id uuid,
  p_notes text default null::text
)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.add_current_user_public_collection_item(p_model_id, p_notes);
$function$;

create or replace function public.remove_current_user_public_collection_item(p_collection_id uuid)
returns uuid
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.remove_current_user_public_collection_item(p_collection_id);
$function$;

create or replace function public.update_current_user_public_collection_notes(
  p_collection_id uuid,
  p_notes text
)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.update_current_user_public_collection_notes(p_collection_id, p_notes);
$function$;

create or replace function public.update_current_user_public_collection_order(p_items jsonb)
returns jsonb
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.update_current_user_public_collection_order(p_items);
$function$;

create or replace function public.delete_profile_payment_method(p_payment_method_id uuid)
returns uuid
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.delete_profile_payment_method(p_payment_method_id);
$function$;

create or replace function public.set_default_profile_payment_method(p_payment_method_id uuid)
returns uuid
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.set_default_profile_payment_method(p_payment_method_id);
$function$;

create or replace function public.delete_wishlist_item(p_item_id uuid)
returns uuid
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.delete_wishlist_item(p_item_id);
$function$;

create or replace function public.update_wishlist_item(
  p_item_id uuid,
  p_notes text,
  p_priority integer,
  p_notify_when_available boolean
)
returns uuid
language sql
security invoker
set search_path to 'public', 'private_api', 'pg_temp'
as $function$
  select private_api.update_wishlist_item(
    p_item_id,
    p_notes,
    p_priority,
    p_notify_when_available
  );
$function$;

revoke all on function public.add_current_user_public_collection_item(uuid, text) from public, anon;
revoke all on function public.remove_current_user_public_collection_item(uuid) from public, anon;
revoke all on function public.update_current_user_public_collection_notes(uuid, text) from public, anon;
revoke all on function public.update_current_user_public_collection_order(jsonb) from public, anon;
revoke all on function public.delete_profile_payment_method(uuid) from public, anon;
revoke all on function public.set_default_profile_payment_method(uuid) from public, anon;
revoke all on function public.delete_wishlist_item(uuid) from public, anon;
revoke all on function public.update_wishlist_item(uuid, text, integer, boolean) from public, anon;

grant execute on function public.add_current_user_public_collection_item(uuid, text) to authenticated, service_role;
grant execute on function public.remove_current_user_public_collection_item(uuid) to authenticated, service_role;
grant execute on function public.update_current_user_public_collection_notes(uuid, text) to authenticated, service_role;
grant execute on function public.update_current_user_public_collection_order(jsonb) to authenticated, service_role;
grant execute on function public.delete_profile_payment_method(uuid) to authenticated, service_role;
grant execute on function public.set_default_profile_payment_method(uuid) to authenticated, service_role;
grant execute on function public.delete_wishlist_item(uuid) to authenticated, service_role;
grant execute on function public.update_wishlist_item(uuid, text, integer, boolean) to authenticated, service_role;
