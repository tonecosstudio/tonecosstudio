-- Fix linter: move pg_trgm out of public schema (recreate dependent indexes)
create schema if not exists extensions;

-- Drop dependent indexes first
drop index if exists public.franchise_rules_pattern_trgm_idx;
drop index if exists public.franchise_rules_franchise_trgm_idx;

-- Drop & recreate extension in the recommended schema
drop extension if exists pg_trgm cascade;
create extension if not exists pg_trgm with schema extensions;

-- Recreate indexes (with schema-qualified operator class)
create index if not exists franchise_rules_pattern_trgm_idx
on public.franchise_rules using gin (pattern extensions.gin_trgm_ops);

create index if not exists franchise_rules_franchise_trgm_idx
on public.franchise_rules using gin (franchise_canonical extensions.gin_trgm_ops);
