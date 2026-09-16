-- Reconcile canonical delivery-choice integrity in production.
-- This supersedes the unapplied 20260831051000_harden_delivery_choice_integrity.sql
-- migration and preserves customer ownership/cutoff validation while enforcing
-- active collection and collection-character consistency.

CREATE OR REPLACE FUNCTION private_api.change_delivery_character_for_current_user(
  p_delivery_id uuid,
  p_character_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_subscription_user_id uuid;
  v_cycle_status text;
  v_collection_character_id uuid;
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(private_api.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF p_delivery_id IS NULL OR p_character_id IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_AND_CHARACTER_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.user_id, c.status::text
    INTO v_subscription_user_id, v_cycle_status
    FROM public.subscriptions s
    LEFT JOIN public.cycles c ON c.id = v_delivery.cycle_id
   WHERE s.id = v_delivery.subscription_id;

  IF v_subscription_user_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_admin AND v_subscription_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(v_cycle_status, '') NOT IN ('open', 'active', 'sales') THEN
    RAISE EXCEPTION 'CHARACTER_CHANGE_NOT_ALLOWED_FOR_CYCLE' USING ERRCODE = '22023';
  END IF;

  IF v_delivery.collection_id IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_COLLECTION_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.collections c
     WHERE c.id = v_delivery.collection_id
       AND c.is_active IS TRUE
       AND c.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'DELIVERY_COLLECTION_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;

  SELECT cc.id
    INTO v_collection_character_id
    FROM public.collection_characters cc
    JOIN public.characters ch
      ON ch.id = cc.character_id
     AND ch.collection_id = cc.collection_id
   WHERE cc.collection_id = v_delivery.collection_id
     AND cc.character_id = p_character_id
     AND ch.id = p_character_id
   LIMIT 1;

  IF v_collection_character_id IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_NOT_AVAILABLE_IN_DELIVERY_COLLECTION' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_deliveries
     SET character_id = p_character_id,
         collection_character_id = v_collection_character_id,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  RETURN to_jsonb(v_delivery);
END;
$$;

CREATE OR REPLACE FUNCTION private_api.change_delivery_collection_choice_for_current_user(
  p_delivery_id uuid,
  p_new_collection_id uuid,
  p_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_ip_address text := public.delivery_cycle_validate_text(p_ip_address, 'ip address', 80, false);
  v_user_agent text := public.delivery_cycle_validate_text(p_user_agent, 'user agent', 500, false);
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_previous_collection_id uuid;
  v_history public.collection_choice_history%ROWTYPE;
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(private_api.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF p_delivery_id IS NULL OR p_new_collection_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_COLLECTION_AND_USER_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_before_cutoff() THEN
    RAISE EXCEPTION 'CUTOFF_PASSED' USING ERRCODE = '22023';
  END IF;

  SELECT sd.*
    INTO v_delivery
    FROM public.subscription_deliveries sd
   WHERE sd.id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = v_delivery.subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_delivery.status::text NOT IN ('pending_choice', 'confirmed') THEN
    RAISE EXCEPTION 'DELIVERY_STATUS_DOES_NOT_ALLOW_COLLECTION_CHANGE' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.collections c
     WHERE c.id = p_new_collection_id
       AND c.is_active IS TRUE
       AND c.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'COLLECTION_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;

  v_previous_collection_id := v_delivery.collection_id;

  UPDATE public.subscription_deliveries
     SET collection_id = p_new_collection_id,
         character_id = CASE
           WHEN v_previous_collection_id IS DISTINCT FROM p_new_collection_id THEN NULL
           ELSE character_id
         END,
         collection_character_id = CASE
           WHEN v_previous_collection_id IS DISTINCT FROM p_new_collection_id THEN NULL
           ELSE collection_character_id
         END,
         auto_maintained = false,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

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
    v_previous_collection_id,
    p_new_collection_id,
    'manual',
    v_is_admin,
    CASE WHEN v_is_admin AND auth.uid() IS NOT NULL THEN auth.uid() ELSE NULL END,
    v_ip_address,
    v_user_agent
  )
  RETURNING * INTO v_history;

  RETURN jsonb_build_object(
    'delivery', to_jsonb(v_delivery),
    'history', to_jsonb(v_history)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_automatic_delivery_maintenance(
  p_delivery_id uuid,
  p_subscription_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.subscription_deliveries%ROWTYPE;
  v_previous public.subscription_deliveries%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_collection_is_active boolean;
  v_history_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL OR p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_AND_SUBSCRIPTION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_current
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
     AND subscription_id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_current.delivery_number, v_current.delivery_order, 1) <= 1 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'first_delivery');
  END IF;

  SELECT *
    INTO v_previous
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id
     AND COALESCE(delivery_number, delivery_order) = COALESCE(v_current.delivery_number, v_current.delivery_order) - 1
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_previous.collection_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'previous_collection_missing');
  END IF;

  SELECT c.is_active IS TRUE AND c.status::text = 'active'
    INTO v_collection_is_active
    FROM public.collections c
   WHERE c.id = v_previous.collection_id;

  IF v_collection_is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'previous_collection_inactive',
      'previousCollectionId', v_previous.collection_id
    );
  END IF;

  UPDATE public.subscription_deliveries
     SET collection_id = v_previous.collection_id,
         character_id = NULL,
         collection_character_id = NULL,
         auto_maintained = true,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_current;

  INSERT INTO public.collection_choice_history (
    delivery_id,
    user_id,
    previous_collection_id,
    new_collection_id,
    change_reason,
    changed_by_admin,
    admin_user_id
  )
  VALUES (
    p_delivery_id,
    v_subscription.user_id,
    NULL,
    v_previous.collection_id,
    'automatic_maintenance',
    false,
    NULL
  )
  RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'applied', true,
    'delivery', to_jsonb(v_current),
    'historyId', v_history_id
  );
END;
$$;

COMMENT ON FUNCTION private_api.change_delivery_character_for_current_user(uuid, uuid) IS
  'Authenticated delivery-character mutation with ownership, active collection, cycle, and collection-character integrity checks.';
COMMENT ON FUNCTION private_api.change_delivery_collection_choice_for_current_user(uuid, uuid, uuid, text, text) IS
  'Authenticated collection-choice mutation with ownership and explicit active-state validation; changing collection clears stale character references.';

NOTIFY pgrst, 'reload schema';
