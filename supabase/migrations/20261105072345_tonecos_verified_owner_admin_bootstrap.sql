-- One-time Tonecos owner bootstrap. No "first registered user wins".
-- Only the verified email in the brand's dedicated mailbox can activate the first admin.
create or replace function private_api.bootstrap_tonecos_owner_admin()
returns boolean language plpgsql security definer
set search_path = ''
as $func$
declare
  v_uid uuid := (select auth.uid());
  v_verified boolean := false;
begin
  if v_uid is null then
    raise exception 'Authenticated account required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(773041, 20261105);
  select exists (
    select 1 from auth.users
    where id = v_uid
      and lower(email) = 'tonecosstudio@gmail.com'
      and email_confirmed_at is not null
      and deleted_at is null
  ) into v_verified;
  if not v_verified then
    raise exception 'Verified Tonecos owner email required' using errcode='42501';
  end if;
  if exists (select 1 from private_api.admin_users) then
    if exists(select 1 from private_api.admin_users where user_id=v_uid) then
      return true; -- Safe idempotent response for the existing owner.
    end if;
    raise exception 'Administrator already initialized' using errcode='42501';
  end if;
  insert into private_api.admin_users(user_id) values (v_uid);
  return true;
end;
$func$;
revoke all on function private_api.bootstrap_tonecos_owner_admin() from public, anon;
grant execute on function private_api.bootstrap_tonecos_owner_admin() to authenticated, service_role;

create or replace function public.bootstrap_tonecos_owner_admin()
returns boolean language sql security invoker
set search_path = ''
as $func$ select private_api.bootstrap_tonecos_owner_admin(); $func$;
revoke all on function public.bootstrap_tonecos_owner_admin() from public, anon;
grant execute on function public.bootstrap_tonecos_owner_admin() to authenticated, service_role;
notify pgrst,'reload schema';