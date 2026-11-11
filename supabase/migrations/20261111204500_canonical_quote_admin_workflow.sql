-- Canonical quote status workflow: no new quote table or alternate owner.
-- Only an authenticated member of private_api.admin_users can transition status.
create or replace function private_api.admin_update_quote_status(p_quote_id uuid, p_status text)
returns uuid
language plpgsql security definer set search_path=''
as $fn$
declare v_updated uuid;
begin
  if (select auth.uid()) is null or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_quote_id is null or p_status is null
     or p_status not in ('pending', 'reviewing', 'archived') then
    raise exception 'Invalid quote status' using errcode='22023';
  end if;
  update public.quotes
     set status=p_status, updated_at=clock_timestamp()
   where id=p_quote_id
     and (
       (status='pending' and p_status in ('reviewing', 'archived'))
       or (status='reviewing' and p_status in ('pending', 'archived'))
       or (status='answered' and p_status='archived')
     )
   returning id into v_updated;
  if v_updated is null then
    raise exception 'Quote unavailable for status change' using errcode='P0002';
  end if;
  return v_updated;
end;
$fn$;

create or replace function public.admin_update_quote_status(p_quote_id uuid, p_status text)
returns uuid language sql security invoker set search_path=''
as $fn$
  select private_api.admin_update_quote_status(p_quote_id,p_status);
$fn$;
revoke all on function public.admin_update_quote_status(uuid,text) from public, anon;
grant execute on function public.admin_update_quote_status(uuid,text) to authenticated, service_role;
revoke all on function private_api.admin_update_quote_status(uuid,text) from public, anon;
grant execute on function private_api.admin_update_quote_status(uuid,text) to authenticated, service_role;
notify pgrst, 'reload schema';
