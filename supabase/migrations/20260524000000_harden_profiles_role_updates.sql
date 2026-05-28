-- Harden profile role updates against client-side privilege escalation.

CREATE OR REPLACE FUNCTION public.prevent_unsafe_profile_role_change()
RETURNS TRIGGER AS $$
DECLARE
  remaining_admin_count integer;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.role IN ('admin', 'super_admin') AND NEW.role NOT IN ('admin', 'super_admin') THEN
      SELECT count(*)
      INTO remaining_admin_count
      FROM public.profiles
      WHERE id <> OLD.id
        AND role IN ('admin', 'super_admin');

      IF remaining_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last admin';
      END IF;
    END IF;

    -- Service role / trusted backend operations do not have an auth.uid().
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change profile roles';
    END IF;

    IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
      AND public.current_user_role() <> 'super_admin' THEN
      RAISE EXCEPTION 'Only super admins can change a super admin role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS prevent_unsafe_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_unsafe_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unsafe_profile_role_change();

COMMENT ON FUNCTION public.prevent_unsafe_profile_role_change IS
  'Prevents unsafe profile role changes, protects super_admin roles, and keeps at least one admin.';
