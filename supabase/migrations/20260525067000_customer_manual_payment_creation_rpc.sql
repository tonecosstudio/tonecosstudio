-- Customer manual payment creation RPC.
-- Authenticated users can create their own pending manual payments only after
-- ownership and payment-method checks pass at the database boundary.

CREATE SEQUENCE IF NOT EXISTS public.payment_reference_seq;

CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reference text;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_reference := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad((nextval('public.payment_reference_seq') % 10000)::text, 4, '0');

    IF NOT EXISTS (
      SELECT 1
        FROM public.manual_payments
       WHERE reference_number = v_reference
    ) THEN
      RETURN v_reference;
    END IF;

    IF v_attempts >= 10000 THEN
      RAISE EXCEPTION 'PAYMENT_REFERENCE_EXHAUSTED' USING ERRCODE = '54000';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_manual_payment_for_current_user(
  p_payment_method_id uuid,
  p_quote_id uuid DEFAULT NULL,
  p_subscription_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT 'BRL',
  p_payment_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_currency text := upper(NULLIF(btrim(COALESCE(p_currency, 'BRL')), ''));
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_reference text;
  v_payment public.manual_payments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_payment_method_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF v_payment_type NOT IN ('one_time', 'recurring') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TYPE' USING ERRCODE = '22023';
  END IF;

  IF v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_CURRENCY' USING ERRCODE = '22023';
  END IF;

  IF (p_quote_id IS NULL AND p_subscription_id IS NULL)
    OR (p_quote_id IS NOT NULL AND p_subscription_id IS NOT NULL) THEN
    RAISE EXCEPTION 'PAYMENT_LINK_TARGET_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.admin_payment_methods
     WHERE id = p_payment_method_id
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_quote_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.quotes
     WHERE id = p_quote_id
       AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_QUOTE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_subscription_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.subscriptions
     WHERE id = p_subscription_id
       AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_reference := public.generate_payment_reference();

  INSERT INTO public.manual_payments (
    reference_number,
    user_id,
    payment_method_id,
    quote_id,
    subscription_id,
    amount,
    currency,
    payment_type,
    status
  )
  VALUES (
    v_reference,
    v_user_id,
    p_payment_method_id,
    p_quote_id,
    p_subscription_id,
    p_amount,
    v_currency,
    v_payment_type,
    'pending'
  )
  RETURNING * INTO v_payment;

  RETURN to_jsonb(v_payment);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_payment_reference() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_payment_reference() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) IS
  'Creates a pending manual payment for the authenticated user after ownership checks.';

NOTIFY pgrst, 'reload schema';
