-- Subscription delivery tracking update RPC.

DO $$
BEGIN
  IF to_regtype('public.purchase_status') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM pg_enum
        WHERE enumtypid = to_regtype('public.purchase_status')
          AND enumlabel = 'in_transit'
     ) THEN
    ALTER TYPE public.purchase_status ADD VALUE 'in_transit';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_subscription_delivery_delivered_from_tracking(
  p_delivery_id uuid,
  p_delivered_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_delivered_at timestamptz := COALESCE(p_delivered_at, now());
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL THEN
    RAISE EXCEPTION 'Delivery id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_delivery.status::text NOT IN ('shipped', 'in_transit', 'delivered') THEN
    RAISE EXCEPTION 'Delivery is not in a trackable shipped status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_deliveries
     SET status = 'delivered'::public.purchase_status,
         delivered_date = COALESCE(delivered_date, v_delivered_at),
         actual_delivery_date = COALESCE(actual_delivery_date, v_delivered_at),
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  RETURN to_jsonb(v_delivery);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_mark_subscription_delivery_delivered_from_tracking(uuid, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_subscription_delivery_delivered_from_tracking(uuid, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_mark_subscription_delivery_delivered_from_tracking(uuid, timestamptz) IS
  'Admin/service-only tracking callback transition to delivered with carrier delivered timestamp.';

NOTIFY pgrst, 'reload schema';
