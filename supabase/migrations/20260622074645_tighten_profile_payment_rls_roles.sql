-- Tighten profile/payment RLS policy roles and make profile UPDATE checks explicit.
-- Data is unchanged; this only narrows policy applicability and prevents future
-- column-grant drift from becoming an identity/role escalation path.

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;

CREATE POLICY profiles_update_policy
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.uid()) = id)
    OR ((SELECT public.current_user_role()) = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))
  )
  WITH CHECK (
    ((SELECT auth.uid()) = id)
    OR ((SELECT public.current_user_role()) = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))
  );

DROP POLICY IF EXISTS payment_files_select_own ON public.payment_files;

CREATE POLICY payment_files_select_own
  ON public.payment_files
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.manual_payments mp
       WHERE mp.id = payment_files.payment_id
         AND mp.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS subscription_payments_select_own ON public.subscription_payments;

CREATE POLICY subscription_payments_select_own
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;

CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY profiles_update_policy ON public.profiles IS
  'Users can update their own editable profile columns; admins can update any profile. WITH CHECK prevents identity drift.';
COMMENT ON POLICY payment_files_select_own ON public.payment_files IS
  'Authenticated users can read payment files they uploaded or files attached to their own manual payments.';
COMMENT ON POLICY subscription_payments_select_own ON public.subscription_payments IS
  'Authenticated users can read their own subscription payments.';
COMMENT ON POLICY subscriptions_select_own ON public.subscriptions IS
  'Authenticated users can read their own subscriptions.';
