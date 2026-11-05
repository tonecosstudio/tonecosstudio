create or replace function public.is_tonecos_admin()
returns boolean language sql stable security invoker
set search_path = ''
as $fn$
  select private_api.is_current_admin();
$fn$;
revoke all on function public.is_tonecos_admin() from public, anon;
grant execute on function public.is_tonecos_admin() to authenticated, service_role;
notify pgrst, 'reload schema';