-- Reuse the CPF and birth-date fields already present in the canonical profile
-- schema. Earlier migrations created these as text, so keep that storage format
-- and make this migration safe on databases that already have both columns.
alter table public.profiles
  add column if not exists cpf text,
  add column if not exists birth_date text;

-- Customer writes remain scoped by the existing profile ownership policies.
-- The application normalizes and validates CPF before it reaches this table.
grant update (cpf, birth_date) on public.profiles to authenticated;

comment on column public.profiles.cpf is
  'Optional customer CPF, normalized to digits and collected only when needed for fiscal issuance.';
comment on column public.profiles.birth_date is
  'Optional customer birth date; available only in the existing authenticated profile.';

notify pgrst, 'reload schema';
