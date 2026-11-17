BEGIN;

-- The subscription voucher verifier is the authority for payment approval. Keep the
-- linked manual_payments row in sync so the existing customer payment history and
-- finance screens do not continue to show a reviewed subscription as pending.
CREATE OR REPLACE FUNCTION private_api.sync_subscription_manual_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.payment_status::text = 'paid' THEN
    UPDATE public.manual_payments
       SET status = 'approved'::public.payment_status,
           approved_at = COALESCE(approved_at, now()),
           rejection_reason = NULL,
           updated_at = now()
     WHERE subscription_id = NEW.id;
  ELSIF NEW.payment_status::text = 'rejected' THEN
    UPDATE public.manual_payments
       SET status = 'rejected'::public.payment_status,
           rejection_reason = NEW.payment_rejection_reason,
           approved_at = NULL,
           approved_by = NULL,
           updated_at = now()
     WHERE subscription_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.sync_subscription_manual_payment_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_api.sync_subscription_manual_payment_status()
  TO service_role;

-- The canonical TONART quote MVP has no subscriptions relation. Keep the
-- existing integration intact for deployments that already own that legacy
-- subsystem, while allowing the quote migrations to proceed on the clean MVP.
DO $block$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND to_regclass('public.manual_payments') IS NOT NULL
     AND to_regtype('public.payment_status') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS sync_subscription_manual_payment_status ON public.subscriptions';
    EXECUTE $ddl$
      CREATE TRIGGER sync_subscription_manual_payment_status
      AFTER UPDATE OF payment_status ON public.subscriptions
      FOR EACH ROW
      WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
      EXECUTE FUNCTION private_api.sync_subscription_manual_payment_status()
    $ddl$;
  END IF;
END;
$block$;

COMMENT ON FUNCTION private_api.sync_subscription_manual_payment_status() IS
  'Keeps the existing linked manual payment aligned with subscription voucher review outcomes.';

NOTIFY pgrst, 'reload schema';

COMMIT;
