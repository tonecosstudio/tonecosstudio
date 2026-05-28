-- Legacy subscription credit mutation RPCs.
-- Creates the missing local SSOT for subscription_credit_* tables and keeps writes behind validated functions.

CREATE TABLE IF NOT EXISTS public.subscription_credit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL,
  name text NOT NULL,
  duration_months integer NOT NULL DEFAULT 3,
  price numeric(12,2) NOT NULL DEFAULT 0,
  base_credits integer NOT NULL DEFAULT 0,
  bonus_credits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_plans
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.subscription_credit_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_credit_plans(id) ON DELETE SET NULL,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  next_billing_date timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  pending_plan_change text,
  cancelled_at timestamptz,
  cancellation_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_credit_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS pending_plan_change text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_type text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.subscription_credit_user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE SET NULL,
  total_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  available_credits integer NOT NULL DEFAULT 0,
  expired_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_user_credits
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expired_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.subscription_credit_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cash numeric(12,2) NOT NULL DEFAULT 0,
  price_credits integer NOT NULL DEFAULT 0,
  is_exclusive_semestral boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_standard_collection boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_characters
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_cash numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_exclusive_semestral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_standard_collection boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.subscription_credit_production_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity_limit integer NOT NULL DEFAULT 0,
  current_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  close_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.subscription_credit_production_cycles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS capacity_limit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS close_date timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.subscription_credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscription_credit_subscriptions(id) ON DELETE CASCADE,
  production_cycle_id uuid NOT NULL REFERENCES public.subscription_credit_production_cycles(id) ON DELETE RESTRICT,
  order_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  is_priority boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  total_credits integer NOT NULL DEFAULT 0,
  credits_debited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz
);

ALTER TABLE public.subscription_credit_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS production_cycle_id uuid REFERENCES public.subscription_credit_production_cycles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_debited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.subscription_credit_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.subscription_credit_orders(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.subscription_credit_characters(id) ON DELETE RESTRICT,
  credits_cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_order_items
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.subscription_credit_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.subscription_credit_characters(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS credits_cost integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.subscription_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  credits_amount integer NOT NULL,
  character_id uuid REFERENCES public.subscription_credit_characters(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.subscription_credit_orders(id) ON DELETE SET NULL,
  production_cycle_id uuid REFERENCES public.subscription_credit_production_cycles(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_credit_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS credits_amount integer,
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.subscription_credit_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.subscription_credit_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_cycle_id uuid REFERENCES public.subscription_credit_production_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_plans_plan_type_valid'
      AND conrelid = 'public.subscription_credit_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_plans
      ADD CONSTRAINT subscription_credit_plans_plan_type_valid
      CHECK (plan_type IN ('trimestral', 'semestral')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_plans_values_valid'
      AND conrelid = 'public.subscription_credit_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_plans
      ADD CONSTRAINT subscription_credit_plans_values_valid
      CHECK (
        duration_months > 0
        AND price >= 0
        AND base_credits >= 0
        AND bonus_credits >= 0
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_subscriptions_status_valid'
      AND conrelid = 'public.subscription_credit_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_subscriptions
      ADD CONSTRAINT subscription_credit_subscriptions_status_valid
      CHECK (status IN ('active', 'expired', 'cancelled')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_subscriptions_plan_type_valid'
      AND conrelid = 'public.subscription_credit_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_subscriptions
      ADD CONSTRAINT subscription_credit_subscriptions_plan_type_valid
      CHECK (
        plan_type IN ('trimestral', 'semestral')
        AND (pending_plan_change IS NULL OR pending_plan_change IN ('trimestral', 'semestral'))
        AND (cancellation_type IS NULL OR cancellation_type IN ('with_refund', 'no_renewal'))
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_user_credits_values_valid'
      AND conrelid = 'public.subscription_credit_user_credits'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_user_credits
      ADD CONSTRAINT subscription_credit_user_credits_values_valid
      CHECK (
        total_credits >= 0
        AND used_credits >= 0
        AND available_credits >= 0
        AND expired_credits >= 0
        AND total_credits >= used_credits
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_characters_values_valid'
      AND conrelid = 'public.subscription_credit_characters'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_characters
      ADD CONSTRAINT subscription_credit_characters_values_valid
      CHECK (price_cash >= 0 AND price_credits >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_cycles_values_valid'
      AND conrelid = 'public.subscription_credit_production_cycles'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_production_cycles
      ADD CONSTRAINT subscription_credit_cycles_values_valid
      CHECK (
        capacity_limit >= 0
        AND current_count >= 0
        AND current_count <= capacity_limit
        AND status IN ('open', 'full', 'closed')
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_orders_values_valid'
      AND conrelid = 'public.subscription_credit_orders'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_orders
      ADD CONSTRAINT subscription_credit_orders_values_valid
      CHECK (
        order_type IN ('individual', 'automatic')
        AND status IN ('pending', 'confirmed', 'in_production', 'shipped', 'cancelled')
        AND total_credits >= 0
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_order_items_values_valid'
      AND conrelid = 'public.subscription_credit_order_items'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_order_items
      ADD CONSTRAINT subscription_credit_order_items_values_valid
      CHECK (credits_cost >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_credit_transactions_type_valid'
      AND conrelid = 'public.subscription_credit_transactions'::regclass
  ) THEN
    ALTER TABLE public.subscription_credit_transactions
      ADD CONSTRAINT subscription_credit_transactions_type_valid
      CHECK (transaction_type IN ('allocation', 'debit_immediate', 'debit_cycle_close', 'expiration', 'adjustment')) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_subscription_credit_plans_active
  ON public.subscription_credit_plans(plan_type, is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_subscriptions_user_status
  ON public.subscription_credit_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_user_credits_user
  ON public.subscription_credit_user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_transactions_user_created
  ON public.subscription_credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_characters_active
  ON public.subscription_credit_characters(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_cycles_status_close
  ON public.subscription_credit_production_cycles(status, close_date);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_orders_user_created
  ON public.subscription_credit_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_orders_cycle_type
  ON public.subscription_credit_orders(production_cycle_id, order_type, credits_debited);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_order_items_order
  ON public.subscription_credit_order_items(order_id);

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_plans ON public.subscription_credit_plans;
CREATE TRIGGER set_updated_at_subscription_credit_plans
  BEFORE UPDATE ON public.subscription_credit_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_subscriptions ON public.subscription_credit_subscriptions;
CREATE TRIGGER set_updated_at_subscription_credit_subscriptions
  BEFORE UPDATE ON public.subscription_credit_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_user_credits ON public.subscription_credit_user_credits;
CREATE TRIGGER set_updated_at_subscription_credit_user_credits
  BEFORE UPDATE ON public.subscription_credit_user_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_characters ON public.subscription_credit_characters;
CREATE TRIGGER set_updated_at_subscription_credit_characters
  BEFORE UPDATE ON public.subscription_credit_characters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_production_cycles ON public.subscription_credit_production_cycles;
CREATE TRIGGER set_updated_at_subscription_credit_production_cycles
  BEFORE UPDATE ON public.subscription_credit_production_cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscription_credit_orders ON public.subscription_credit_orders;
CREATE TRIGGER set_updated_at_subscription_credit_orders
  BEFORE UPDATE ON public.subscription_credit_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.subscription_credit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_production_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credit_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_credit_plans_select_safe" ON public.subscription_credit_plans;
CREATE POLICY "subscription_credit_plans_select_safe"
  ON public.subscription_credit_plans FOR SELECT
  USING (is_active = true OR COALESCE(auth.role(), '') = 'authenticated' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_subscriptions_select_owner_admin" ON public.subscription_credit_subscriptions;
CREATE POLICY "subscription_credit_subscriptions_select_owner_admin"
  ON public.subscription_credit_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_user_credits_select_owner_admin" ON public.subscription_credit_user_credits;
CREATE POLICY "subscription_credit_user_credits_select_owner_admin"
  ON public.subscription_credit_user_credits FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_transactions_select_owner_admin" ON public.subscription_credit_transactions;
CREATE POLICY "subscription_credit_transactions_select_owner_admin"
  ON public.subscription_credit_transactions FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_characters_select_safe" ON public.subscription_credit_characters;
CREATE POLICY "subscription_credit_characters_select_safe"
  ON public.subscription_credit_characters FOR SELECT
  USING (is_active = true OR COALESCE(auth.role(), '') = 'authenticated' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_cycles_select_safe" ON public.subscription_credit_production_cycles;
CREATE POLICY "subscription_credit_cycles_select_safe"
  ON public.subscription_credit_production_cycles FOR SELECT
  USING (status IN ('open', 'full') OR COALESCE(auth.role(), '') = 'authenticated' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_orders_select_owner_admin" ON public.subscription_credit_orders;
CREATE POLICY "subscription_credit_orders_select_owner_admin"
  ON public.subscription_credit_orders FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscription_credit_order_items_select_owner_admin" ON public.subscription_credit_order_items;
CREATE POLICY "subscription_credit_order_items_select_owner_admin"
  ON public.subscription_credit_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.subscription_credit_orders sco
      WHERE sco.id = order_id
        AND (sco.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE OR REPLACE FUNCTION public.subscription_credit_require_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_credit_validate_text(
  p_value text,
  p_field_name text,
  p_max_length integer,
  p_required boolean DEFAULT true,
  p_allow_multiline boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field_name USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length THEN
    RAISE EXCEPTION '% is too long', p_field_name USING ERRCODE = '22023';
  END IF;

  IF p_allow_multiline THEN
    IF translate(v_value, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
    END IF;
  ELSIF v_value ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_credit_validate_url(
  p_value text,
  p_field_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := public.subscription_credit_validate_text(p_value, p_field_name, 1000, false, false);
BEGIN
  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_value ~ '[<>"[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_credit_validate_plan_type(
  p_plan_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type text := lower(public.subscription_credit_validate_text(p_plan_type, 'plan_type', 20, true, false));
BEGIN
  IF v_plan_type NOT IN ('trimestral', 'semestral') THEN
    RAISE EXCEPTION 'Invalid plan_type' USING ERRCODE = '22023';
  END IF;

  RETURN v_plan_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_subscription_credit_for_current_user(
  p_plan_type text,
  p_payment_method_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_plan_type text := public.subscription_credit_validate_plan_type(p_plan_type);
  v_payment_method_id text := public.subscription_credit_validate_text(p_payment_method_id, 'payment_method_id', 120, false, false);
  v_plan public.subscription_credit_plans%ROWTYPE;
  v_existing public.subscription_credit_subscriptions%ROWTYPE;
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_total_credits integer;
  v_started_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  SELECT *
  INTO v_plan
  FROM public.subscription_credit_plans
  WHERE plan_type = v_plan_type
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription credit plan not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.subscription_credit_subscriptions
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'User already has an active subscription' USING ERRCODE = '23505';
  END IF;

  v_total_credits := COALESCE(v_plan.base_credits, 0) + COALESCE(v_plan.bonus_credits, 0);
  v_ends_at := v_started_at + make_interval(months => GREATEST(COALESCE(v_plan.duration_months, 1), 1));

  INSERT INTO public.subscription_credit_subscriptions (
    user_id,
    plan_id,
    plan_type,
    status,
    start_date,
    end_date,
    next_billing_date,
    auto_renew
  )
  VALUES (
    v_user_id,
    v_plan.id,
    v_plan_type,
    'active',
    v_started_at,
    v_ends_at,
    v_ends_at,
    true
  )
  RETURNING * INTO v_subscription;

  SELECT *
  INTO v_credits
  FROM public.subscription_credit_user_credits
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.subscription_credit_user_credits
    SET subscription_id = v_subscription.id,
        total_credits = v_total_credits,
        used_credits = 0,
        available_credits = v_total_credits,
        expired_credits = 0
    WHERE id = v_credits.id;
  ELSE
    INSERT INTO public.subscription_credit_user_credits (
      user_id,
      subscription_id,
      total_credits,
      used_credits,
      available_credits,
      expired_credits
    )
    VALUES (
      v_user_id,
      v_subscription.id,
      v_total_credits,
      0,
      v_total_credits,
      0
    );
  END IF;

  INSERT INTO public.subscription_credit_transactions (
    user_id,
    subscription_id,
    transaction_type,
    credits_amount,
    description
  )
  VALUES (
    v_user_id,
    v_subscription.id,
    'allocation',
    v_total_credits,
    concat('Creditos alocados - Plano ', v_plan_type)
  );

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'credits_allocated', v_total_credits,
    'order_id', null,
    'payment_method_id', v_payment_method_id,
    'message', 'Assinatura ativada com sucesso'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_subscription_credit_plan_change(
  p_subscription_id text,
  p_new_plan_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_subscription_id text := public.subscription_credit_validate_text(p_subscription_id, 'subscription_id', 80, true, false);
  v_new_plan_type text := public.subscription_credit_validate_plan_type(p_new_plan_type);
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.subscription_credit_plans
    WHERE plan_type = v_new_plan_type
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Subscription credit plan not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.subscription_credit_subscriptions
  SET pending_plan_change = v_new_plan_type
  WHERE id::text = v_subscription_id
    AND user_id = v_user_id
    AND status = 'active'
  RETURNING * INTO v_subscription;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'pending_plan_change', v_subscription.pending_plan_change,
    'effective_date', v_subscription.end_date,
    'message', 'Mudanca de plano agendada para a proxima renovacao'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_subscription_credit_with_refund(
  p_subscription_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_subscription_id text := public.subscription_credit_validate_text(p_subscription_id, 'subscription_id', 80, true, false);
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_expired integer := 0;
BEGIN
  UPDATE public.subscription_credit_subscriptions
  SET status = 'cancelled',
      cancellation_type = 'with_refund',
      cancelled_at = now(),
      auto_renew = false,
      pending_plan_change = NULL
  WHERE id::text = v_subscription_id
    AND user_id = v_user_id
    AND status = 'active'
  RETURNING * INTO v_subscription;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_credits
  FROM public.subscription_credit_user_credits
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_credits.available_credits > 0 THEN
    v_expired := v_credits.available_credits;

    UPDATE public.subscription_credit_user_credits
    SET available_credits = 0,
        expired_credits = expired_credits + v_expired
    WHERE id = v_credits.id;

    INSERT INTO public.subscription_credit_transactions (
      user_id,
      subscription_id,
      transaction_type,
      credits_amount,
      description
    )
    VALUES (
      v_user_id,
      v_subscription.id,
      'expiration',
      -v_expired,
      'Creditos expirados por cancelamento com reembolso'
    );
  END IF;

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'refund_amount', 0,
    'credits_expired', v_expired,
    'message', 'Assinatura cancelada com reembolso'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_subscription_credit_no_renewal(
  p_subscription_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_subscription_id text := public.subscription_credit_validate_text(p_subscription_id, 'subscription_id', 80, true, false);
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
BEGIN
  UPDATE public.subscription_credit_subscriptions
  SET auto_renew = false,
      cancellation_type = 'no_renewal'
  WHERE id::text = v_subscription_id
    AND user_id = v_user_id
    AND status = 'active'
  RETURNING * INTO v_subscription;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'end_date', v_subscription.end_date,
    'credits_valid_until', v_subscription.end_date,
    'message', 'Renovacao automatica desativada'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_subscription_credit_renewal(
  p_subscription_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_subscription_id text := public.subscription_credit_validate_text(p_subscription_id, 'subscription_id', 80, true, false);
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
BEGIN
  UPDATE public.subscription_credit_subscriptions
  SET auto_renew = true,
      cancellation_type = NULL
  WHERE id::text = v_subscription_id
    AND user_id = v_user_id
    AND status = 'active'
  RETURNING * INTO v_subscription;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'end_date', v_subscription.end_date,
    'credits_valid_until', v_subscription.end_date,
    'message', 'Renovacao automatica reativada'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_subscription_credit_individual_order(
  p_character_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_character_id text := public.subscription_credit_validate_text(p_character_id, 'character_id', 80, true, false);
  v_cycle public.subscription_credit_production_cycles%ROWTYPE;
  v_character public.subscription_credit_characters%ROWTYPE;
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_order public.subscription_credit_orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_cycle
  FROM public.subscription_credit_production_cycles
  WHERE status = 'open'
    AND current_count < capacity_limit
  ORDER BY close_date ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open production cycle with available capacity' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_character
  FROM public.subscription_credit_characters
  WHERE id::text = v_character_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscription_credit_subscriptions
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.plan_type = 'trimestral' AND COALESCE(v_character.is_exclusive_semestral, false) THEN
    RAISE EXCEPTION 'Character requires semestral plan' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_credits
  FROM public.subscription_credit_user_credits
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit balance not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_credits.available_credits < v_character.price_credits THEN
    RAISE EXCEPTION 'Insufficient credit balance' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscription_credit_orders (
    user_id,
    subscription_id,
    production_cycle_id,
    order_type,
    status,
    total_credits,
    credits_debited
  )
  VALUES (
    v_user_id,
    v_subscription.id,
    v_cycle.id,
    'individual',
    'pending',
    v_character.price_credits,
    true
  )
  RETURNING * INTO v_order;

  INSERT INTO public.subscription_credit_order_items (
    order_id,
    character_id,
    credits_cost
  )
  VALUES (
    v_order.id,
    v_character.id,
    v_character.price_credits
  );

  UPDATE public.subscription_credit_user_credits
  SET used_credits = used_credits + v_character.price_credits,
      available_credits = available_credits - v_character.price_credits
  WHERE id = v_credits.id;

  UPDATE public.subscription_credit_production_cycles
  SET current_count = current_count + 1,
      status = CASE
        WHEN current_count + 1 >= capacity_limit THEN 'full'
        ELSE status
      END
  WHERE id = v_cycle.id;

  INSERT INTO public.subscription_credit_transactions (
    user_id,
    subscription_id,
    transaction_type,
    credits_amount,
    character_id,
    order_id,
    production_cycle_id,
    description
  )
  VALUES (
    v_user_id,
    v_subscription.id,
    'debit_immediate',
    -v_character.price_credits,
    v_character.id,
    v_order.id,
    v_cycle.id,
    concat('Compra individual - ', v_character.name)
  );

  RETURN jsonb_build_object(
    'order_id', v_order.id::text,
    'credits_debited', v_character.price_credits,
    'production_cycle_id', v_cycle.id::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_subscription_credit_automatic_order(
  p_order_id text,
  p_character_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.subscription_credit_require_user();
  v_order_id text := public.subscription_credit_validate_text(p_order_id, 'order_id', 80, true, false);
  v_order public.subscription_credit_orders%ROWTYPE;
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
  v_character_ids text[];
  v_requested_count integer := COALESCE(array_length(p_character_ids, 1), 0);
  v_found_count integer := 0;
  v_total_credits integer := 0;
  v_has_exclusive boolean := false;
  v_characters jsonb := '[]'::jsonb;
BEGIN
  SELECT COALESCE(array_agg(requested.character_id), ARRAY[]::text[])
  INTO v_character_ids
  FROM (
    SELECT DISTINCT NULLIF(btrim(input.character_id), '') AS character_id
    FROM unnest(COALESCE(p_character_ids, ARRAY[]::text[])) AS input(character_id)
    WHERE NULLIF(btrim(input.character_id), '') IS NOT NULL
  ) requested;

  IF v_requested_count = 0 OR COALESCE(cardinality(v_character_ids), 0) <> v_requested_count THEN
    RAISE EXCEPTION 'Invalid character selection' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_order
  FROM public.subscription_credit_orders
  WHERE id::text = v_order_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.order_type <> 'automatic' THEN
    RAISE EXCEPTION 'Only automatic orders can be updated' USING ERRCODE = '22023';
  END IF;

  IF v_order.is_locked THEN
    RAISE EXCEPTION 'Order is locked' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscription_credit_subscriptions
  WHERE id = v_order.subscription_id
    AND user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COALESCE(jsonb_agg(to_jsonb(scc) ORDER BY scc.name), '[]'::jsonb),
    COALESCE(sum(scc.price_credits), 0)::integer,
    count(*)::integer,
    COALESCE(bool_or(scc.is_exclusive_semestral), false)
  INTO v_characters, v_total_credits, v_found_count, v_has_exclusive
  FROM public.subscription_credit_characters scc
  WHERE scc.id::text = ANY(v_character_ids)
    AND scc.is_active = true;

  IF v_found_count <> cardinality(v_character_ids) THEN
    RAISE EXCEPTION 'One or more characters were not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.plan_type = 'trimestral' AND v_has_exclusive THEN
    RAISE EXCEPTION 'Character selection requires semestral plan' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.subscription_credit_order_items
  WHERE order_id = v_order.id;

  INSERT INTO public.subscription_credit_order_items (
    order_id,
    character_id,
    credits_cost
  )
  SELECT
    v_order.id,
    scc.id,
    scc.price_credits
  FROM public.subscription_credit_characters scc
  WHERE scc.id::text = ANY(v_character_ids)
    AND scc.is_active = true;

  UPDATE public.subscription_credit_orders
  SET total_credits = v_total_credits
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'order_id', v_order.id::text,
    'characters', v_characters,
    'total_credits', v_total_credits
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_subscription_credit_credits(
  p_subscription_id text,
  p_amount integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription_id text := public.subscription_credit_validate_text(p_subscription_id, 'subscription_id', 80, true, false);
  v_reason text := public.subscription_credit_validate_text(p_reason, 'reason', 500, true, true);
  v_subscription public.subscription_credit_subscriptions%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_new_total integer;
  v_new_available integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(p_amount, 0) = 0 THEN
    RAISE EXCEPTION 'Adjustment amount must not be zero' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscription_credit_subscriptions
  WHERE id::text = v_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_credits
  FROM public.subscription_credit_user_credits
  WHERE user_id = v_subscription.user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit balance not found' USING ERRCODE = 'P0002';
  END IF;

  v_new_total := v_credits.total_credits + p_amount;
  v_new_available := v_credits.available_credits + p_amount;

  IF v_new_total < 0 OR v_new_available < 0 OR v_new_total < v_credits.used_credits THEN
    RAISE EXCEPTION 'Adjustment would create an invalid credit balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_credit_user_credits
  SET total_credits = v_new_total,
      available_credits = v_new_available
  WHERE id = v_credits.id;

  INSERT INTO public.subscription_credit_transactions (
    user_id,
    subscription_id,
    transaction_type,
    credits_amount,
    description
  )
  VALUES (
    v_subscription.user_id,
    v_subscription.id,
    'adjustment',
    p_amount,
    v_reason
  );

  RETURN jsonb_build_object(
    'subscription_id', v_subscription.id::text,
    'total_credits', v_new_total,
    'available_credits', v_new_available
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_subscription_credit_character(
  p_name text,
  p_description text DEFAULT NULL,
  p_price_cash numeric DEFAULT 0,
  p_price_credits integer DEFAULT 0,
  p_is_exclusive_semestral boolean DEFAULT false,
  p_is_standard_collection boolean DEFAULT false,
  p_image_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.subscription_credit_validate_text(p_name, 'name', 120, true, false);
  v_description text := public.subscription_credit_validate_text(p_description, 'description', 2000, false, true);
  v_image_url text := public.subscription_credit_validate_url(p_image_url, 'image_url');
  v_character public.subscription_credit_characters%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(p_price_cash, 0) < 0 OR COALESCE(p_price_credits, 0) < 0 THEN
    RAISE EXCEPTION 'Character prices must be non-negative' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscription_credit_characters (
    name,
    description,
    price_cash,
    price_credits,
    is_exclusive_semestral,
    is_standard_collection,
    image_url,
    is_active
  )
  VALUES (
    v_name,
    v_description,
    COALESCE(p_price_cash, 0),
    COALESCE(p_price_credits, 0),
    COALESCE(p_is_exclusive_semestral, false),
    COALESCE(p_is_standard_collection, false),
    v_image_url,
    true
  )
  RETURNING * INTO v_character;

  RETURN to_jsonb(v_character);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription_credit_character(
  p_character_id text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_character_id text := public.subscription_credit_validate_text(p_character_id, 'character_id', 80, true, false);
  v_patch jsonb := COALESCE(p_patch, '{}'::jsonb);
  v_character public.subscription_credit_characters%ROWTYPE;
  v_key text;
  v_price_cash numeric;
  v_price_credits integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF jsonb_typeof(v_patch) <> 'object' THEN
    RAISE EXCEPTION 'Character patch must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(v_patch)
  LOOP
    IF v_key NOT IN (
      'name',
      'description',
      'price_cash',
      'price_credits',
      'is_exclusive_semestral',
      'is_standard_collection',
      'is_active',
      'image_url'
    ) THEN
      RAISE EXCEPTION 'Invalid character field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT *
  INTO v_character
  FROM public.subscription_credit_characters
  WHERE id::text = v_character_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  v_price_cash := CASE
    WHEN v_patch ? 'price_cash' THEN (v_patch->>'price_cash')::numeric
    ELSE v_character.price_cash
  END;
  v_price_credits := CASE
    WHEN v_patch ? 'price_credits' THEN (v_patch->>'price_credits')::integer
    ELSE v_character.price_credits
  END;

  IF v_price_cash < 0 OR v_price_credits < 0 THEN
    RAISE EXCEPTION 'Character prices must be non-negative' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_credit_characters
  SET name = CASE
        WHEN v_patch ? 'name' THEN public.subscription_credit_validate_text(v_patch->>'name', 'name', 120, true, false)
        ELSE name
      END,
      description = CASE
        WHEN v_patch ? 'description' THEN public.subscription_credit_validate_text(v_patch->>'description', 'description', 2000, false, true)
        ELSE description
      END,
      price_cash = v_price_cash,
      price_credits = v_price_credits,
      is_exclusive_semestral = CASE
        WHEN v_patch ? 'is_exclusive_semestral' THEN (v_patch->>'is_exclusive_semestral')::boolean
        ELSE is_exclusive_semestral
      END,
      is_standard_collection = CASE
        WHEN v_patch ? 'is_standard_collection' THEN (v_patch->>'is_standard_collection')::boolean
        ELSE is_standard_collection
      END,
      is_active = CASE
        WHEN v_patch ? 'is_active' THEN (v_patch->>'is_active')::boolean
        ELSE is_active
      END,
      image_url = CASE
        WHEN v_patch ? 'image_url' THEN public.subscription_credit_validate_url(v_patch->>'image_url', 'image_url')
        ELSE image_url
      END
  WHERE id = v_character.id
  RETURNING * INTO v_character;

  RETURN to_jsonb(v_character);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_deactivate_subscription_credit_character(
  p_character_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_character_id text := public.subscription_credit_validate_text(p_character_id, 'character_id', 80, true, false);
  v_character public.subscription_credit_characters%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.subscription_credit_characters
  SET is_active = false
  WHERE id::text = v_character_id
  RETURNING * INTO v_character;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_character);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_subscription_credit_production_cycle(
  p_name text,
  p_capacity_limit integer,
  p_close_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.subscription_credit_validate_text(p_name, 'name', 140, true, false);
  v_cycle public.subscription_credit_production_cycles%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(p_capacity_limit, 0) <= 0 THEN
    RAISE EXCEPTION 'capacity_limit must be positive' USING ERRCODE = '22023';
  END IF;

  IF p_close_date IS NULL OR p_close_date <= now() THEN
    RAISE EXCEPTION 'close_date must be in the future' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscription_credit_production_cycles (
    name,
    capacity_limit,
    current_count,
    status,
    close_date
  )
  VALUES (
    v_name,
    p_capacity_limit,
    0,
    'open',
    p_close_date
  )
  RETURNING * INTO v_cycle;

  RETURN to_jsonb(v_cycle);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_subscription_credit_production_cycle(
  p_cycle_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle_id text := public.subscription_credit_validate_text(p_cycle_id, 'cycle_id', 80, true, false);
  v_cycle public.subscription_credit_production_cycles%ROWTYPE;
  v_order public.subscription_credit_orders%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_total_debited integer := 0;
  v_confirmed integer := 0;
  v_pending integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_cycle
  FROM public.subscription_credit_production_cycles
  WHERE id::text = v_cycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production cycle not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_cycle.status = 'closed' THEN
    RAISE EXCEPTION 'Production cycle is already closed' USING ERRCODE = '22023';
  END IF;

  FOR v_order IN
    SELECT *
    FROM public.subscription_credit_orders
    WHERE production_cycle_id = v_cycle.id
      AND order_type = 'automatic'
      AND credits_debited = false
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    SELECT *
    INTO v_credits
    FROM public.subscription_credit_user_credits
    WHERE user_id = v_order.user_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_credits.available_credits >= v_order.total_credits THEN
      UPDATE public.subscription_credit_user_credits
      SET used_credits = used_credits + v_order.total_credits,
          available_credits = available_credits - v_order.total_credits
      WHERE id = v_credits.id;

      UPDATE public.subscription_credit_orders
      SET credits_debited = true,
          status = 'confirmed',
          is_locked = true,
          locked_at = COALESCE(locked_at, now())
      WHERE id = v_order.id;

      INSERT INTO public.subscription_credit_transactions (
        user_id,
        subscription_id,
        transaction_type,
        credits_amount,
        order_id,
        production_cycle_id,
        description
      )
      VALUES (
        v_order.user_id,
        v_order.subscription_id,
        'debit_cycle_close',
        -v_order.total_credits,
        v_order.id,
        v_cycle.id,
        concat('Debito no fechamento do ciclo - ', v_order.total_credits, ' creditos')
      );

      v_total_debited := v_total_debited + v_order.total_credits;
      v_confirmed := v_confirmed + 1;
    ELSE
      UPDATE public.subscription_credit_orders
      SET status = 'cancelled',
          is_locked = true,
          locked_at = COALESCE(locked_at, now())
      WHERE id = v_order.id;

      v_pending := v_pending + 1;
    END IF;
  END LOOP;

  UPDATE public.subscription_credit_production_cycles
  SET status = 'closed',
      closed_at = now()
  WHERE id = v_cycle.id;

  RETURN jsonb_build_object(
    'cycleId', v_cycle.id::text,
    'confirmedOrders', v_confirmed,
    'pendingOrders', v_pending,
    'totalCreditsDebited', v_total_debited
  );
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.subscription_credit_plans,
  public.subscription_credit_subscriptions,
  public.subscription_credit_user_credits,
  public.subscription_credit_transactions,
  public.subscription_credit_characters,
  public.subscription_credit_production_cycles,
  public.subscription_credit_orders,
  public.subscription_credit_order_items
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.subscription_credit_plans,
  public.subscription_credit_characters,
  public.subscription_credit_production_cycles
TO anon, authenticated;

GRANT SELECT ON TABLE
  public.subscription_credit_subscriptions,
  public.subscription_credit_user_credits,
  public.subscription_credit_transactions,
  public.subscription_credit_orders,
  public.subscription_credit_order_items
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.subscription_credit_require_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.subscription_credit_validate_text(text, text, integer, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.subscription_credit_validate_url(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.subscription_credit_validate_plan_type(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.activate_subscription_credit_for_current_user(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.schedule_subscription_credit_plan_change(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_credit_with_refund(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_subscription_credit_no_renewal(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_subscription_credit_renewal(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_subscription_credit_individual_order(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_subscription_credit_automatic_order(text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_subscription_credit_credits(text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription_credit_character(text, text, numeric, integer, boolean, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_credit_character(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_subscription_credit_character(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription_credit_production_cycle(text, integer, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_subscription_credit_production_cycle(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
