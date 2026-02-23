-- Timeline de Produção Visual (Ordax)
-- Rode isto no seu banco (ambiente de TEST) antes de testar a UI.

-- 1) Bucket para fotos (público para simplificar o acesso do cliente)
insert into storage.buckets (id, name, public)
values ('production', 'production', true)
on conflict (id) do update set public = true;

-- 2) Tabelas
create table if not exists public.quote_production (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique,
  current_stage text not null default 'queued',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_production_updates (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  stage text not null,
  note text null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create table if not exists public.quote_production_photos (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  update_id uuid not null references public.quote_production_updates(id) on delete cascade,
  url text not null,
  caption text null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

-- 3) RLS
alter table public.quote_production enable row level security;
alter table public.quote_production_updates enable row level security;
alter table public.quote_production_photos enable row level security;

-- Cliente: pode ver apenas o que é do seu quote
drop policy if exists "production_select_own" on public.quote_production;
create policy "production_select_own"
on public.quote_production
for select
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_production.quote_id
      and q.user_id = auth.uid()
  )
);

drop policy if exists "production_updates_select_own" on public.quote_production_updates;
create policy "production_updates_select_own"
on public.quote_production_updates
for select
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_production_updates.quote_id
      and q.user_id = auth.uid()
  )
);

drop policy if exists "production_photos_select_own" on public.quote_production_photos;
create policy "production_photos_select_own"
on public.quote_production_photos
for select
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_production_photos.quote_id
      and q.user_id = auth.uid()
  )
);

-- Admin: pode inserir/atualizar tudo (usa função has_role existente)
drop policy if exists "production_admin_write" on public.quote_production;
create policy "production_admin_write"
on public.quote_production
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "production_updates_admin_write" on public.quote_production_updates;
create policy "production_updates_admin_write"
on public.quote_production_updates
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "production_photos_admin_write" on public.quote_production_photos;
create policy "production_photos_admin_write"
on public.quote_production_photos
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Storage RLS (somente admin pode enviar/apagar fotos)
alter table storage.objects enable row level security;

drop policy if exists "production_bucket_admin_write" on storage.objects;
create policy "production_bucket_admin_write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'production'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'production'
  and public.has_role(auth.uid(), 'admin')
);

-- 4) Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_quote_production_updated_at on public.quote_production;
create trigger trg_quote_production_updated_at
before update on public.quote_production
for each row execute function public.set_updated_at();
