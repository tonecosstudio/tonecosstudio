-- Service-role RPCs for Stripe integration write paths.

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.stripe_customers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_payment_intents FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_refunds FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_webhook_events FROM anon, authenticated;

GRANT ALL ON public.stripe_customers TO service_role;
GRANT ALL ON public.stripe_payment_intents TO service_role;
GRANT ALL ON public.stripe_subscriptions TO service_role;
GRANT ALL ON public.stripe_refunds TO service_role;
GRANT ALL ON public.stripe_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.assert_stripe_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.stripe_validate_text(
  p_value text,
  p_field text,
  p_max_length integer,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field USING ERRCODE = '22023';
    END IF;
    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length THEN
    RAISE EXCEPTION '% exceeds maximum length', p_field USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stripe_customer_record(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_email text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stripe_customer_id text := public.stripe_validate_text(p_stripe_customer_id, 'stripe_customer_id', 120, true);
  v_email text := lower(public.stripe_validate_text(p_email, 'email', 320, true));
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required' USING ERRCODE = '22023';
  END IF;

  IF v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'email is invalid' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_customers (
    user_id,
    stripe_customer_id,
    email,
    metadata
  )
  VALUES (
    p_user_id,
    v_stripe_customer_id,
    v_email,
    v_metadata
  )
  ON CONFLICT (user_id) DO UPDATE
    SET stripe_customer_id = EXCLUDED.stripe_customer_id,
        email = EXCLUDED.email,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  RETURN v_stripe_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stripe_payment_intent(
  p_stripe_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_status text,
  p_customer_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_intent_id text := public.stripe_validate_text(p_stripe_payment_intent_id, 'stripe_payment_intent_id', 120, true);
  v_currency text := lower(public.stripe_validate_text(p_currency, 'currency', 10, true));
  v_status text := public.stripe_validate_text(p_status, 'status', 80, true);
  v_customer_id text := public.stripe_validate_text(p_customer_id, 'customer_id', 120, false);
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_id uuid;
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF p_amount IS NULL OR p_amount < 100 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'amount is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_currency <> 'brl' THEN
    RAISE EXCEPTION 'currency is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN (
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'canceled',
    'succeeded',
    'failed'
  ) THEN
    RAISE EXCEPTION 'status is invalid' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_payment_intents (
    stripe_payment_intent_id,
    amount,
    currency,
    status,
    customer_id,
    metadata
  )
  VALUES (
    v_payment_intent_id,
    p_amount,
    v_currency,
    v_status,
    v_customer_id,
    v_metadata
  )
  ON CONFLICT (stripe_payment_intent_id) DO UPDATE
    SET amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        customer_id = EXCLUDED.customer_id,
        metadata = EXCLUDED.metadata,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_stripe_payment_intent_status(
  p_stripe_payment_intent_id text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_intent_id text := public.stripe_validate_text(p_stripe_payment_intent_id, 'stripe_payment_intent_id', 120, true);
  v_status text := public.stripe_validate_text(p_status, 'status', 80, true);
  v_error_message text := public.stripe_validate_text(p_error_message, 'error_message', 1000, false);
  v_id uuid;
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF v_status NOT IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded', 'failed') THEN
    RAISE EXCEPTION 'status is invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.stripe_payment_intents
     SET status = v_status,
         error_message = v_error_message,
         updated_at = now()
   WHERE stripe_payment_intent_id = v_payment_intent_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Stripe payment intent not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stripe_webhook_event(
  p_stripe_event_id text,
  p_event_type text,
  p_event_data jsonb,
  p_processed_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id text := public.stripe_validate_text(p_stripe_event_id, 'stripe_event_id', 120, true);
  v_event_type text := public.stripe_validate_text(p_event_type, 'event_type', 160, true);
  v_event_data jsonb := COALESCE(p_event_data, '{}'::jsonb);
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF jsonb_typeof(v_event_data) <> 'object' THEN
    RAISE EXCEPTION 'event_data must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    event_data,
    processed_at
  )
  VALUES (
    v_event_id,
    v_event_type,
    v_event_data,
    COALESCE(p_processed_at, now())
  )
  ON CONFLICT (stripe_event_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stripe_subscription_record(
  p_stripe_subscription_id text,
  p_customer_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_canceled_at timestamptz,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription_id text := public.stripe_validate_text(p_stripe_subscription_id, 'stripe_subscription_id', 120, true);
  v_customer_id text := public.stripe_validate_text(p_customer_id, 'customer_id', 120, true);
  v_status text := public.stripe_validate_text(p_status, 'status', 80, true);
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_id uuid;
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF v_status NOT IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused') THEN
    RAISE EXCEPTION 'status is invalid' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_subscriptions (
    stripe_subscription_id,
    customer_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    metadata
  )
  VALUES (
    v_subscription_id,
    v_customer_id,
    v_status,
    p_current_period_start,
    p_current_period_end,
    COALESCE(p_cancel_at_period_end, false),
    p_canceled_at,
    v_metadata
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE
    SET customer_id = EXCLUDED.customer_id,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        canceled_at = EXCLUDED.canceled_at,
        metadata = EXCLUDED.metadata,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_stripe_subscription_record(p_stripe_subscription_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription_id text := public.stripe_validate_text(p_stripe_subscription_id, 'stripe_subscription_id', 120, true);
  v_id uuid;
BEGIN
  PERFORM public.assert_stripe_service_role();

  UPDATE public.stripe_subscriptions
     SET updated_at = now()
   WHERE stripe_subscription_id = v_subscription_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Stripe subscription not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stripe_refund_record(
  p_stripe_refund_id text,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_refund_id text := public.stripe_validate_text(p_stripe_refund_id, 'stripe_refund_id', 120, true);
  v_payment_intent_id text := public.stripe_validate_text(p_payment_intent_id, 'payment_intent_id', 120, true);
  v_currency text := lower(public.stripe_validate_text(p_currency, 'currency', 10, true));
  v_status text := public.stripe_validate_text(p_status, 'status', 80, true);
  v_reason text := public.stripe_validate_text(p_reason, 'reason', 80, false);
  v_id uuid;
BEGIN
  PERFORM public.assert_stripe_service_role();

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'amount is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_currency <> 'brl' THEN
    RAISE EXCEPTION 'currency is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN ('pending', 'succeeded', 'failed', 'canceled') THEN
    RAISE EXCEPTION 'status is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_reason IS NOT NULL AND v_reason NOT IN ('duplicate', 'fraudulent', 'requested_by_customer') THEN
    RAISE EXCEPTION 'reason is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_refunds (
    stripe_refund_id,
    payment_intent_id,
    amount,
    currency,
    status,
    reason
  )
  VALUES (
    v_refund_id,
    v_payment_intent_id,
    p_amount,
    v_currency,
    v_status,
    v_reason
  )
  ON CONFLICT (stripe_refund_id) DO UPDATE
    SET payment_intent_id = EXCLUDED.payment_intent_id,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        reason = EXCLUDED.reason,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_stripe_service_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stripe_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_stripe_customer_record(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_stripe_payment_intent(text, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_stripe_payment_intent_status(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_stripe_webhook_event(text, text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_stripe_subscription_record(text, text, text, timestamptz, timestamptz, boolean, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_stripe_subscription_record(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_stripe_refund_record(text, text, integer, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_stripe_customer_record(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_stripe_payment_intent(text, integer, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_stripe_payment_intent_status(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_stripe_webhook_event(text, text, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_stripe_subscription_record(text, text, text, timestamptz, timestamptz, boolean, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_stripe_subscription_record(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_stripe_refund_record(text, text, integer, text, text, text) TO service_role;

COMMENT ON FUNCTION public.record_stripe_payment_intent(text, integer, text, text, text, jsonb) IS
  'Service-role only validated Stripe payment intent record upsert.';
COMMENT ON FUNCTION public.record_stripe_webhook_event(text, text, jsonb, timestamptz) IS
  'Service-role only idempotent Stripe webhook event insert.';

NOTIFY pgrst, 'reload schema';
