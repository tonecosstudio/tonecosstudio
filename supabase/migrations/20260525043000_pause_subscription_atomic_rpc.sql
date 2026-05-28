-- Atomic subscription pause workflow.
-- Keeps capacity release, delivery removal, schedule shift, and pause counter update in one transaction.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pause_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.subscription_deliveries
  ADD COLUMN IF NOT EXISTS expected_delivery_date timestamptz;

UPDATE public.subscription_deliveries
   SET expected_delivery_date = delivery_date::timestamptz
 WHERE expected_delivery_date IS NULL
   AND delivery_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_delivery_number
  ON public.subscription_deliveries(subscription_id, delivery_number, delivery_order);

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.purchase_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['scheduled', 'pending_choice', 'revealed'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.purchase_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.purchase_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pause_subscription_atomic(
  p_subscription_id uuid,
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription record;
  v_next_delivery record;
  v_pause_count integer;
  v_schedule jsonb;
BEGIN
  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED';
  END IF;

  IF NOT public.is_before_cutoff(p_now) THEN
    RAISE EXCEPTION 'CUTOFF_PASSED';
  END IF;

  SELECT id, user_id, status, COALESCE(pause_count, 0) AS pause_count
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND';
  END IF;

  IF v_subscription.user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_subscription.status::text <> 'active' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_ACTIVE';
  END IF;

  v_pause_count := v_subscription.pause_count;

  IF v_pause_count >= 2 THEN
    RAISE EXCEPTION 'PAUSE_LIMIT_EXCEEDED';
  END IF;

  SELECT id, delivery_number, delivery_order, cycle_id, status
    INTO v_next_delivery
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id
     AND status::text IN ('scheduled', 'pending_choice', 'pending')
   ORDER BY COALESCE(delivery_number, delivery_order, 2147483647), created_at
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_UPCOMING_DELIVERY';
  END IF;

  IF v_next_delivery.cycle_id IS NOT NULL THEN
    PERFORM public.release_capacity(v_next_delivery.cycle_id, 1);
  END IF;

  UPDATE public.subscription_deliveries
     SET expected_delivery_date = COALESCE(expected_delivery_date, delivery_date::timestamptz) + interval '1 month',
         updated_at = now()
   WHERE subscription_id = p_subscription_id
     AND id <> v_next_delivery.id
     AND COALESCE(delivery_number, delivery_order, 2147483647)
       > COALESCE(v_next_delivery.delivery_number, v_next_delivery.delivery_order, -1);

  DELETE FROM public.subscription_deliveries
   WHERE id = v_next_delivery.id;

  UPDATE public.subscriptions
     SET pause_count = v_pause_count + 1,
         updated_at = now()
   WHERE id = p_subscription_id;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id', id,
               'delivery_number', delivery_number,
               'expected_delivery_date', expected_delivery_date,
               'status', status::text
             )
             ORDER BY COALESCE(delivery_number, delivery_order, 2147483647), created_at
           ),
           '[]'::jsonb
         )
    INTO v_schedule
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscriptionId', p_subscription_id,
    'pausedDeliveryId', v_next_delivery.id,
    'pauseCount', v_pause_count + 1,
    'pausesRemaining', GREATEST(2 - (v_pause_count + 1), 0),
    'deliverySchedule', v_schedule
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pause_subscription_atomic(uuid, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pause_subscription_atomic(uuid, uuid, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.pause_subscription_atomic(uuid, uuid, timestamptz) IS
  'Service-role only subscription pause operation with capacity release and schedule mutation in one transaction.';

NOTIFY pgrst, 'reload schema';
