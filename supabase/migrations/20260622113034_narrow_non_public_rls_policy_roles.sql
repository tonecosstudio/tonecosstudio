-- Narrow RLS policy roles so `public` is reserved for intentional anonymous reads.
-- Policies on tables without anon grants are authentication/admin boundaries, not public API.

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT p.tablename, p.policyname
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.roles::text LIKE '%public%'
       AND NOT EXISTS (
         SELECT 1
           FROM information_schema.table_privileges tp
          WHERE tp.table_schema = 'public'
            AND tp.table_name = p.tablename
            AND tp.grantee = 'anon'
       )
       AND NOT (
         p.tablename = 'payment_verification_audit_logs'
         AND p.policyname = 'payment_verification_audit_logs_insert_service'
       )
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I TO authenticated',
      v_policy.policyname,
      v_policy.tablename
    );
  END LOOP;
END;
$$;

ALTER POLICY payment_verification_audit_logs_insert_service
  ON public.payment_verification_audit_logs
  TO service_role;

ALTER POLICY holidays_mutate_admin_service
  ON public.holidays
  TO authenticated, service_role;

ALTER POLICY purchase_modes_modify_admin
  ON public.purchase_modes
  TO authenticated, service_role;
