-- Independent public inquiry intake; legacy authenticated commercial quotes remain untouched.
create table if not exists public.tonart_quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  customer_whatsapp text check (customer_whatsapp ~ '^[0-9]{10,13}$'),
  postal_code text check (postal_code ~ '^[0-9]{8}$'),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  desired_scale text not null check (desired_scale in ('1/10','1/6','outro','a definir')),
  finishing text not null check (finishing in ('pintado','sem pintura','a definir')),
  notes text check (char_length(notes) <= 1200),
  status text not null default 'novo' check (status in ('novo','em_analise','respondido','arquivado')),
  admin_note text not null default '' check (char_length(admin_note) <= 1500)
);
create index if not exists tonart_quote_requests_created_idx
  on public.tonart_quote_requests(created_at desc);
create index if not exists tonart_quote_requests_status_idx
  on public.tonart_quote_requests(status, created_at desc);
comment on table public.tonart_quote_requests is
  'Standalone TONART inquiry intake; never authorizes a payment or an order.';
alter table public.tonart_quote_requests enable row level security;
revoke all on table public.tonart_quote_requests from public, anon, authenticated;
grant select,insert,update,delete on public.tonart_quote_requests to service_role;

create table if not exists public.tonart_quote_admin_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.tonart_quote_admin_emails enable row level security;
revoke all on table public.tonart_quote_admin_emails from public, anon, authenticated;
grant select on table public.tonart_quote_admin_emails to service_role;
insert into public.tonart_quote_admin_emails(email)
values ('tonecosstudio@gmail.com') on conflict (email) do nothing;

create table if not exists public.tonart_quote_rate_limits (
  fingerprint text primary key check (char_length(fingerprint) = 64),
  window_start timestamptz not null,
  attempts integer not null default 0
);
alter table public.tonart_quote_rate_limits enable row level security;
revoke all on table public.tonart_quote_rate_limits from public, anon, authenticated;
grant select,insert,update,delete on public.tonart_quote_rate_limits to service_role;

-- Atomic application-level throttling. Service role only; no anonymous SQL API.
create or replace function public.tonart_quote_check_limit(p_fingerprint text)
returns boolean language plpgsql security definer
set search_path = ''
as $function$
declare n integer;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.tonart_quote_rate_limits as current_rate(fingerprint,window_start,attempts)
  values (p_fingerprint, now(), 1)
  on conflict (fingerprint) do update
  set attempts = case
       when current_rate.window_start < now() - interval '1 hour' then 1
       else current_rate.attempts + 1 end,
      window_start = case
       when current_rate.window_start < now() - interval '1 hour' then now()
       else current_rate.window_start end
  returning attempts into n;
  return n <= 5;
end;
$function$;
revoke all on function public.tonart_quote_check_limit(text) from public, anon, authenticated;
grant execute on function public.tonart_quote_check_limit(text) to service_role;
