-- Audit mutation RPCs.
-- Removes direct client inserts into audit/history tables.

CREATE OR REPLACE FUNCTION public.record_collection_choice_change(
  p_delivery_id uuid,
  p_user_id uuid,
  p_previous_collection_id uuid,
  p_new_collection_id uuid,
  p_change_reason text,
  p_changed_by_admin boolean DEFAULT false,
  p_admin_user_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text := public.delivery_cycle_validate_text(p_change_reason, 'change reason', 40);
  v_ip_address text := public.delivery_cycle_validate_text(p_ip_address, 'ip address', 80, false);
  v_user_agent text := public.delivery_cycle_validate_text(p_user_agent, 'user agent', 500, false);
  v_history public.collection_choice_history%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL OR p_user_id IS NULL OR p_new_collection_id IS NULL THEN
    RAISE EXCEPTION 'Delivery, user, and new collection are required' USING ERRCODE = '22023';
  END IF;

  IF v_reason NOT IN ('manual', 'automatic_maintenance', 'admin_override') THEN
    RAISE EXCEPTION 'Invalid change reason' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.subscription_deliveries sd
      JOIN public.subscriptions s ON s.id = sd.subscription_id
     WHERE sd.id = p_delivery_id
       AND s.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Delivery does not belong to user' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.collection_choice_history (
    delivery_id,
    user_id,
    previous_collection_id,
    new_collection_id,
    change_reason,
    changed_by_admin,
    admin_user_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_delivery_id,
    p_user_id,
    p_previous_collection_id,
    p_new_collection_id,
    v_reason,
    COALESCE(p_changed_by_admin, false),
    CASE WHEN COALESCE(p_changed_by_admin, false) THEN COALESCE(p_admin_user_id, auth.uid()) ELSE NULL END,
    v_ip_address,
    v_user_agent
  )
  RETURNING * INTO v_history;

  RETURN to_jsonb(v_history);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_collection_choice_change(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  uuid,
  text,
  text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_collection_choice_change(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  uuid,
  text,
  text
) TO authenticated, service_role;

COMMENT ON FUNCTION public.record_collection_choice_change(uuid, uuid, uuid, uuid, text, boolean, uuid, text, text) IS
  'Admin/service-only collection choice audit insertion with ownership and payload validation.';

NOTIFY pgrst, 'reload schema';
