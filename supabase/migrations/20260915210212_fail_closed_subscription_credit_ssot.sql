BEGIN;

-- Subscription credits are financial-like entitlements. Never derive them from
-- plan names/types or hardcoded historical values during payment approval.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS total_credits integer,
  ADD COLUMN IF NOT EXISTS coins_included integer DEFAULT 0;

-- Reconcile existing persisted plan data without inventing credit amounts. If
-- exactly one canonical column already has a positive value, copy it to the
-- other. If both are populated and disagree, fail closed for manual review.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.subscription_plans
     WHERE COALESCE(total_credits, 0) < 0
        OR COALESCE(coins_included, 0) < 0
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INVALID' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.subscription_plans
     WHERE COALESCE(total_credits, 0) > 0
       AND COALESCE(coins_included, 0) > 0
       AND total_credits <> coins_included
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INCONSISTENT' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_plans
     SET coins_included = total_credits
   WHERE COALESCE(total_credits, 0) > 0
     AND COALESCE(coins_included, 0) = 0;

  UPDATE public.subscription_plans
     SET total_credits = coins_included
   WHERE COALESCE(coins_included, 0) > 0
     AND COALESCE(total_credits, 0) = 0;
END
$$;

CREATE OR REPLACE FUNCTION private_api.sync_subscription_plan_credit_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total integer := COALESCE(NEW.total_credits, 0);
  v_included integer := COALESCE(NEW.coins_included, 0);
BEGIN
  IF v_total < 0 OR v_included < 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INVALID' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_total > 0 AND v_included > 0 AND v_total <> v_included THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INCONSISTENT' USING ERRCODE = '22023';
    END IF;

    IF v_total > 0 THEN
      NEW.coins_included := v_total;
    ELSIF v_included > 0 THEN
      NEW.total_credits := v_included;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.coins_included IS DISTINCT FROM OLD.coins_included
     AND NEW.total_credits IS DISTINCT FROM OLD.total_credits
     AND COALESCE(NEW.coins_included, 0) <> COALESCE(NEW.total_credits, 0) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INCONSISTENT' USING ERRCODE = '22023';
  ELSIF NEW.coins_included IS DISTINCT FROM OLD.coins_included THEN
    NEW.total_credits := NEW.coins_included;
  ELSIF NEW.total_credits IS DISTINCT FROM OLD.total_credits THEN
    NEW.coins_included := NEW.total_credits;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_subscription_plan_credit_columns
  ON public.subscription_plans;

CREATE TRIGGER sync_subscription_plan_credit_columns
BEFORE INSERT OR UPDATE OF total_credits, coins_included
ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION private_api.sync_subscription_plan_credit_columns();

REVOKE ALL ON FUNCTION private_api.sync_subscription_plan_credit_columns()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private_api.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text DEFAULT NULL::text
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
    sp.total_credits AS plan_total_credits,
    sp.coins_included AS plan_coins_included
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

  IF COALESCE(v_subscription.coins_per_month, 0) > 0 THEN
    v_coins := v_subscription.coins_per_month;
  ELSE
    IF COALESCE(v_subscription.plan_total_credits, 0) <= 0
       OR COALESCE(v_subscription.plan_coins_included, 0) <= 0 THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    IF v_subscription.plan_total_credits <> v_subscription.plan_coins_included THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CREDITS_INCONSISTENT' USING ERRCODE = '22023';
    END IF;

    v_coins := v_subscription.plan_total_credits;
  END IF;

  IF v_coins <= 0 OR v_coins > 10000000 THEN
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

REVOKE ALL ON FUNCTION private_api.admin_process_subscription_payment(uuid, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_process_subscription_payment(uuid, numeric, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION private_api.admin_process_subscription_payment(uuid, numeric, text, text) IS
  'Admin-only subscription payment approval. Requires idempotent external reference and persisted, consistent subscription credit configuration; no plan-type credit fallback.';

NOTIFY pgrst, 'reload schema';

COMMIT;
