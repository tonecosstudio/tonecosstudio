-- Admin collection deactivation RPC.
-- Keeps active-delivery checks and soft deactivation in a single database
-- boundary for legacy Edge callers.

CREATE OR REPLACE FUNCTION public.admin_deactivate_collection(p_collection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collection public.collections%ROWTYPE;
  v_updated public.collections%ROWTYPE;
  v_active_deliveries integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'COLLECTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_collection.is_active THEN
    RAISE EXCEPTION 'COLLECTION_ALREADY_INACTIVE' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_active_deliveries
    FROM public.subscription_deliveries
   WHERE collection_id = p_collection_id
     AND status::text IN (
       'pending',
       'scheduled',
       'pending_choice',
       'confirmed',
       'in_production',
       'shipped'
     );

  IF v_active_deliveries > 0 THEN
    RAISE EXCEPTION 'COLLECTION_HAS_ACTIVE_DELIVERIES:%', v_active_deliveries USING ERRCODE = '22023';
  END IF;

  UPDATE public.collections
     SET is_active = false,
         updated_at = now()
   WHERE id = p_collection_id
   RETURNING * INTO v_updated;

  RETURN public.admin_collection_row_json(v_updated)
    || jsonb_build_object('activeDeliveriesCount', v_active_deliveries);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_deactivate_collection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_collection(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_deactivate_collection(uuid) IS
  'Admin-only collection soft deactivation with active delivery protection.';

NOTIFY pgrst, 'reload schema';
