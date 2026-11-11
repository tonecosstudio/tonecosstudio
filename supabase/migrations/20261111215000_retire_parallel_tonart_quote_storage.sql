-- Remove the empty predecessor intake. public.quotes + existing auth/admin roles
-- are the only production SSOT for catalog quote records and authorization.
-- The predecessor Edge Function has already been replaced with a JWT-guarded
-- 410 response; no former production API routes remain in the canonical bundle.
do $$
begin
  if exists (select 1 from public.tonart_quote_requests limit 1) then
    raise exception 'Refusing to remove predecessor quote requests with customer data';
  end if;
  if exists (select 1 from public.tonart_quote_rate_limits limit 1) then
    raise exception 'Refusing to remove predecessor rate-limit rows before cleanup';
  end if;
  if exists (
    select 1 from public.tonart_quote_admin_emails old_admin
    where not exists (
      select 1 from auth.users user_account
      join private_api.admin_users canonical_admin
        on canonical_admin.user_id = user_account.id
      where lower(user_account.email) = lower(old_admin.email)
        and user_account.email_confirmed_at is not null
    )
  ) then
    raise exception 'Legacy administrative authorization not reconciled';
  end if;
end;
$$;

drop function if exists public.tonart_quote_check_limit(text);
drop table public.tonart_quote_requests restrict;
drop table public.tonart_quote_rate_limits restrict;
drop table public.tonart_quote_admin_emails restrict;
drop table public.tonart_quote_proxy_auth restrict;
notify pgrst, 'reload schema';
