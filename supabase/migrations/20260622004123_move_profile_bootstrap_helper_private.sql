create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.ensure_profile_row_from_auth_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user auth.users%rowtype;
  v_profile public.profiles%rowtype;
  v_full_name text;
begin
  if p_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and p_user_id is distinct from auth.uid() then
    raise exception 'Cannot initialize another user profile' using errcode = '42501';
  end if;

  select *
    into v_auth_user
    from auth.users
   where id = p_user_id;

  if v_auth_user.id is null then
    raise exception 'Authenticated user record not found' using errcode = 'P0002';
  end if;

  if nullif(btrim(coalesce(v_auth_user.email, '')), '') is null then
    raise exception 'Authenticated user email is required to initialize profile'
      using errcode = '22023';
  end if;

  v_full_name := nullif(
    btrim(coalesce(v_auth_user.raw_user_meta_data->>'full_name', v_auth_user.raw_user_meta_data->>'name', '')),
    ''
  );

  insert into public.profiles (id, email, full_name, role)
  values (p_user_id, lower(v_auth_user.email), v_full_name, 'customer')
  on conflict (id) do nothing;

  select *
    into v_profile
    from public.profiles
   where id = p_user_id;

  if v_profile.id is null then
    raise exception 'Profile row could not be initialized' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function private.ensure_profile_row_from_auth_user(uuid) from public;
grant execute on function private.ensure_profile_row_from_auth_user(uuid) to authenticated;
grant execute on function private.ensure_profile_row_from_auth_user(uuid) to service_role;

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

  perform private.ensure_profile_row_from_auth_user(v_user_id);

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

create or replace function public.update_current_user_collector_profile(p_updates jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_username text;
  v_row public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'Collector profile payload must be an object' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_updates)
  loop
    if v_key not in ('username', 'display_name', 'bio', 'avatar_url', 'is_public') then
      raise exception 'Unsupported collector profile field: %', v_key using errcode = '22023';
    end if;

    if v_key = 'is_public' and jsonb_typeof(v_value) <> 'boolean' then
      raise exception 'is_public must be boolean' using errcode = '22023';
    end if;
  end loop;

  if p_updates ? 'username' then
    v_username := lower(public.customer_mutation_validate_text(p_updates->>'username', 'username', 32, false));

    if v_username is not null and v_username !~ '^[a-z0-9_]{3,32}$' then
      raise exception 'username is invalid' using errcode = '22023';
    end if;

    if v_username is not null
       and exists (
         select 1
           from public.profiles
          where lower(username) = v_username
            and id <> v_user_id
       ) then
      raise exception 'username is already in use' using errcode = '23505';
    end if;
  end if;

  perform public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false);
  perform public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false);
  perform public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false);

  perform private.ensure_profile_row_from_auth_user(v_user_id);

  update public.profiles
     set username = case when p_updates ? 'username' then v_username else username end,
         display_name = case when p_updates ? 'display_name'
           then public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false)
           else display_name
         end,
         bio = case when p_updates ? 'bio'
           then public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false)
           else bio
         end,
         avatar_url = case when p_updates ? 'avatar_url'
           then public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false)
           else avatar_url
         end,
         is_public = case when p_updates ? 'is_public'
           then (p_updates->>'is_public')::boolean
           else is_public
         end,
         updated_at = now()
   where id = v_user_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.upsert_current_user_profile(p_profile jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_row public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '28000';
  end if;

  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Profile payload must be an object' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_profile)
  loop
    if v_key not in (
      'delivery_address',
      'preferences_text',
      'preference_tags',
      'full_name',
      'phone',
      'whatsapp',
      'cpf',
      'birth_date',
      'email_notifications',
      'order_updates',
      'marketing_emails'
    ) then
      raise exception 'Unsupported profile field: %', v_key using errcode = '22023';
    end if;

    if v_key = 'delivery_address'
       and jsonb_typeof(v_value) not in ('object', 'null') then
      raise exception 'delivery_address must be an object' using errcode = '22023';
    end if;

    if v_key = 'preference_tags' then
      perform public.customer_mutation_jsonb_text_array(v_value);
    end if;

    if v_key in ('email_notifications', 'order_updates', 'marketing_emails')
       and jsonb_typeof(v_value) not in ('boolean', 'null') then
      raise exception '% must be boolean', v_key using errcode = '22023';
    end if;
  end loop;

  perform public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false);
  perform public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false);
  perform public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false);
  perform public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false);
  perform public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false);
  perform public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false);

  if p_profile ? 'cpf'
     and p_profile->>'cpf' is not null
     and public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false) !~ '^[0-9.\-]{11,20}$' then
    raise exception 'cpf is invalid' using errcode = '22023';
  end if;

  if p_profile ? 'birth_date'
     and p_profile->>'birth_date' is not null
     and public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'birth_date must use YYYY-MM-DD' using errcode = '22023';
  end if;

  perform private.ensure_profile_row_from_auth_user(v_user_id);

  update public.profiles
     set delivery_address = case when p_profile ? 'delivery_address'
           then nullif(p_profile->'delivery_address', 'null'::jsonb)
           else delivery_address
         end,
         preferences_text = case when p_profile ? 'preferences_text'
           then public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false)
           else preferences_text
         end,
         preference_tags = case when p_profile ? 'preference_tags'
           then public.customer_mutation_jsonb_text_array(p_profile->'preference_tags')
           else preference_tags
         end,
         full_name = case when p_profile ? 'full_name'
           then public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false)
           else full_name
         end,
         phone = case when p_profile ? 'phone'
           then public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false)
           else phone
         end,
         whatsapp = case when p_profile ? 'whatsapp'
           then public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false)
           else whatsapp
         end,
         cpf = case when p_profile ? 'cpf'
           then public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false)
           else cpf
         end,
         birth_date = case when p_profile ? 'birth_date'
           then public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false)
           else birth_date
         end,
         email_notifications = case when p_profile ? 'email_notifications'
           then (p_profile->>'email_notifications')::boolean
           else email_notifications
         end,
         order_updates = case when p_profile ? 'order_updates'
           then (p_profile->>'order_updates')::boolean
           else order_updates
         end,
         marketing_emails = case when p_profile ? 'marketing_emails'
           then (p_profile->>'marketing_emails')::boolean
           else marketing_emails
         end,
         updated_at = now()
   where id = v_user_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.ensure_profile_row_from_auth_user(uuid) from anon;
revoke all on function public.ensure_profile_row_from_auth_user(uuid) from authenticated;
