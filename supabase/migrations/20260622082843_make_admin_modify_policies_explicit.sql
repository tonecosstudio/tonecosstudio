-- Make admin-only mutation policies explicit on both row visibility and row writes.
-- This avoids relying on implicit WITH CHECK behavior for FOR ALL policies.

DROP POLICY IF EXISTS manual_payments_modify_admin ON public.manual_payments;

CREATE POLICY manual_payments_modify_admin
  ON public.manual_payments
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.current_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
    )
  )
  WITH CHECK (
    (SELECT public.current_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
    )
  );

DROP POLICY IF EXISTS subscriptions_modify_admin ON public.subscriptions;

CREATE POLICY subscriptions_modify_admin
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.current_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
    )
  )
  WITH CHECK (
    (SELECT public.current_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
    )
  );

COMMENT ON POLICY manual_payments_modify_admin ON public.manual_payments IS
  'Admin-only manual payment mutations with explicit write check.';
COMMENT ON POLICY subscriptions_modify_admin ON public.subscriptions IS
  'Admin-only subscription mutations with explicit write check.';
