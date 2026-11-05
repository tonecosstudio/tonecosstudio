-- Tonecos Studio MVP commercial authority, clean project icmtmaakjucmuzxnofkd.
-- Catalog data remains Cloudflare D1/R2; only slug+quantity references live here.
-- Do not replay old monorepo migrations into this fresh Supabase project.
create schema if not exists private_api;
revoke all on schema private_api from public, anon, authenticated;
grant usage on schema private_api to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (length(email) between 3 and 320),
  full_name text check (full_name is null or length(full_name) <= 160),
  phone text check (phone is null or length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy tonecos_profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy tonecos_profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create table private_api.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private_api.admin_users enable row level security;
revoke all on private_api.admin_users from public, anon, authenticated;
grant select, insert, update, delete on private_api.admin_users to service_role;

create or replace function private_api.is_current_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from private_api.admin_users where user_id = (select auth.uid())
  );
$fn$;
revoke all on function private_api.is_current_admin() from public, anon;
grant execute on function private_api.is_current_admin() to authenticated, service_role;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'answered', 'archived')),
  notes text check (notes is null or length(notes) <= 2000),
  deadline text check (deadline is null or length(deadline) <= 80),
  requested_catalog_models jsonb not null,
  catalog_requested_at timestamptz not null default now(),
  total_amount numeric(10,2)
    check (total_amount is null or total_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tonecos_quotes_models_shape check (
    jsonb_typeof(requested_catalog_models) = 'array' and
    jsonb_array_length(requested_catalog_models) between 1 and 50
  )
);
create index tonecos_quotes_user_recent_idx
  on public.quotes (user_id, created_at desc);
create index tonecos_quotes_pending_idx
  on public.quotes (created_at desc)
  where status in ('pending', 'reviewing');
alter table public.quotes enable row level security;
revoke all on public.quotes from public, anon, authenticated;
grant select on public.quotes to authenticated;
create policy tonecos_quotes_read_own_or_admin on public.quotes
  for select to authenticated using (
    user_id = (select auth.uid()) or (select private_api.is_current_admin())
  );

create or replace function private_api.create_customer_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $fn$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')),160), '')
  );
  return new;
end;
$fn$;
revoke all on function private_api.create_customer_profile() from public, anon, authenticated;
create trigger tonecos_auth_profile_create
  after insert on auth.users for each row
  execute function private_api.create_customer_profile();

create or replace function private_api.submit_catalog_quote_request(
  p_models jsonb, p_notes text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_entry jsonb;
  v_slug text;
  v_quantity text;
  v_models jsonb := '[]'::jsonb;
  v_seen text[] := array[]::text[];
  v_quote_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id=v_user_id) then
    raise exception 'Customer account not initialized' using errcode = '23503';
  end if;
  if p_models is null or jsonb_typeof(p_models) <> 'array'
     or jsonb_array_length(p_models) not between 1 and 50 then
    raise exception 'Select between 1 and 50 models' using errcode='22023';
  end if;
  if length(coalesce(v_notes,'')) > 2000 then
    raise exception 'Quote notes exceed 2000 characters' using errcode='22023';
  end if;
  for v_entry in select value from jsonb_array_elements(p_models) loop
    if jsonb_typeof(v_entry) <> 'object'
       or (v_entry - 'slug' - 'quantity') <> '{}'::jsonb
       or jsonb_typeof(v_entry->'slug') <> 'string'
       or jsonb_typeof(v_entry->'quantity') <> 'number' then
      raise exception 'Invalid quote item' using errcode='22023';
    end if;
    v_slug := v_entry->>'slug';
    v_quantity := v_entry->>'quantity';
    if v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
       or v_quantity !~ '^(?:[1-9]|10)$'
       or v_slug = any(v_seen) then
      raise exception 'Invalid or duplicate model' using errcode='22023';
    end if;
    v_seen := array_append(v_seen, v_slug);
    v_models := v_models || jsonb_build_array(
      jsonb_build_object('slug',v_slug,'quantity',v_quantity::integer)
    );
  end loop;
  -- Serializes accidental concurrent submissions for this account.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 77231));
  if exists (
    select 1 from public.quotes
    where user_id = v_user_id
      and created_at > clock_timestamp() - interval '60 seconds'
  ) then
    raise exception 'Wait before submitting another quote'
      using errcode='P0001';
  end if;
  insert into public.quotes (user_id, notes, requested_catalog_models)
  values (v_user_id, v_notes, v_models)
  returning id into v_quote_id;
  return v_quote_id;
end;
$fn$;

create or replace function public.submit_catalog_quote_request(
  p_models jsonb, p_notes text default null
)
returns uuid language sql security invoker set search_path=''
as $fn$ select private_api.submit_catalog_quote_request(p_models,p_notes); $fn$;
revoke all on function public.submit_catalog_quote_request(jsonb,text)
  from public, anon;
grant execute on function public.submit_catalog_quote_request(jsonb,text)
  to authenticated, service_role;
revoke all on function private_api.submit_catalog_quote_request(jsonb,text)
  from public, anon;
grant execute on function private_api.submit_catalog_quote_request(jsonb,text)
  to authenticated, service_role;

create or replace function private_api.answer_catalog_quote_request(
  p_quote_id uuid, p_amount numeric
)
returns uuid
language plpgsql security definer set search_path=''
as $fn$
declare v_updated uuid;
begin
  if (select auth.uid()) is null
     or not (select private_api.is_current_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_quote_id is null or p_amount is null
     or p_amount <= 0 or p_amount > 99999999.99
     or p_amount <> round(p_amount,2) then
    raise exception 'Invalid quote amount' using errcode='22023';
  end if;
  update public.quotes
  set total_amount=p_amount, status='answered', updated_at=clock_timestamp()
  where id=p_quote_id and status in ('pending','reviewing')
  returning id into v_updated;
  if v_updated is null then
    raise exception 'Quote unavailable for pricing' using errcode='P0002';
  end if;
  return v_updated;
end;
$fn$;
create or replace function public.answer_catalog_quote_request(
  p_quote_id uuid, p_amount numeric
)
returns uuid language sql security invoker set search_path=''
as $fn$ select private_api.answer_catalog_quote_request(p_quote_id,p_amount); $fn$;
revoke all on function public.answer_catalog_quote_request(uuid,numeric)
  from public, anon;
grant execute on function public.answer_catalog_quote_request(uuid,numeric)
  to authenticated, service_role;
revoke all on function private_api.answer_catalog_quote_request(uuid,numeric)
  from public, anon;
grant execute on function private_api.answer_catalog_quote_request(uuid,numeric)
  to authenticated, service_role;

comment on table public.profiles is
  'Private Tonecos customer identity, one per Supabase Auth user; not the catalog.';
comment on table public.quotes is
  'Customer catalog quote intake, not a purchase or payment authorization.';
comment on column public.quotes.total_amount is
  'NULL until a Tonecos administrator prices the quote; no zero-price placeholder.';
notify pgrst, 'reload schema';