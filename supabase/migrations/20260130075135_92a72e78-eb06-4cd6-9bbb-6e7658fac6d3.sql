-- Regras automáticas de franquia (keyword/pattern -> franquia canônica)

create extension if not exists pg_trgm;

create table if not exists public.franchise_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid not null,
  enabled boolean not null default true,
  priority int not null default 100,

  -- padrão simples (case-insensitive). Ex.: 'magneto', 'tobi', 'x-men'
  pattern text not null,

  -- franquia canônica para aplicar quando bater
  franchise_canonical text not null,

  note text null
);

alter table public.franchise_rules enable row level security;

-- Admins: ler/escrever
create policy "admins_select_franchise_rules"
on public.franchise_rules
for select
using (has_role(auth.uid(), 'admin'::app_role));

create policy "admins_manage_franchise_rules"
on public.franchise_rules
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
create trigger set_franchise_rules_updated_at
before update on public.franchise_rules
for each row execute function public.set_updated_at();

-- Índices para busca/similaridade
create index if not exists franchise_rules_enabled_priority_idx
on public.franchise_rules (enabled, priority);

create index if not exists franchise_rules_pattern_trgm_idx
on public.franchise_rules using gin (pattern gin_trgm_ops);

create index if not exists franchise_rules_franchise_trgm_idx
on public.franchise_rules using gin (franchise_canonical gin_trgm_ops);
