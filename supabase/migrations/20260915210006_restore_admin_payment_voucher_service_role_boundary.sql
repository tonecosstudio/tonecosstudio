BEGIN;

-- 20260915205645 redefined the verifier while migrating vouchers to private
-- Storage. Preserve the server-authoritative admin boundary established in
-- 20260615124432: browser roles must never execute this SECURITY DEFINER RPC.
REVOKE ALL ON FUNCTION public.admin_verify_subscription_payment_voucher(
  uuid, boolean, text, text, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_verify_subscription_payment_voucher(
  uuid, boolean, text, text, uuid
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
