grant execute on function public.admin_validate_collection_text(text, text, integer, boolean) to authenticated;
grant insert on table public.user_notifications to authenticated;

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text default 'medium'::text,
  p_action_url text default null::text,
  p_related_id uuid default null::uuid,
  p_related_type text default null::text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_type text := public.admin_validate_collection_text(p_type, 'Type', 80, true);
  v_title text := public.admin_validate_collection_text(p_title, 'Title', 160, true);
  v_message text := public.admin_validate_collection_text(p_message, 'Message', 1000, false);
  v_priority text := coalesce(nullif(btrim(p_priority), ''), 'medium');
  v_related_type text := public.admin_validate_collection_text(p_related_type, 'Related type', 80, false);
  v_action_url text := nullif(btrim(coalesce(p_action_url, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not exists (
       select 1
       from public.profiles
       where id = auth.uid()
         and role = any (array['admin'::public.user_role, 'super_admin'::public.user_role])
     ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if v_priority not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Invalid notification priority' using errcode = '22023';
  end if;

  if v_action_url is not null and v_action_url !~ '^/[A-Za-z0-9/_?=&.#%-]*$' then
    raise exception 'Invalid notification action URL' using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'Notification metadata must be an object' using errcode = '22023';
  end if;

  insert into public.user_notifications (
    id,
    user_id,
    type,
    title,
    message,
    priority,
    action_url,
    related_id,
    related_type,
    metadata
  )
  values (
    v_id,
    p_user_id,
    v_type,
    v_title,
    v_message,
    v_priority,
    v_action_url,
    p_related_id,
    v_related_type,
    v_metadata
  );

  return v_id;
end;
$$;
