BEGIN;

-- This mutation is reachable only through the admin-promote Edge Function.
-- The Edge Function validates the caller and passes the actor explicitly.
DROP FUNCTION public.admin_set_profile_role(uuid, text);

CREATE FUNCTION public.admin_set_profile_role(
  p_target_user_id uuid,
  p_role text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_role text := lower(btrim(COALESCE(p_role, '')));
  v_admin_count integer;
  v_updated public.profiles%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'ACTOR_USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'TARGET_USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_role NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE id = p_actor_user_id
    AND role IN ('admin', 'super_admin');

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
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRES_SUPER_ADMIN'
      USING ERRCODE = '42501';
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
  SET role = v_role::public.user_role
  WHERE id = v_target.id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'email', v_updated.email,
    'role', v_updated.role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_profile_role(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text, uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_deactivate_collection(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_collection(uuid)
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.admin_delete_images_queue_item(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.admin_delete_images_queue_item(uuid, text, text)
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.admin_insert_user_notification(
    uuid, text, text, text, uuid, text, text
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.admin_insert_user_notification(
    uuid, text, text, text, uuid, text, text
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.admin_update_subscription_delivery_status(
    uuid, text, text, text, text, boolean, uuid
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.admin_update_subscription_delivery_status(
    uuid, text, text, text, text, boolean, uuid
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.admin_verify_subscription_payment_voucher(
    uuid, boolean, text, text, uuid
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.admin_verify_subscription_payment_voucher(
    uuid, boolean, text, text, uuid
  )
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
