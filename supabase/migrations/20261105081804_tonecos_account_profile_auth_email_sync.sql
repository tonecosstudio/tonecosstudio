-- Keep Tonecos Auth as identity SSOT while customers edit their profiles.
create or replace function private_api.touch_tonecos_profile_timestamp()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$fn$;
revoke all on function private_api.touch_tonecos_profile_timestamp() from public,anon,authenticated;
create trigger tonecos_profile_timestamp
before update on public.profiles for each row
execute function private_api.touch_tonecos_profile_timestamp();

create or replace function private_api.sync_tonecos_auth_email_to_profile()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
  update public.profiles set email=lower(new.email)
  where id = new.id;
  return new;
end;
$fn$;
revoke all on function private_api.sync_tonecos_auth_email_to_profile() from public,anon,authenticated;
create trigger tonecos_auth_email_sync
after update of email on auth.users
for each row when (
  new.email is distinct from old.email and new.email is not null
)
execute function private_api.sync_tonecos_auth_email_to_profile();
comment on function private_api.sync_tonecos_auth_email_to_profile() is
  'Internal Auth email updates are the only source of profile email changes.';
notify pgrst,'reload schema';