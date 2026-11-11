-- Private single-customer lookup for future Tonecos coin administration.
-- Never expose the full customer directory; require the verified admin role.
create or replace function private_api.find_tonecos_coin_recipient(p_email text)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if char_length(v_email) < 3 or char_length(v_email) > 320
     or position('@' in v_email) < 2 then
    raise exception 'Invalid recipient email' using errcode='22023';
  end if;
  select jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name)
    into v_result from public.profiles p where p.email=v_email limit 1;
  return v_result; -- NULL when unknown; no privileged directory listing.
end;
$fn$;
revoke all on function private_api.find_tonecos_coin_recipient(text) from public,anon;
grant execute on function private_api.find_tonecos_coin_recipient(text) to authenticated,service_role;

create or replace function public.find_tonecos_coin_recipient(p_email text)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select private_api.find_tonecos_coin_recipient(p_email); $fn$;
revoke all on function public.find_tonecos_coin_recipient(text) from public,anon;
grant execute on function public.find_tonecos_coin_recipient(text) to authenticated,service_role;
notify pgrst,'reload schema';