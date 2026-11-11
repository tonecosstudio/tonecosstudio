-- The quote Edge Function only accepts requests from the dedicated Vercel
-- server-side proxy. No secret is committed to source control.
create table if not exists public.tonart_quote_proxy_auth (
  slot text primary key check (slot = 'active'),
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
comment on table public.tonart_quote_proxy_auth is
  'Hashed server-to-server key protecting the TONART quote Edge Function.';
alter table public.tonart_quote_proxy_auth enable row level security;
revoke all on table public.tonart_quote_proxy_auth from public, anon, authenticated;
grant select on table public.tonart_quote_proxy_auth to service_role;
