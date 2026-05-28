-- Admin subscription delivery status RPC
-- Moves delivery status mutation, timestamp updates, and admin action logging
-- behind a single database boundary.

CREATE OR REPLACE FUNCTION public.admin_is_valid_subscription_delivery_transition(
  p_current_status text,
  p_new_status text,
  p_allow_same_status boolean DEFAULT false,
  p_allow_reverse boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current text := NULLIF(btrim(COALESCE(p_current_status, '')), '');
  v_new text := NULLIF(btrim(COALESCE(p_new_status, '')), '');
BEGIN
  IF p_allow_same_status AND v_current = v_new THEN
    RETURN true;
  END IF;

  IF v_current IS NULL OR v_new IS NULL THEN
    RETURN false;
  END IF;

  IF (v_current = 'pending' AND v_new IN ('scheduled', 'pending_choice', 'confirmed', 'cancelled'))
    OR (v_current = 'scheduled' AND v_new IN ('pending_choice', 'confirmed', 'cancelled'))
    OR (v_current = 'pending_choice' AND v_new IN ('confirmed', 'cancelled'))
    OR (v_current = 'confirmed' AND v_new IN ('in_production', 'cancelled'))
    OR (v_current = 'in_production' AND v_new IN ('shipped', 'cancelled'))
    OR (v_current = 'shipped' AND v_new = 'delivered')
    OR (v_current = 'delivered' AND v_new = 'revealed') THEN
    RETURN true;
  END IF;

  IF COALESCE(p_allow_reverse, true) AND (
    (v_current = 'pending_choice' AND v_new IN ('scheduled', 'pending'))
    OR (v_current = 'confirmed' AND v_new IN ('pending_choice', 'scheduled', 'pending'))
    OR (v_current = 'in_production' AND v_new = 'confirmed')
    OR (v_current = 'shipped' AND v_new = 'in_production')
    OR (v_current = 'delivered' AND v_new = 'shipped')
    OR (v_current = 'revealed' AND v_new = 'delivered')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription_delivery_status(
  p_delivery_id uuid,
  p_status text,
  p_tracking_code text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_action_type text DEFAULT 'status_update',
  p_allow_same_status boolean DEFAULT false,
  p_admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_updated public.subscription_deliveries%ROWTYPE;
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_tracking_code text := NULLIF(upper(btrim(COALESCE(p_tracking_code, ''))), '');
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_action_type text := COALESCE(NULLIF(btrim(p_action_type), ''), 'status_update');
  v_previous_status text;
  v_previous_tracking_code text;
  v_now timestamptz := now();
  v_admin_user_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(auth.role(), '') = 'service_role' THEN
    v_admin_user_id := COALESCE(p_admin_user_id, auth.uid());
  ELSE
    v_admin_user_id := auth.uid();
  END IF;

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_delivery_id IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN (
    'scheduled',
    'pending_choice',
    'confirmed',
    'in_production',
    'shipped',
    'delivered',
    'revealed',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_STATUS:%', COALESCE(v_status, '') USING ERRCODE = '22023';
  END IF;

  IF v_tracking_code IS NOT NULL
     AND (length(v_tracking_code) < 6
       OR length(v_tracking_code) > 32
       OR v_tracking_code !~ '^[A-Z0-9][A-Z0-9 -]{5,31}$') THEN
    RAISE EXCEPTION 'INVALID_TRACKING_CODE' USING ERRCODE = '22023';
  END IF;

  IF v_notes IS NOT NULL AND (length(v_notes) > 1000 OR v_notes ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'INVALID_NOTES' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_previous_status := v_delivery.status::text;
  v_previous_tracking_code := v_delivery.tracking_code;

  IF NOT public.admin_is_valid_subscription_delivery_transition(
    v_previous_status,
    v_status,
    COALESCE(p_allow_same_status, false)
      AND v_tracking_code IS NOT NULL
      AND v_tracking_code IS DISTINCT FROM v_previous_tracking_code,
    true
  ) THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION:%:%', v_previous_status, v_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_deliveries
     SET status = v_status::public.purchase_status,
         tracking_code = COALESCE(v_tracking_code, tracking_code),
         shipping_date = CASE
           WHEN v_status = 'shipped' THEN COALESCE(shipping_date, v_now)
           ELSE shipping_date
         END,
         delivered_date = CASE
           WHEN v_status = 'delivered' THEN COALESCE(delivered_date, v_now)
           ELSE delivered_date
         END,
         actual_delivery_date = CASE
           WHEN v_status = 'delivered' THEN COALESCE(actual_delivery_date, v_now)
           ELSE actual_delivery_date
         END,
         reveal_date = CASE
           WHEN v_status = 'revealed' THEN COALESCE(reveal_date, v_now)
           ELSE reveal_date
         END,
         updated_at = v_now
   WHERE id = p_delivery_id
   RETURNING * INTO v_updated;

  INSERT INTO public.admin_action_logs (
    delivery_id,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes,
    created_at
  )
  VALUES (
    p_delivery_id,
    v_admin_user_id,
    v_action_type,
    v_previous_status,
    v_status,
    v_notes,
    v_now
  );

  RETURN jsonb_build_object(
    'delivery', to_jsonb(v_updated),
    'previousStatus', v_previous_status,
    'newStatus', v_status,
    'trackingCodeAdded',
      v_previous_tracking_code IS NULL
      AND v_updated.tracking_code IS NOT NULL,
    'trackingCodeChanged',
      v_updated.tracking_code IS DISTINCT FROM v_previous_tracking_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_is_valid_subscription_delivery_transition(text, text, boolean, boolean)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_subscription_delivery_status(uuid, text, text, text, text, boolean, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_is_valid_subscription_delivery_transition(text, text, boolean, boolean)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_delivery_status(uuid, text, text, text, text, boolean, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_update_subscription_delivery_status(uuid, text, text, text, text, boolean, uuid) IS
  'Admin-only subscription delivery status update with validation, timestamps, tracking code support, and action log.';
