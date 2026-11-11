-- Admin quote support needs a verified customer contact without exposing all profiles.
-- Customer profiles remain owner-only; admins can read contacts only for quote owners.
create policy tonecos_profiles_admin_quote_contact_read
on public.profiles for select to authenticated
using (
  (select private_api.is_current_admin())
  and exists (
    select 1 from public.quotes as q
    where q.user_id = profiles.id
  )
);
comment on policy tonecos_profiles_admin_quote_contact_read on public.profiles is
  'Only an authenticated Tonecos admin may read a customer profile with a submitted quote.';
notify pgrst, 'reload schema';