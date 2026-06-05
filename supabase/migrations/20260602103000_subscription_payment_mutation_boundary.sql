-- Subscription payment mutation boundary.
-- Payment approval must go through admin_process_subscription_payment so the
-- subscription row, payment row, and coin ledger remain atomic.

DROP POLICY IF EXISTS "subscription_payments_modify_admin"
  ON public.subscription_payments;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscription_payments
  FROM anon, authenticated;

GRANT SELECT ON TABLE public.subscription_payments
  TO authenticated;

COMMENT ON TABLE public.subscription_payments IS
  'Subscription payment ledger. Mutations are restricted to SECURITY DEFINER RPCs to keep coin credits atomic.';

NOTIFY pgrst, 'reload schema';
