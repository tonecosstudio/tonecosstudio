-- Admin profile role RPCs.
-- Centralizes role mutations used by admin-promote and bootstrap-admin Edge
-- Functions.

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(
  p_target_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_role text := lower(btrim(COALESCE(p_role, '')));
  v_admin_count integer;
  v_updated public.profiles%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'TARGET_USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_role NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_actor
    FROM public.profiles
   WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_target
    FROM public.profiles
   WHERE id = p_target_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TARGET_PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_target.role = 'super_admin' AND v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRES_SUPER_ADMIN' USING ERRCODE = '42501';
  END IF;

  IF v_role = 'customer' AND v_target.role IN ('admin', 'super_admin') THEN
    SELECT count(*)
      INTO v_admin_count
      FROM public.profiles
     WHERE id <> v_target.id
       AND role IN ('admin', 'super_admin');

    IF v_admin_count <= 0 THEN
      RAISE EXCEPTION 'CANNOT_REMOVE_LAST_ADMIN' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.profiles
     SET role = v_role
   WHERE id = v_target.id
   RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'email', v_updated.email,
    'role', v_updated.role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_count integer;
  v_updated public.profiles%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_admin_count
    FROM public.profiles
   WHERE role IN ('admin', 'super_admin');

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'ADMIN_ALREADY_EXISTS' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
     SET role = 'admin'
   WHERE id = p_user_id
   RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'email', v_updated.email,
    'role', v_updated.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO service_role;

COMMENT ON FUNCTION public.admin_set_profile_role(uuid, text) IS
  'Admin-only profile role update with super admin and last-admin protections.';
COMMENT ON FUNCTION public.bootstrap_first_admin(uuid) IS
  'Service-role-only bootstrap for the first admin profile.';

NOTIFY pgrst, 'reload schema';
