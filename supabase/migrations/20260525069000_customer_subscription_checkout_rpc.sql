-- Customer subscription checkout RPC.
-- Keeps subscription and payment creation in one database transaction with
-- server-side ownership, pricing, status, and voucher validation.

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.subscription_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['pending_payment'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.subscription_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.subscription_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;

  IF to_regtype('public.payment_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['under_review', 'requires_info', 'approved', 'rejected'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.payment_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.payment_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS deliveries_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS next_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS payment_voucher_url text,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason text;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS price_full numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_pix numeric(10,2),
  ADD COLUMN IF NOT EXISTS deliveries_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

UPDATE public.subscription_plans
   SET plan_type = COALESCE(
         NULLIF(btrim(plan_type), ''),
         NULLIF(btrim(billing_interval), ''),
         CASE
           WHEN lower(COALESCE(slug, name, '')) LIKE '%anual%' THEN 'anual'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%semes%' THEN 'semestral'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%bimes%' THEN 'bimestral'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%trimes%' THEN 'trimestral'
           WHEN COALESCE(display_order, 0) = 3 THEN 'anual'
           WHEN COALESCE(display_order, 0) = 2 THEN 'semestral'
           ELSE 'trimestral'
         END
       ),
       billing_interval = COALESCE(
         NULLIF(btrim(billing_interval), ''),
         NULLIF(btrim(plan_type), ''),
         CASE
           WHEN lower(COALESCE(slug, name, '')) LIKE '%anual%' THEN 'anual'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%semes%' THEN 'semestral'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%bimes%' THEN 'bimestral'
           WHEN lower(COALESCE(slug, name, '')) LIKE '%trimes%' THEN 'trimestral'
           WHEN COALESCE(display_order, 0) = 3 THEN 'anual'
           WHEN COALESCE(display_order, 0) = 2 THEN 'semestral'
           ELSE 'trimestral'
         END
       ),
       price_full = COALESCE(price_full, price),
       price_pix = COALESCE(price_pix, round(COALESCE(price_full, price) * 0.95, 2)),
       deliveries_total = CASE
         WHEN COALESCE(deliveries_total, 0) > 0 THEN deliveries_total
         WHEN COALESCE(plan_type, billing_interval) = 'anual' THEN 12
         WHEN COALESCE(plan_type, billing_interval) = 'semestral' THEN 7
         WHEN COALESCE(plan_type, billing_interval) = 'trimestral' THEN 3
         ELSE GREATEST(COALESCE(characters_per_cycle, 1), 1)
       END
 WHERE plan_type IS NULL
    OR billing_interval IS NULL
    OR price_full IS NULL
    OR price_pix IS NULL
    OR COALESCE(deliveries_total, 0) = 0;

UPDATE public.subscription_plans
   SET deliveries_total = CASE
         WHEN plan_type = 'anual' THEN 12
         WHEN plan_type = 'semestral' THEN 7
         WHEN plan_type = 'trimestral' THEN 3
         ELSE deliveries_total
       END
 WHERE plan_type IN ('trimestral', 'semestral', 'anual')
   AND COALESCE(deliveries_total, 0) <= 1;

ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.admin_payment_methods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_collection_status
  ON public.subscriptions(user_id, collection_id, status);

CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription_id
  ON public.manual_payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_manual_payments_reference_number
  ON public.manual_payments(reference_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'subscriptions_payment_voucher_url_safe'
       AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_payment_voucher_url_safe
      CHECK (
        payment_voucher_url IS NULL
        OR (
          length(payment_voucher_url) <= 2048
          AND payment_voucher_url ~ '^https://'
          AND payment_voucher_url !~ '\s'
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_payment_method text,
  p_payment_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  v_voucher_url text := NULLIF(btrim(COALESCE(p_payment_voucher_url, '')), '');
  v_plan record;
  v_collection record;
  v_amount numeric;
  v_payment_status text;
  v_notes text;
  v_reference text;
  v_subscription public.subscriptions%ROWTYPE;
  v_payment public.manual_payments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_payment_method NOT IN ('pix', 'credit_card') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;

  IF v_voucher_url IS NOT NULL AND (
    length(v_voucher_url) > 2048
    OR v_voucher_url !~ '^https://'
    OR v_voucher_url ~ '\s'
  ) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_VOUCHER_URL' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, description, plan_type, price_pix, price_full, deliveries_total, is_active
    INTO v_plan
    FROM public.subscription_plans
   WHERE id = p_plan_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT id
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.subscriptions
     WHERE user_id = v_user_id
       AND collection_id = p_collection_id
       AND status::text IN ('active', 'pending_payment')
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_EXISTS' USING ERRCODE = '22023';
  END IF;

  v_amount := CASE v_payment_method
    WHEN 'pix' THEN COALESCE(v_plan.price_pix, 0)::numeric
    ELSE COALESCE(v_plan.price_full, 0)::numeric
  END;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PRICE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_payment_status := CASE WHEN v_voucher_url IS NULL THEN 'pending' ELSE 'under_review' END;
  v_notes := CASE WHEN v_voucher_url IS NULL THEN NULL ELSE concat('Comprovante: ', v_voucher_url) END;
  v_reference := public.generate_payment_reference();

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    plan_type,
    status,
    payment_status,
    collection_id,
    payment_method,
    total_paid,
    deliveries_total,
    notes,
    payment_voucher_url
  )
  VALUES (
    v_user_id,
    v_plan.id,
    v_plan.plan_type,
    'pending_payment',
    'pending',
    v_collection.id,
    v_payment_method,
    v_amount,
    COALESCE(v_plan.deliveries_total, 0),
    v_notes,
    v_voucher_url
  )
  RETURNING * INTO v_subscription;

  INSERT INTO public.manual_payments (
    reference_number,
    user_id,
    amount,
    currency,
    reference_type,
    reference_id,
    subscription_id,
    payment_type,
    status,
    payment_method,
    notes
  )
  VALUES (
    v_reference,
    v_user_id,
    v_amount,
    'BRL',
    'subscription',
    v_subscription.id::text,
    v_subscription.id,
    'recurring',
    v_payment_status,
    v_payment_method,
    v_notes
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET payment_id = v_payment.id::text,
         updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_subscription;

  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_subscription),
    'payment', to_jsonb(v_payment)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text) IS
  'Creates a pending subscription checkout and linked manual payment for the authenticated user.';

NOTIFY pgrst, 'reload schema';
