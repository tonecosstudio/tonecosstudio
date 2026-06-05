-- Subscription payment reference SSOT for coin credits.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.subscription_payments
    WHERE external_reference IS NOT NULL
    GROUP BY lower(btrim(payment_method)), lower(btrim(external_reference))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SUBSCRIPTION_PAYMENT_REFERENCES_EXIST'
      USING ERRCODE = '23505';
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_subscription_payments_external_reference;
CREATE UNIQUE INDEX idx_subscription_payments_external_reference
  ON public.subscription_payments(lower(btrim(payment_method)), lower(btrim(external_reference)))
  WHERE external_reference IS NOT NULL;

ALTER TABLE public.subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_external_reference_required,
  ADD CONSTRAINT subscription_payments_external_reference_required
    CHECK (external_reference IS NOT NULL AND btrim(external_reference) <> '')
    NOT VALID;

CREATE OR REPLACE FUNCTION public.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  v_external_reference text := left(NULLIF(btrim(COALESCE(p_external_reference, '')), ''), 255);
  v_subscription record;
  v_payment public.subscription_payments%ROWTYPE;
  v_coins integer;
  v_balance jsonb;
  v_new_balance integer := 0;
  v_next_billing_date timestamptz;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF v_payment_method NOT IN ('pix', 'credit_card', 'boleto', 'manual') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;

  IF v_external_reference IS NULL THEN
    RAISE EXCEPTION 'EXTERNAL_REFERENCE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_external_reference ~ '[<>]' THEN
    RAISE EXCEPTION 'INVALID_EXTERNAL_REFERENCE' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('subscription_payment'),
    hashtext(v_payment_method || ':' || lower(v_external_reference))
  );

  IF EXISTS (
    SELECT 1
    FROM public.subscription_payments existing_payment
    WHERE lower(btrim(existing_payment.payment_method)) = v_payment_method
      AND lower(btrim(existing_payment.external_reference)) = lower(v_external_reference)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SUBSCRIPTION_PAYMENT' USING ERRCODE = '23505';
  END IF;

  SELECT
    s.*,
    sp.total_credits AS plan_total_credits
    INTO v_subscription
    FROM public.subscriptions s
    LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id
   WHERE s.id = p_subscription_id
   FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.status::text IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_STATUS:%', v_subscription.status USING ERRCODE = '22023';
  END IF;

  v_coins := COALESCE(
    NULLIF(v_subscription.coins_per_month, 0),
    NULLIF(v_subscription.plan_total_credits, 0),
    CASE v_subscription.plan_type
      WHEN 'anual' THEN 2800
      WHEN 'semestral' THEN 1300
      WHEN 'trimestral' THEN 600
      ELSE 0
    END
  );

  IF v_coins <= 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_next_billing_date := CASE v_subscription.plan_type
    WHEN 'bimestral' THEN now() + interval '2 months'
    WHEN 'trimestral' THEN now() + interval '3 months'
    WHEN 'semestral' THEN now() + interval '6 months'
    WHEN 'anual' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  INSERT INTO public.subscription_payments (
    subscription_id,
    user_id,
    amount,
    status,
    payment_method,
    external_reference,
    coins_credited,
    paid_at
  )
  VALUES (
    p_subscription_id,
    v_subscription.user_id,
    p_amount,
    'approved',
    v_payment_method,
    v_external_reference,
    v_coins,
    now()
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET status = 'active',
         payment_status = 'paid',
         started_at = COALESCE(started_at, now()),
         next_billing_date = v_next_billing_date,
         coins_per_month = v_coins,
         total_coins_received = COALESCE(total_coins_received, 0) + v_coins,
         updated_at = now()
   WHERE id = p_subscription_id;

  v_balance := public.admin_add_coins_to_user(
    v_subscription.user_id,
    v_coins,
    concat('Credito de assinatura - ', COALESCE(v_subscription.plan_type, 'plano')),
    v_payment.id::text,
    'subscription_payment'
  );

  v_new_balance := COALESCE((v_balance->>'new_balance')::integer, 0);

  RETURN jsonb_build_object(
    'success', true,
    'payment', to_jsonb(v_payment),
    'coins_credited', v_coins,
    'new_balance', v_new_balance,
    'message', concat('Pagamento aprovado. Coins creditados: ', v_coins)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text) IS
  'Admin-only atomic subscription payment approval with required unique external reference and coin crediting.';

NOTIFY pgrst, 'reload schema';
