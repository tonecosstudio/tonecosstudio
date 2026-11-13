alter table public.quotes add column if not exists admin_response text;
alter table public.quotes drop constraint if exists tonecos_quotes_admin_response_length;
alter table public.quotes add constraint tonecos_quotes_admin_response_length check (admin_response is null or char_length(admin_response) <= 2000);
alter table public.quote_events add column if not exists response_text text;
alter table public.quote_events drop constraint if exists tonecos_quote_events_response_text;
alter table public.quote_events add constraint tonecos_quote_events_response_text check ((event_type = 'answered' and (response_text is null or char_length(response_text) <= 2000)) or (event_type <> 'answered' and response_text is null));
drop function if exists public.answer_catalog_quote_request(uuid,numeric);
drop function if exists private_api.answer_catalog_quote_request(uuid,numeric);
create function private_api.answer_catalog_quote_request(p_quote_id uuid,p_amount numeric,p_message text default null)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_previous text; v_updated uuid; v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if (select auth.uid()) is null or not (select private_api.is_current_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_quote_id is null or p_amount is null or p_amount <= 0 or p_amount > 99999999.99 or p_amount <> round(p_amount,2) or length(coalesce(v_message, '')) > 2000 then raise exception 'Invalid quote response' using errcode='22023'; end if;
  select status into v_previous from public.quotes where id=p_quote_id for update;
  if v_previous is null or v_previous not in ('pending','reviewing') then raise exception 'Quote unavailable for pricing' using errcode='P0002'; end if;
  update public.quotes set total_amount=p_amount,admin_response=v_message,status='answered',updated_at=clock_timestamp() where id=p_quote_id returning id into v_updated;
  insert into public.quote_events (quote_id,actor_user_id,event_type,from_status,to_status,amount,response_text)
  values (p_quote_id,(select auth.uid()),'answered',v_previous,'answered',p_amount,v_message);
  return v_updated;
end;$fn$;
revoke all on function private_api.answer_catalog_quote_request(uuid,numeric,text) from public, anon;
grant execute on function private_api.answer_catalog_quote_request(uuid,numeric,text) to authenticated, service_role;
create function public.answer_catalog_quote_request(p_quote_id uuid,p_amount numeric,p_message text default null)
returns uuid language sql security invoker set search_path='' as $fn$ select private_api.answer_catalog_quote_request(p_quote_id,p_amount,p_message); $fn$;
revoke all on function public.answer_catalog_quote_request(uuid,numeric,text) from public, anon;
grant execute on function public.answer_catalog_quote_request(uuid,numeric,text) to authenticated, service_role;
comment on column public.quotes.admin_response is 'Latest commercial response written only by the canonical admin quote RPC.';
comment on column public.quote_events.response_text is 'Immutable response text captured with answered quote events.';
notify pgrst, 'reload schema';
