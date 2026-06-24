do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'user_notifications_delete_own'
  ) then
    create policy user_notifications_delete_own
      on public.user_notifications
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.admin_notifications
  set
    is_read = true,
    read_at = now(),
    updated_at = now()
  where id = p_notification_id
    and recipient_user_id = auth.uid();
end;
$function$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.admin_notifications
  set
    is_read = true,
    read_at = now(),
    updated_at = now()
  where recipient_user_id = auth.uid()
    and is_read = false;
end;
$function$;

create or replace function public.admin_delete_notification(p_notification_id uuid)
returns uuid
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.admin_notifications
  where id = p_notification_id
  returning id into v_result_id;

  if v_result_id is null then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  return v_result_id;
end;
$function$;

create or replace function public.mark_user_notification_read(p_notification_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.user_notifications
  set
    is_read = true,
    read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = auth.uid();
end;
$function$;

create or replace function public.mark_all_user_notifications_read()
returns integer
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.user_notifications
  set
    is_read = true,
    read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and is_read = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

create or replace function public.delete_user_notification(p_notification_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_notifications
  where id = p_notification_id
    and user_id = auth.uid();
end;
$function$;
