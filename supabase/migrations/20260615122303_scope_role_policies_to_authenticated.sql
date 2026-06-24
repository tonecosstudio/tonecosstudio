BEGIN;

-- Role-dependent policies are meaningful only for signed-in users. Scoping
-- them prevents anonymous catalog reads from needing the privileged helper.
DO $do$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY(roles)
      AND concat_ws(' ', qual, with_check) ~* '\mcurrent_user_role\s*\('
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY(roles)
      AND concat_ws(' ', qual, with_check) ~* '\mcurrent_user_role\s*\('
  ) THEN
    RAISE EXCEPTION
      'Role-dependent policies remain exposed to the public database role';
  END IF;
END
$do$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role()
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
