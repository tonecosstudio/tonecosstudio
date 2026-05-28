-- Customer subscription mutation RPCs.
-- Replaces legacy client-side subscription creation with an authenticated
-- database boundary. Cancellation remains routed through the existing Edge
-- Function because it requires service-role capacity maintenance.

CREATE OR REPLACE FUNCTION public.create_pending_subscription_for_current_user(
  p_plan_type text,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_type text := lower(NULLIF(btrim(COALESCE(p_plan_type, '')), ''));
  v_payment_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  v_plan record;
  v_subscription public.subscriptions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_plan_type NOT IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PLAN_TYPE' USING ERRCODE = '22023';
  END IF;

  IF v_payment_method NOT IN ('pix', 'credit_card', 'boleto') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;

  SELECT id, plan_type, billing_interval, price_full, price, deliveries_total
    INTO v_plan
    FROM public.subscription_plans
   WHERE is_active = true
     AND (
       plan_type = v_plan_type
       OR billing_interval = v_plan_type
       OR slug = v_plan_type
     )
   ORDER BY display_order ASC, created_at ASC, id ASC
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.subscriptions
     WHERE user_id = v_user_id
       AND status::text IN ('active', 'pending_payment')
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ALREADY_EXISTS' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    plan_type,
    status,
    payment_status,
    payment_method,
    total_paid,
    deliveries_total
  )
  VALUES (
    v_user_id,
    v_plan.id,
    COALESCE(v_plan.plan_type, v_plan.billing_interval, v_plan_type),
    'pending_payment',
    'pending',
    v_payment_method,
    COALESCE(v_plan.price_full, v_plan.price, 0)::numeric,
    COALESCE(v_plan.deliveries_total, 0)
  )
  RETURNING * INTO v_subscription;

  RETURN to_jsonb(v_subscription);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_subscription_for_current_user(text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_pending_subscription_for_current_user(text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.create_pending_subscription_for_current_user(text, text) IS
  'Creates a pending subscription for the authenticated user after plan and payment-method validation.';

NOTIFY pgrst, 'reload schema';
