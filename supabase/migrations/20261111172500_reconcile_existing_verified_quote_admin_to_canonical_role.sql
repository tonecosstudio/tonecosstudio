-- One-time SSOT reconciliation: promote only a VERIFIED account already
-- explicitly authorized in the predecessor quote-admin allowlist.
-- Never infer authorization from a browser profile or user_metadata.
insert into private_api.admin_users(user_id)
select u.id
from auth.users u
join public.tonart_quote_admin_emails authorized
  on authorized.email = lower(u.email)
where u.email_confirmed_at is not null
on conflict (user_id) do nothing;