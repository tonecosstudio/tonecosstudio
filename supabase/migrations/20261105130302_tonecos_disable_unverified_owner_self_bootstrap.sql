-- Close the guessed-email self-service admin claim path.
-- First admin is provisioned only after owner verification through the
-- existing private_api.admin_users SSOT by an authorized database operator.
drop function if exists public.bootstrap_tonecos_owner_admin();
drop function if exists private_api.bootstrap_tonecos_owner_admin();
comment on table private_api.admin_users is
  'Tonecos role SSOT. Entries provisioned by authorized operator only after verifying the actual account owner; no browser self-promotion.';
notify pgrst, 'reload schema';