-- Atomic subscription cancellation workflow.
-- Keeps ownership checks, subscription mutation, delivery cancellation, and
-- capacity release in one database transaction.

CREATE OR REPLACE FUNCTION public.cancel_subscription_atomic(
  p_subscription_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription record;
  v_reason text := left(NULLIF(btrim(COALESCE(p_reason, '')), ''), 500);
  v_delivery record;
  v_before_cutoff boolean;
  v_cancelled_deliveries integer := 0;
  v_capacity_released integer := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT id, user_id, status, deliveries_completed
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_subscription.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'ALREADY_CANCELLED' USING ERRCODE = '22023';
  END IF;

  v_before_cutoff := public.is_before_cutoff();

  FOR v_delivery IN
    SELECT id, cycle_id, status
      FROM public.subscription_deliveries
     WHERE subscription_id = p_subscription_id
       AND status::text IN ('pending', 'scheduled', 'pending_choice', 'confirmed')
     FOR UPDATE
  LOOP
    v_cancelled_deliveries := v_cancelled_deliveries + 1;

    IF v_before_cutoff AND v_delivery.cycle_id IS NOT NULL THEN
      PERFORM public.release_capacity(v_delivery.cycle_id, 1);
      v_capacity_released := v_capacity_released + 1;
    END IF;
  END LOOP;

  UPDATE public.subscriptions
     SET status = 'cancelled',
         cancelled_at = now(),
         notes = CASE
           WHEN v_reason IS NULL THEN NULL
           ELSE 'Motivo do cancelamento: ' || v_reason
         END,
         updated_at = now()
   WHERE id = p_subscription_id;

  UPDATE public.subscription_deliveries
     SET status = 'cancelled',
         updated_at = now()
   WHERE subscription_id = p_subscription_id
     AND status::text IN ('pending', 'scheduled', 'pending_choice', 'confirmed');

  RETURN jsonb_build_object(
    'success', true,
    'subscriptionId', p_subscription_id,
    'deliveriesCompleted', COALESCE(v_subscription.deliveries_completed, 0),
    'cancelledDeliveries', v_cancelled_deliveries,
    'capacityReleased', v_capacity_released,
    'beforeCutoff', v_before_cutoff
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_subscription_atomic(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_atomic(uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.cancel_subscription_atomic(uuid, uuid, text) IS
  'Service-role only subscription cancellation with ownership validation and capacity release.';

NOTIFY pgrst, 'reload schema';
