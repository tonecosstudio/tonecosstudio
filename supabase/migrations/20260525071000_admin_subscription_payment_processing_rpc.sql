-- Admin subscription payment processing RPCs.
-- Moves subscription payment approval and manual coin adjustments out of the
-- client and into admin-guarded database functions.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS total_credits integer DEFAULT 0;

UPDATE public.subscription_plans
   SET total_credits = CASE
         WHEN COALESCE(total_credits, 0) > 0 THEN total_credits
         WHEN plan_type = 'anual' THEN 2800
         WHEN plan_type = 'semestral' THEN 1300
         WHEN plan_type = 'trimestral' THEN 600
         ELSE GREATEST(COALESCE(deliveries_total, 0), 1) * 200
       END
 WHERE COALESCE(total_credits, 0) = 0;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS coins_per_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coins_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz;

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'approved',
  payment_method text NOT NULL,
  external_reference text,
  coins_credited integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id
  ON public.subscription_payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id
  ON public.subscription_payments(user_id);

DROP POLICY IF EXISTS "subscription_payments_select_own" ON public.subscription_payments;
CREATE POLICY "subscription_payments_select_own"
  ON public.subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscription_payments_select_admin" ON public.subscription_payments;
CREATE POLICY "subscription_payments_select_admin"
  ON public.subscription_payments FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "subscription_payments_modify_admin" ON public.subscription_payments;
CREATE POLICY "subscription_payments_modify_admin"
  ON public.subscription_payments FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

CREATE OR REPLACE FUNCTION public.admin_add_coins_to_user(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT 'admin_adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_description text := left(NULLIF(btrim(COALESCE(p_description, '')), ''), 500);
  v_reference_type text := left(NULLIF(btrim(COALESCE(p_reference_type, '')), ''), 80);
  v_reference_uuid uuid;
  v_balance integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_COINS_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NULL THEN
    RAISE EXCEPTION 'COINS_DESCRIPTION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_reference_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_reference_uuid := p_reference_id::uuid;
  END IF;

  INSERT INTO public.user_coins (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_coins.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'adjustment',
    v_description,
    v_reference_uuid,
    v_reference_type,
    v_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'amount', p_amount,
    'new_balance', v_balance
  );
END;
$$;

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

  IF v_external_reference IS NOT NULL AND v_external_reference ~ '[<>]' THEN
    RAISE EXCEPTION 'INVALID_EXTERNAL_REFERENCE' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text) IS
  'Admin-only coin credit adjustment with balance transaction logging.';
COMMENT ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text) IS
  'Admin-only atomic subscription payment approval, subscription activation, and coin crediting.';

NOTIFY pgrst, 'reload schema';
