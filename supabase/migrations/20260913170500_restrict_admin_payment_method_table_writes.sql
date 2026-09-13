BEGIN;

-- Payment method mutations are validated by the admin-payment-methods Edge
-- Function and its service-role-only RPCs. Keep direct authenticated reads, but
-- remove the legacy PostgREST write authority that could bypass validation.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.admin_payment_methods
  FROM authenticated;

DROP POLICY IF EXISTS "Admins can manage payment methods"
  ON public.admin_payment_methods;

DROP POLICY IF EXISTS "Admins can view all payment methods"
  ON public.admin_payment_methods;
CREATE POLICY "Admins can view all payment methods"
  ON public.admin_payment_methods
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'super_admin'));

GRANT SELECT ON TABLE public.admin_payment_methods TO authenticated;

COMMIT;
