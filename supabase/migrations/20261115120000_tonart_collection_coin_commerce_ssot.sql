-- TONART's current collection plans buy physical pieces. Coins are a separate,
-- append-only wallet benefit; historical credits and payments remain untouched.
BEGIN;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS coin_bonus_per_shipment numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_bonus_cap numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS collection_model_slugs_snapshot text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS plan_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS checkout_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_checkout_request_unique
  ON public.subscriptions(user_id, checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

ALTER TABLE public.subscription_deliveries
  ADD COLUMN IF NOT EXISTS catalog_model_slug text,
  ADD COLUMN IF NOT EXISTS production_started_at timestamptz;

ALTER TABLE public.collection_choice_history
  ADD COLUMN IF NOT EXISTS previous_model_slug text,
  ADD COLUMN IF NOT EXISTS new_model_slug text;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS description text;

INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'tonart_model_change_cutoff_days',
  '30',
  'Antecedência mínima, em dias, para o cliente trocar o modelo de uma entrega TONART.',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Keep new collection sales dormant until a separately authorized release.
-- The admin setting writer below deliberately does not expose this switch.
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'tonart_collection_commerce_enabled',
  'false',
  'Gate de segurança para novas contratações TONART; ativação exige autorização específica.',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Configure the documented reference matrix on existing canonical plan rows.
-- Prices remain editable through the existing admin plan screen; no row or
-- collection is fabricated when one does not yet exist.
UPDATE public.subscription_plans
   SET price = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 250.00
         WHEN 'trimestral' THEN 705.00
         WHEN 'semestral' THEN 1350.00
         WHEN 'anual' THEN 2400.00
       END,
       price_full = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 250.00
         WHEN 'trimestral' THEN 705.00
         WHEN 'semestral' THEN 1350.00
         WHEN 'anual' THEN 2400.00
       END,
       price_pix = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 250.00
         WHEN 'trimestral' THEN 705.00
         WHEN 'semestral' THEN 1350.00
         WHEN 'anual' THEN 2400.00
       END,
       deliveries_per_cycle = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 1
         WHEN 'trimestral' THEN 3
         WHEN 'semestral' THEN 6
         WHEN 'anual' THEN 12
       END,
       deliveries_total = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 1
         WHEN 'trimestral' THEN 3
         WHEN 'semestral' THEN 6
         WHEN 'anual' THEN 12
       END,
       model_selection_limit = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 1
         WHEN 'trimestral' THEN 3
         WHEN 'semestral' THEN 6
         WHEN 'anual' THEN 12
       END,
       coin_bonus_per_shipment = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 0.00
         WHEN 'trimestral' THEN 5.00
         WHEN 'semestral' THEN 5.00
         WHEN 'anual' THEN 10.00
       END,
       coin_bonus_cap = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 0.00
         WHEN 'trimestral' THEN 15.00
         WHEN 'semestral' THEN 30.00
         WHEN 'anual' THEN 120.00
       END,
       is_active = false,
       updated_at = now()
 WHERE lower(btrim(plan_type)) IN ('avulso', 'trimestral', 'semestral', 'anual');

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_model_selection_limit_valid,
  ADD CONSTRAINT subscription_plans_model_selection_limit_valid
    CHECK (model_selection_limit IS NULL OR model_selection_limit IN (1, 3, 6, 12)) NOT VALID;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_tonart_coin_bonus_valid
    CHECK (
      coin_bonus_per_shipment >= 0
      AND coin_bonus_cap >= coin_bonus_per_shipment
      AND (coin_bonus_per_shipment = 0 OR coin_bonus_cap > 0)
    ) NOT VALID;

ALTER TABLE public.subscription_deliveries
  ADD CONSTRAINT subscription_deliveries_catalog_model_slug_valid
    CHECK (catalog_model_slug IS NULL OR catalog_model_slug ~ '^[a-z0-9][a-z0-9-]{0,239}$') NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_deliveries_plan_model_unique
  ON public.subscription_deliveries(subscription_id, catalog_model_slug)
  WHERE catalog_model_slug IS NOT NULL;

-- Reconcile the former 6/12-only plan trigger with the current 1/3/6/12
-- one-time contract. Unsupported legacy plan rows remain as history and cannot
-- be edited into new offers through this writer.
CREATE OR REPLACE FUNCTION private_api.enforce_subscription_plan_delivery_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type text := lower(NULLIF(btrim(COALESCE(NEW.plan_type, NEW.billing_interval, '')), ''));
  v_expected_pieces integer;
  v_full_price numeric(10,2) := COALESCE(NEW.price_full, NEW.price);
BEGIN
  v_expected_pieces := CASE v_plan_type
    WHEN 'avulso' THEN 1
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 12
    ELSE NULL
  END;

  IF v_expected_pieces IS NULL THEN
    RAISE EXCEPTION 'TONART_PLAN_TYPE_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  NEW.plan_type := v_plan_type;
  NEW.billing_interval := v_plan_type;
  IF NEW.deliveries_total IS DISTINCT FROM v_expected_pieces
     OR NEW.model_selection_limit IS DISTINCT FROM v_expected_pieces THEN
    RAISE EXCEPTION 'TONART_PLAN_PIECE_COUNT_MISMATCH' USING ERRCODE = '22023';
  END IF;
  IF NEW.deliveries_per_cycle IS DISTINCT FROM v_expected_pieces THEN
    NEW.deliveries_per_cycle := v_expected_pieces;
  END IF;
  IF NEW.price_full IS NULL OR NEW.price_full <= 0 OR v_full_price <> NEW.price_full
     OR NEW.price_pix IS DISTINCT FROM NEW.price_full THEN
    RAISE EXCEPTION 'TONART_PLAN_ONE_TIME_PRICE_INVALID' USING ERRCODE = '22023';
  END IF;
  IF NEW.coin_bonus_per_shipment < 0
     OR NEW.coin_bonus_cap < NEW.coin_bonus_per_shipment
     OR (NEW.coin_bonus_per_shipment = 0 AND NEW.coin_bonus_cap <> 0) THEN
    RAISE EXCEPTION 'TONART_PLAN_COIN_BONUS_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_plan_type = 'avulso'
     AND (NEW.coin_bonus_per_shipment <> 0 OR NEW.coin_bonus_cap <> 0) THEN
    RAISE EXCEPTION 'TONART_STANDALONE_COIN_BONUS_NOT_CONFIGURABLE' USING ERRCODE = '22023';
  END IF;
  IF v_plan_type = 'anual' AND NEW.is_active IS TRUE THEN
    RAISE EXCEPTION 'TONART_ANNUAL_PLAN_MUST_REMAIN_DISABLED' USING ERRCODE = '22023';
  END IF;
  IF NEW.is_active IS TRUE AND lower(COALESCE((
    SELECT setting.value FROM public.system_settings setting
     WHERE setting.key = 'tonart_collection_commerce_enabled'
  ), 'false')) <> 'true' THEN
    RAISE EXCEPTION 'TONART_COLLECTION_COMMERCE_DISABLED' USING ERRCODE = '22023';
  END IF;
  IF NEW.is_active IS TRUE AND v_plan_type NOT IN ('avulso', 'trimestral', 'semestral') THEN
    RAISE EXCEPTION 'TONART_PLAN_NOT_AVAILABLE_FOR_SALE' USING ERRCODE = '22023';
  END IF;

  -- Retain legacy columns for historical readers without turning plan value
  -- into a credit balance again.
  NEW.coins_included := 0;
  NEW.total_credits := 0;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private_api.enforce_subscription_plan_delivery_contract()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS enforce_subscription_plan_delivery_contract ON public.subscription_plans;
CREATE TRIGGER enforce_subscription_plan_delivery_contract
BEFORE INSERT OR UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION private_api.enforce_subscription_plan_delivery_contract();

-- All edits remain in the existing admin SSOT and reject the obsolete
-- principal-as-Coins fields as anything other than zero.
CREATE OR REPLACE FUNCTION public.admin_save_subscription_plan_configuration(
  p_plan_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'name', 'description', 'billing_interval', 'plan_type', 'slug',
    'price', 'price_full', 'price_pix', 'coins_included',
    'coin_bonus_per_shipment', 'coin_bonus_cap',
    'deliveries_per_cycle', 'deliveries_total', 'is_active',
    'model_selection_limit'
  ];
  v_plan_types text[] := ARRAY['avulso', 'trimestral', 'semestral', 'anual'];
  v_key text;
  v_value jsonb;
  v_text text;
  v_assignments text[] := ARRAY[]::text[];
  v_columns text[] := ARRAY[]::text[];
  v_values text[] := ARRAY[]::text[];
  v_result_id uuid;
  v_pieces integer;
  v_type text := lower(NULLIF(btrim(COALESCE(p_data->>'plan_type', p_data->>'billing_interval', '')), ''));
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Subscription plan payload must be an object' USING ERRCODE = '22023';
  END IF;
  IF p_plan_id IS NULL
     AND (NULLIF(btrim(COALESCE(p_data->>'name', '')), '') IS NULL OR v_type = '') THEN
    RAISE EXCEPTION 'Subscription plan name and type are required' USING ERRCODE = '22023';
  END IF;
  IF v_type <> '' AND NOT v_type = ANY(v_plan_types) THEN
    RAISE EXCEPTION 'TONART_PLAN_TYPE_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;
  v_pieces := CASE v_type
    WHEN 'avulso' THEN 1 WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6 WHEN 'anual' THEN 12 ELSE NULL
  END;

  FOR v_key IN SELECT jsonb_object_keys(p_data) LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported subscription plan field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_data) LOOP
    v_text := NULLIF(btrim(COALESCE(v_value #>> '{}', '')), '');
    IF v_key IN ('name', 'slug') THEN
      v_text := public.admin_validate_setting_value(v_text, 120);
    ELSIF v_key = 'description' THEN
      IF v_text IS NOT NULL AND (length(v_text) > 500 OR v_text ~ '[[:cntrl:]<>]') THEN
        RAISE EXCEPTION 'Invalid subscription plan description' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('billing_interval', 'plan_type') THEN
      IF v_text IS NULL OR NOT lower(v_text) = ANY(v_plan_types) OR lower(v_text) <> v_type THEN
        RAISE EXCEPTION 'Invalid subscription plan type' USING ERRCODE = '22023';
      END IF;
      v_text := lower(v_text);
    ELSIF v_key IN ('price', 'price_full', 'price_pix') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]{1,2})?$'
         OR v_text::numeric <= 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid one-time subscription plan price' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('coin_bonus_per_shipment', 'coin_bonus_cap') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]{1,2})?$'
         OR v_text::numeric < 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid subscription bonus amount' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('coins_included', 'deliveries_per_cycle', 'deliveries_total') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+$' OR v_text::integer < 0 THEN
        RAISE EXCEPTION 'Invalid subscription plan quantity' USING ERRCODE = '22023';
      END IF;
      IF v_key = 'coins_included' AND v_text::integer <> 0 THEN
        RAISE EXCEPTION 'TONART_PLAN_PRINCIPAL_IS_NOT_COINS' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'model_selection_limit' THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+$' OR v_pieces IS NULL
         OR v_text::integer <> v_pieces THEN
        RAISE EXCEPTION 'TONART_PLAN_MODEL_COUNT_INVALID' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'is_active' THEN
      IF v_text NOT IN ('true', 'false') OR (v_type = 'anual' AND v_text = 'true') THEN
        RAISE EXCEPTION 'Invalid subscription plan active flag' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF v_text IS NULL THEN
      v_assignments := array_append(v_assignments, format('%I = NULL', v_key));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, 'NULL');
    ELSIF v_key IN (
      'price', 'price_full', 'price_pix', 'coins_included',
      'coin_bonus_per_shipment', 'coin_bonus_cap',
      'deliveries_per_cycle', 'deliveries_total', 'model_selection_limit'
    ) THEN
      v_assignments := array_append(v_assignments, format('%I = %s', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, v_text);
    ELSIF v_key = 'is_active' THEN
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text::boolean));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text::boolean));
    ELSE
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text));
    END IF;
  END LOOP;

  IF v_type <> '' THEN
    IF p_data->>'price_full' IS DISTINCT FROM p_data->>'price_pix'
       OR p_data->>'price_full' IS DISTINCT FROM p_data->>'price' THEN
      RAISE EXCEPTION 'TONART_PLAN_PRICE_MUST_BE_ONE_TIME_TOTAL' USING ERRCODE = '22023';
    END IF;
    IF p_data->>'deliveries_total' IS DISTINCT FROM p_data->>'model_selection_limit'
       OR p_data->>'deliveries_total' IS DISTINCT FROM p_data->>'deliveries_per_cycle' THEN
      RAISE EXCEPTION 'TONART_PLAN_PIECE_COUNT_MISMATCH' USING ERRCODE = '22023';
    END IF;
    IF COALESCE((p_data->>'coin_bonus_cap')::numeric, 0)
       < COALESCE((p_data->>'coin_bonus_per_shipment')::numeric, 0) THEN
      RAISE EXCEPTION 'TONART_PLAN_COIN_BONUS_INVALID' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_assignments := array_append(v_assignments, 'updated_at = now()');
  IF p_plan_id IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.subscription_plans SET %s WHERE id = %L RETURNING id',
      array_to_string(v_assignments, ', '), p_plan_id
    ) INTO v_result_id;
  ELSE
    EXECUTE format(
      'INSERT INTO public.subscription_plans (%s) VALUES (%s) RETURNING id',
      array_to_string(v_columns, ', '), array_to_string(v_values, ', ')
    ) INTO v_result_id;
  END IF;
  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb)
  TO authenticated, service_role;

-- One-time plans retain the configured catalog+payment workflow and persist
-- the exact eligible model set and commercial terms in the customer contract.
CREATE OR REPLACE FUNCTION private_api.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_selected_model_slugs text[],
  p_payment_method text,
  p_payment_voucher_url text,
  p_checkout_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  v_voucher_path text := NULLIF(btrim(COALESCE(p_payment_voucher_url, '')), '');
  v_selected text[] := COALESCE(p_selected_model_slugs, '{}'::text[]);
  v_plan record;
  v_collection record;
  v_amount numeric(10,2);
  v_reference text;
  v_notes text := 'Comprovante armazenado em Storage privado; compra integral de peças.';
  v_subscription public.subscriptions%ROWTYPE;
  v_payment public.manual_payments%ROWTYPE;
  v_retry_payment public.manual_payments%ROWTYPE;
  v_distinct_count integer;
  v_cutoff_days integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF lower(COALESCE((
    SELECT setting.value FROM public.system_settings setting
     WHERE setting.key = 'tonart_collection_commerce_enabled'
  ), 'false')) <> 'true' THEN
    RAISE EXCEPTION 'TONART_COLLECTION_COMMERCE_DISABLED' USING ERRCODE = '55000';
  END IF;
  IF p_plan_id IS NULL OR p_collection_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_AND_COLLECTION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_checkout_request_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_IDEMPOTENCY_KEY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_method IS NULL OR v_method NOT IN ('pix', 'credit_card') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;
  IF v_voucher_path IS NULL OR length(v_voucher_path) > 512 OR v_voucher_path !~
    '^subscriptions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    OR split_part(v_voucher_path, '/', 2) <> v_user_id::text THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_VOUCHER_PATH' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_collection_id::text, 491036));

  SELECT * INTO v_subscription
    FROM public.subscriptions
   WHERE user_id = v_user_id AND checkout_request_id = p_checkout_request_id
   FOR UPDATE;
  IF FOUND THEN
    IF v_subscription.plan_id IS DISTINCT FROM p_plan_id
       OR v_subscription.collection_id IS DISTINCT FROM p_collection_id
       OR v_subscription.selected_model_slugs IS DISTINCT FROM v_selected
       OR lower(COALESCE(v_subscription.payment_method, '')) IS DISTINCT FROM v_method THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_IDEMPOTENCY_KEY_CONFLICT' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_retry_payment
      FROM public.manual_payments
     WHERE subscription_id = v_subscription.id
     ORDER BY created_at DESC, id DESC
     LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_PAYMENT_RECORD_MISSING' USING ERRCODE = '55000';
    END IF;
    RETURN jsonb_build_object(
      'subscription', to_jsonb(v_subscription),
      'payment', to_jsonb(v_retry_payment),
      'idempotent', true
    );
  END IF;

  -- A browser reload may lose its request key. The existing business rule
  -- allows only one active/pending contract per customer+collection, so the
  -- same exact contract inputs resolve to that committed operation.
  SELECT * INTO v_subscription
    FROM public.subscriptions
   WHERE user_id = v_user_id
     AND collection_id = p_collection_id
     AND status::text IN ('active', 'pending_payment')
   ORDER BY created_at DESC, id DESC
   LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    IF v_subscription.plan_snapshot IS NOT NULL
       AND v_subscription.plan_id = p_plan_id
       AND v_subscription.selected_model_slugs IS NOT DISTINCT FROM v_selected
       AND lower(COALESCE(v_subscription.payment_method, '')) = v_method THEN
      SELECT * INTO v_retry_payment
        FROM public.manual_payments
       WHERE subscription_id = v_subscription.id
       ORDER BY created_at DESC, id DESC
       LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_PAYMENT_RECORD_MISSING' USING ERRCODE = '55000';
      END IF;
      RETURN jsonb_build_object(
        'subscription', to_jsonb(v_subscription),
        'payment', to_jsonb(v_retry_payment),
        'idempotent', true
      );
    END IF;
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_EXISTS' USING ERRCODE = '23505';
  END IF;

  SELECT id, name, description, plan_type, price_full, price_pix, deliveries_total,
         model_selection_limit, coin_bonus_per_shipment, coin_bonus_cap, is_active
    INTO v_plan
    FROM public.subscription_plans
   WHERE id = p_plan_id
   FOR SHARE;
  IF NOT FOUND OR v_plan.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_plan.plan_type NOT IN ('avulso', 'trimestral', 'semestral')
     OR v_plan.model_selection_limit IS NULL
     OR v_plan.deliveries_total IS NULL
     OR v_plan.model_selection_limit NOT IN (1, 3, 6)
     OR v_plan.deliveries_total <> v_plan.model_selection_limit THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;
  IF v_plan.price_full IS NULL OR v_plan.price_full <= 0
     OR v_plan.price_pix IS DISTINCT FROM v_plan.price_full THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PRICE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  SELECT id, catalog_model_slugs
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id AND is_active IS TRUE
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_collection.catalog_model_slugs IS NULL
     OR cardinality(v_collection.catalog_model_slugs) > 20
     OR cardinality(v_collection.catalog_model_slugs) < v_plan.model_selection_limit
     OR cardinality(v_collection.catalog_model_slugs) <> (
       SELECT count(DISTINCT slug) FROM unnest(v_collection.catalog_model_slugs) AS item(slug)
     )
     OR EXISTS (
       SELECT 1 FROM unnest(v_collection.catalog_model_slugs) AS item(slug)
        WHERE slug IS NULL OR slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
     ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_CURATION_INVALID' USING ERRCODE = '22023';
  END IF;
  IF p_selected_model_slugs IS NULL
     OR cardinality(v_selected) <> v_plan.model_selection_limit THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_COUNT_INVALID' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_selected) AS item(slug)
     WHERE slug IS NULL OR slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_distinct_count
    FROM (SELECT DISTINCT slug FROM unnest(v_selected) AS item(slug)) unique_slugs;
  IF v_distinct_count <> cardinality(v_selected) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_DUPLICATE' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_selected) AS selected(slug)
     WHERE NOT (selected.slug = ANY(v_collection.catalog_model_slugs))
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_NOT_IN_COLLECTION' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = v_user_id AND collection_id = p_collection_id
       AND status::text IN ('active', 'pending_payment')
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_EXISTS' USING ERRCODE = '23505';
  END IF;

  SELECT value::integer INTO v_cutoff_days
    FROM public.system_settings
   WHERE key = 'tonart_model_change_cutoff_days'
     AND value ~ '^[0-9]{1,3}$';
  IF v_cutoff_days IS NULL OR v_cutoff_days < 1 OR v_cutoff_days > 365 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_CHANGE_CUTOFF_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_amount := v_plan.price_full::numeric(10,2);
  v_reference := public.generate_payment_reference();

  INSERT INTO public.subscriptions (
    user_id, plan_id, plan_type, status, payment_status, collection_id,
    payment_method, total_paid, deliveries_total, notes, payment_voucher_path,
    payment_voucher_url, selected_model_slugs, collection_model_slugs_snapshot,
    checkout_request_id,
    plan_snapshot
  )
  VALUES (
    v_user_id, v_plan.id, v_plan.plan_type, 'pending_payment', 'pending', p_collection_id,
    v_method, 0, v_plan.deliveries_total, v_notes,
    v_voucher_path, NULL, v_selected, v_collection.catalog_model_slugs,
    p_checkout_request_id,
    jsonb_build_object(
      'contract_version', 2,
      'plan_id', v_plan.id,
      'plan_type', v_plan.plan_type,
      'plan_name', v_plan.name,
      'piece_count', v_plan.deliveries_total,
      'total_price_brl', v_amount,
      'currency', 'BRL',
      'payment_method', v_method,
      'payment_type', 'one_time',
      'coin_bonus_per_shipment', v_plan.coin_bonus_per_shipment,
      'coin_bonus_cap', v_plan.coin_bonus_cap,
      'model_change_cutoff_days', v_cutoff_days,
      'delivery_month_offsets', to_jsonb(ARRAY(SELECT n FROM generate_series(2, v_plan.deliveries_total + 1) AS n)),
      'selected_model_slugs', to_jsonb(v_selected),
      'collection_model_slugs', to_jsonb(v_collection.catalog_model_slugs),
      'confirmed_at', NULL
    )
  )
  RETURNING * INTO v_subscription;

  INSERT INTO public.manual_payments (
    reference_number, user_id, amount, currency, reference_type, reference_id,
    subscription_id, payment_type, status, payment_method, notes
  )
  VALUES (
    v_reference, v_user_id, v_amount, 'BRL', 'subscription', v_subscription.id::text,
    v_subscription.id, 'one_time', 'under_review', v_method, v_notes
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET payment_id = v_payment.id::text, updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_subscription;

  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_subscription), 'payment', to_jsonb(v_payment), 'idempotent', false
  );
END;
$$;

-- Preserve the actual payment confirmation time in the immutable contract snapshot.
CREATE OR REPLACE FUNCTION private_api.stamp_tonart_plan_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.plan_snapshot IS NOT NULL
     AND NEW.payment_status::text = 'paid'
     AND OLD.payment_status::text IS DISTINCT FROM 'paid'
     AND NULLIF(NEW.plan_snapshot->>'confirmed_at', '') IS NULL THEN
    NEW.total_paid := (NEW.plan_snapshot->>'total_price_brl')::numeric;
    NEW.plan_snapshot := jsonb_set(
      NEW.plan_snapshot, '{confirmed_at}', to_jsonb(now()), true
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.stamp_tonart_plan_confirmation()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS stamp_tonart_plan_confirmation ON public.subscriptions;
CREATE TRIGGER stamp_tonart_plan_confirmation
BEFORE UPDATE OF payment_status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION private_api.stamp_tonart_plan_confirmation();

-- Keep the existing manual payment record in step with the subscription's
-- verified status; approval/rejection remains an audited admin RPC operation.
CREATE OR REPLACE FUNCTION private_api.sync_tonart_plan_manual_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.plan_snapshot IS NULL
     OR NEW.payment_id IS NULL
     OR NEW.payment_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR NEW.payment_status::text IS NOT DISTINCT FROM OLD.payment_status::text THEN
    RETURN NEW;
  END IF;
  UPDATE public.manual_payments
     SET status = CASE NEW.payment_status::text
           WHEN 'paid' THEN 'approved'::public.payment_status
           WHEN 'rejected' THEN 'rejected'::public.payment_status
           ELSE NEW.payment_status
         END,
         approved_at = CASE WHEN NEW.payment_status::text = 'paid' THEN COALESCE(approved_at, now()) ELSE NULL END,
         approved_by = CASE WHEN NEW.payment_status::text = 'paid' THEN COALESCE(approved_by, auth.uid()) ELSE NULL END,
         rejection_reason = CASE WHEN NEW.payment_status::text = 'rejected' THEN NEW.payment_rejection_reason ELSE NULL END,
         updated_at = now()
   WHERE id = NEW.payment_id::uuid AND subscription_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.sync_tonart_plan_manual_payment_status()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS sync_subscription_manual_payment_status ON public.subscriptions;
DROP TRIGGER IF EXISTS sync_tonart_plan_manual_payment_status ON public.subscriptions;
CREATE TRIGGER sync_tonart_plan_manual_payment_status
AFTER UPDATE OF payment_status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION private_api.sync_tonart_plan_manual_payment_status();

REVOKE ALL ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text, uuid)
  FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text, uuid)
  TO authenticated, service_role;

-- Keep the old overload fail-closed, so clients must submit exact selection.
CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid, p_collection_id uuid, p_payment_method text,
  p_payment_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_REQUIRED' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid, p_collection_id uuid, p_selected_model_slugs text[],
  p_payment_method text, p_payment_voucher_url text, p_checkout_request_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $function$
  SELECT private_api.create_subscription_checkout_for_current_user(
    p_plan_id, p_collection_id, p_selected_model_slugs,
    p_payment_method, p_payment_voucher_url, p_checkout_request_id
  );
$function$;

REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text, uuid)
  TO authenticated, service_role;

-- Clients without a stable retry key cannot create a potentially duplicate order.
CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid, p_collection_id uuid, p_selected_model_slugs text[],
  p_payment_method text, p_payment_voucher_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_IDEMPOTENCY_KEY_REQUIRED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text)
  TO authenticated, service_role;

-- New contracts schedule the first real cycle two months after the purchase
-- month; legacy contracts retain the scheduler's former one-month offset.
CREATE OR REPLACE FUNCTION public.admin_schedule_subscription_deliveries(
  p_subscription_id uuid,
  p_plan_type text,
  p_entry_cycle_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requested_plan_type text := lower(NULLIF(btrim(COALESCE(p_plan_type, '')), ''));
  v_subscription record;
  v_entry_cycle public.cycles%ROWTYPE;
  v_existing_count integer;
  v_delivery_count integer;
  v_plan_type text;
  v_month integer;
  v_year integer;
  v_offset integer;
  v_cycle_json jsonb;
  v_cycle_id uuid;
  v_shipping_date date;
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_deliveries jsonb := '[]'::jsonb;
  v_bonus public.bonus_pieces%ROWTYPE;
  v_sixth_delivery_id uuid;
  i integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_subscription_id IS NULL OR p_entry_cycle_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_AND_ENTRY_CYCLE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.plan_id, s.plan_type AS subscription_plan_type,
         s.deliveries_total AS subscription_deliveries_total,
         s.plan_snapshot, s.payment_status,
         sp.plan_type AS configured_plan_type,
         sp.deliveries_total AS configured_deliveries_total
    INTO v_subscription
    FROM public.subscriptions s
    LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id
   WHERE s.id = p_subscription_id
   FOR UPDATE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_subscription.plan_id IS NULL OR v_subscription.configured_plan_type IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  IF v_subscription.plan_snapshot IS NOT NULL AND v_subscription.payment_status::text <> 'paid' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PAYMENT_NOT_CONFIRMED' USING ERRCODE = '22023';
  END IF;

  v_plan_type := lower(NULLIF(btrim(v_subscription.configured_plan_type), ''));
  IF v_subscription.subscription_plan_type IS NOT NULL
     AND lower(btrim(v_subscription.subscription_plan_type)) <> v_plan_type THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_TYPE_DRIFT' USING ERRCODE = '22023';
  END IF;
  IF v_requested_plan_type IS NOT NULL AND v_requested_plan_type <> v_plan_type THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_TYPE_MISMATCH' USING ERRCODE = '22023';
  END IF;

  v_delivery_count := COALESCE(
    NULLIF(v_subscription.subscription_deliveries_total, 0),
    NULLIF(v_subscription.configured_deliveries_total, 0)
  );
  IF v_subscription.plan_snapshot IS NOT NULL THEN
    v_delivery_count := (v_subscription.plan_snapshot->>'piece_count')::integer;
    IF v_delivery_count IS NULL OR v_delivery_count NOT IN (1, 3, 6) OR v_plan_type = 'anual' THEN
      RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_AVAILABLE' USING ERRCODE = '22023';
    END IF;
  ELSIF v_delivery_count IS NULL OR v_delivery_count < 1 OR v_delivery_count > 24 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  IF v_subscription.subscription_deliveries_total IS NOT NULL
     AND v_subscription.subscription_deliveries_total > 0
     AND v_subscription.configured_deliveries_total IS NOT NULL
     AND v_subscription.configured_deliveries_total > 0
     AND v_subscription.subscription_deliveries_total <> v_subscription.configured_deliveries_total THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_DRIFT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_entry_cycle FROM public.cycles WHERE id = p_entry_cycle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_CYCLE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_entry_cycle.month IS NULL OR v_entry_cycle.month < 1 OR v_entry_cycle.month > 12
     OR v_entry_cycle.year IS NULL OR v_entry_cycle.year < 2020 OR v_entry_cycle.year > 2100 THEN
    RAISE EXCEPTION 'ENTRY_CYCLE_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_existing_count FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id;
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_ALREADY_EXIST' USING ERRCODE = '23505';
  END IF;

  v_month := v_entry_cycle.month;
  v_year := v_entry_cycle.year;
  v_offset := CASE WHEN v_subscription.plan_snapshot IS NOT NULL THEN 2 ELSE 1 END;
  FOR i IN 1..v_delivery_count LOOP
    v_month := v_month + CASE WHEN i = 1 THEN v_offset ELSE 1 END;
    WHILE v_month > 12 LOOP
      v_month := v_month - 12;
      v_year := v_year + 1;
    END LOOP;

    v_cycle_json := public.admin_get_or_create_delivery_cycle(1, v_month, v_year);
    IF v_cycle_json IS NULL OR NULLIF(v_cycle_json->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_CYCLE_NOT_AVAILABLE' USING ERRCODE = '55000';
    END IF;
    v_cycle_id := (v_cycle_json->>'id')::uuid;
    v_shipping_date := NULLIF(v_cycle_json->>'shipping_date', '')::date;
    IF v_shipping_date IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_CYCLE_SHIPPING_DATE_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;
    PERFORM public.reserve_capacity(v_cycle_id, 1);

    INSERT INTO public.subscription_deliveries (
      subscription_id, cycle_id, delivery_number, delivery_order, collection_id,
      catalog_model_slug, status, delivery_date, shipping_date,
      expected_delivery_date, auto_maintained
    )
    VALUES (
      p_subscription_id, v_cycle_id, i, i,
      CASE WHEN v_subscription.plan_snapshot IS NULL THEN NULL ELSE
        (SELECT s.collection_id FROM public.subscriptions s WHERE s.id = p_subscription_id) END,
      CASE WHEN v_subscription.plan_snapshot IS NULL THEN NULL ELSE
        (SELECT s.selected_model_slugs[i] FROM public.subscriptions s WHERE s.id = p_subscription_id) END,
      'scheduled'::public.purchase_status, v_shipping_date, v_shipping_date,
      v_shipping_date::timestamptz, false
    )
    RETURNING * INTO v_delivery;
    v_deliveries := v_deliveries || jsonb_build_array(to_jsonb(v_delivery));
    IF i = 6 THEN v_sixth_delivery_id := v_delivery.id; END IF;
  END LOOP;

  -- A semestral plan now grants shipment Coins, never an extra physical piece.
  IF v_subscription.plan_snapshot IS NULL
     AND v_plan_type = 'semestral' AND v_sixth_delivery_id IS NOT NULL THEN
    INSERT INTO public.bonus_pieces (subscription_id, delivery_id, description, status)
    VALUES (p_subscription_id, v_sixth_delivery_id, 'Exclusive bonus piece for Semestral plan', 'pending')
    RETURNING * INTO v_bonus;
    UPDATE public.subscription_deliveries SET bonus_piece_id = v_bonus.id, updated_at = now()
     WHERE id = v_sixth_delivery_id;
  END IF;
  RETURN jsonb_build_object(
    'deliveries', v_deliveries,
    'bonusPiece', CASE WHEN v_bonus.id IS NULL THEN NULL ELSE to_jsonb(v_bonus) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid)
  TO authenticated, service_role;

-- Delivery identity and production start are immutable through the customer
-- flow. Existing legacy deliveries without a plan snapshot are unaffected.
CREATE OR REPLACE FUNCTION private_api.prepare_subscription_delivery_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_delivery_number integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_subscription FROM public.subscriptions WHERE id = NEW.subscription_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
    IF v_subscription.plan_snapshot IS NOT NULL THEN
      v_delivery_number := COALESCE(NEW.delivery_number, NEW.delivery_order);
      IF v_delivery_number IS NULL OR v_delivery_number < 1
         OR v_delivery_number > cardinality(v_subscription.selected_model_slugs) THEN
        RAISE EXCEPTION 'SUBSCRIPTION_DELIVERY_MODEL_NOT_CONFIGURED' USING ERRCODE = '22023';
      END IF;
      IF NEW.collection_id IS NULL THEN NEW.collection_id := v_subscription.collection_id; END IF;
      IF NEW.collection_id IS DISTINCT FROM v_subscription.collection_id THEN
        RAISE EXCEPTION 'SUBSCRIPTION_DELIVERY_COLLECTION_MISMATCH' USING ERRCODE = '22023';
      END IF;
      IF NEW.catalog_model_slug IS NULL THEN
        NEW.catalog_model_slug := v_subscription.selected_model_slugs[v_delivery_number];
      ELSIF NEW.catalog_model_slug IS DISTINCT FROM v_subscription.selected_model_slugs[v_delivery_number] THEN
        RAISE EXCEPTION 'SUBSCRIPTION_DELIVERY_MODEL_MISMATCH' USING ERRCODE = '22023';
      END IF;
    END IF;
    IF NEW.status::text = 'in_production' THEN
      NEW.production_started_at := COALESCE(NEW.production_started_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.production_started_at IS NOT NULL THEN
    NEW.production_started_at := OLD.production_started_at;
  ELSIF NEW.status::text = 'in_production' THEN
    NEW.production_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.prepare_subscription_delivery_contract()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS prepare_subscription_delivery_contract ON public.subscription_deliveries;
CREATE TRIGGER prepare_subscription_delivery_contract
BEFORE INSERT OR UPDATE ON public.subscription_deliveries
FOR EACH ROW EXECUTE FUNCTION private_api.prepare_subscription_delivery_contract();

-- Explicit customer choice with subscription/delivery row locks, server-side
-- cutoff, contract curation, uniqueness, and an append-only history row.
CREATE OR REPLACE FUNCTION private_api.change_subscription_delivery_model_for_current_user(
  p_delivery_id uuid,
  p_new_model_slug text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR COALESCE(private_api.is_current_admin(), false);
  v_subscription_id uuid;
  v_subscription public.subscriptions%ROWTYPE;
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_history public.collection_choice_history%ROWTYPE;
  v_previous_slug text;
  v_shipping_date date;
  v_cutoff_days integer;
  v_ip text;
  v_agent text;
BEGIN
  IF p_delivery_id IS NULL OR p_new_model_slug IS NULL
     OR p_new_model_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$' THEN
    RAISE EXCEPTION 'DELIVERY_AND_MODEL_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_user_id IS NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT subscription_id INTO v_subscription_id
    FROM public.subscription_deliveries WHERE id = p_delivery_id;
  IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_subscription FROM public.subscriptions
   WHERE id = v_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF NOT v_is_admin AND v_subscription.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_subscription.plan_snapshot IS NULL
     OR v_subscription.payment_status::text <> 'paid'
     OR v_subscription.status::text <> 'active' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_CHANGE_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_delivery FROM public.subscription_deliveries
   WHERE id = p_delivery_id AND subscription_id = v_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_delivery.status::text NOT IN ('scheduled', 'pending_choice', 'confirmed')
     OR v_delivery.production_started_at IS NOT NULL THEN
    RAISE EXCEPTION 'DELIVERY_MODEL_CHANGE_LOCKED' USING ERRCODE = '22023';
  END IF;
  IF p_new_model_slug = v_delivery.catalog_model_slug THEN
    SELECT * INTO v_history
      FROM public.collection_choice_history
     WHERE delivery_id = p_delivery_id AND new_model_slug = p_new_model_slug
     ORDER BY created_at DESC, id DESC
     LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'DELIVERY_MODEL_UNCHANGED' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object(
      'delivery', to_jsonb(v_delivery), 'history', to_jsonb(v_history), 'idempotent', true
    );
  END IF;
  IF NOT (p_new_model_slug = ANY(v_subscription.collection_model_slugs_snapshot)) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_NOT_IN_CONTRACT_CURATION' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.subscription_deliveries
     WHERE subscription_id = v_subscription_id
       AND id <> p_delivery_id
       AND catalog_model_slug = p_new_model_slug
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_ALREADY_SELECTED' USING ERRCODE = '23505';
  END IF;

  SELECT value::integer INTO v_cutoff_days
    FROM public.system_settings
   WHERE key = 'tonart_model_change_cutoff_days' AND value ~ '^[0-9]{1,3}$';
  IF v_cutoff_days IS NULL OR v_cutoff_days < 1 OR v_cutoff_days > 365 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_CHANGE_CUTOFF_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  v_shipping_date := COALESCE(v_delivery.shipping_date, v_delivery.delivery_date, v_delivery.expected_delivery_date::date);
  IF v_shipping_date IS NULL THEN
    RAISE EXCEPTION 'DELIVERY_SHIPPING_DATE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  IF (now() AT TIME ZONE 'America/Sao_Paulo')::date > (v_shipping_date - v_cutoff_days) THEN
    RAISE EXCEPTION 'DELIVERY_MODEL_CHANGE_CUTOFF_PASSED' USING ERRCODE = '22023';
  END IF;

  v_ip := public.delivery_cycle_validate_text(p_ip_address, 'ip address', 80, false);
  v_agent := public.delivery_cycle_validate_text(p_user_agent, 'user agent', 500, false);
  v_previous_slug := v_delivery.catalog_model_slug;
  UPDATE public.subscription_deliveries
     SET catalog_model_slug = p_new_model_slug, updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;
  INSERT INTO public.collection_choice_history (
    delivery_id, user_id, previous_collection_id, new_collection_id,
    previous_model_slug, new_model_slug, change_reason, changed_by_admin,
    admin_user_id, ip_address, user_agent
  )
  VALUES (
    p_delivery_id, v_subscription.user_id, v_subscription.collection_id,
    v_subscription.collection_id, v_previous_slug, p_new_model_slug,
    CASE WHEN v_is_admin THEN 'admin_override' ELSE 'manual' END,
    v_is_admin, CASE WHEN v_is_admin THEN auth.uid() ELSE NULL END,
    v_ip, v_agent
  )
  RETURNING * INTO v_history;
  RETURN jsonb_build_object('delivery', to_jsonb(v_delivery), 'history', to_jsonb(v_history));
END;
$$;
REVOKE ALL ON FUNCTION private_api.change_subscription_delivery_model_for_current_user(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.change_subscription_delivery_model_for_current_user(uuid, text, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.change_subscription_delivery_model_for_current_user(
  p_delivery_id uuid,
  p_new_model_slug text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $function$
  SELECT private_api.change_subscription_delivery_model_for_current_user(
    p_delivery_id, p_new_model_slug, p_ip_address, p_user_agent
  );
$function$;
REVOKE ALL ON FUNCTION public.change_subscription_delivery_model_for_current_user(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_subscription_delivery_model_for_current_user(uuid, text, text, text)
  TO authenticated, service_role;

-- Promote the existing immutable Coins ledger to centi-Coins and extend it with
-- reversible entries. Unique delivery reference plus the per-user lock makes
-- shipment grants idempotent and protects balance serialization.
ALTER TABLE public.tonecos_coin_entries
  ALTER COLUMN delta TYPE numeric(12,2) USING delta::numeric(12,2),
  ADD COLUMN IF NOT EXISTS reverses_entry_id uuid
    REFERENCES public.tonecos_coin_entries(id) ON DELETE RESTRICT;

ALTER TABLE public.tonecos_coin_entries
  DROP CONSTRAINT IF EXISTS tonecos_coin_entries_entry_type_check,
  DROP CONSTRAINT IF EXISTS tonecos_coin_entries_delta_check,
  DROP CONSTRAINT IF EXISTS tonecos_coin_direction,
  ADD CONSTRAINT tonecos_coin_entries_type_valid
    CHECK (entry_type IN (
      'admin_credit', 'purchase_spend', 'refund', 'shipment_bonus',
      'purchase_reversal', 'bonus_reversal', 'legacy_import'
    )) NOT VALID,
  ADD CONSTRAINT tonecos_coin_entries_delta_valid
    CHECK (delta <> 0) NOT VALID,
  ADD CONSTRAINT tonecos_coin_direction_valid
    CHECK (
      (entry_type IN ('purchase_spend', 'bonus_reversal') AND delta < 0)
      OR (entry_type IN ('admin_credit', 'refund', 'shipment_bonus', 'purchase_reversal') AND delta > 0)
      OR entry_type = 'legacy_import'
    ) NOT VALID;

ALTER TABLE public.tonecos_coin_entries
  ADD COLUMN IF NOT EXISTS imported_legacy_coin_transaction_id uuid,
  ADD COLUMN IF NOT EXISTS imported_legacy_wallet_id uuid;

-- Keep the optional history links when the old monolith tables exist, but do
-- not make the clean TONART baseline depend on tables it intentionally omits.
DO $legacy_coin_constraints$
BEGIN
  IF to_regclass('public.coin_transactions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'tonecos_coin_entries_legacy_transaction_fkey'
          AND conrelid = 'public.tonecos_coin_entries'::regclass
     ) THEN
    EXECUTE 'ALTER TABLE public.tonecos_coin_entries
      ADD CONSTRAINT tonecos_coin_entries_legacy_transaction_fkey
      FOREIGN KEY (imported_legacy_coin_transaction_id)
      REFERENCES public.coin_transactions(id) ON DELETE RESTRICT';
  END IF;
  IF to_regclass('public.user_coins') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'tonecos_coin_entries_legacy_wallet_fkey'
          AND conrelid = 'public.tonecos_coin_entries'::regclass
     ) THEN
    EXECUTE 'ALTER TABLE public.tonecos_coin_entries
      ADD CONSTRAINT tonecos_coin_entries_legacy_wallet_fkey
      FOREIGN KEY (imported_legacy_wallet_id)
      REFERENCES public.user_coins(id) ON DELETE RESTRICT';
  END IF;
END;
$legacy_coin_constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS tonecos_coin_entries_legacy_transaction_unique
  ON public.tonecos_coin_entries(imported_legacy_coin_transaction_id)
  WHERE imported_legacy_coin_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tonecos_coin_entries_legacy_wallet_unique
  ON public.tonecos_coin_entries(imported_legacy_wallet_id)
  WHERE imported_legacy_wallet_id IS NOT NULL;

-- Preserve legacy transaction history and reconcile aggregate balances only
-- when both authoritative legacy sources exist. The fresh project starts with
-- the append-only canonical ledger and has no legacy balance to import.
DO $legacy_coin_migration$
DECLARE
  v_balance_mismatch boolean;
BEGIN
  IF to_regclass('public.user_coins') IS NOT NULL
     AND to_regclass('public.coin_transactions') IS NOT NULL THEN
    EXECUTE 'LOCK TABLE public.user_coins, public.coin_transactions
      IN SHARE ROW EXCLUSIVE MODE';

    EXECUTE $sql$
      INSERT INTO public.tonecos_coin_entries (
        user_id, entry_type, delta, reference_key, reason, created_by, created_at,
        imported_legacy_coin_transaction_id
      )
      SELECT
        old_entry.user_id,
        'legacy_import',
        old_entry.amount::numeric(12,2),
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.tonecos_coin_entries existing
             WHERE existing.user_id = old_entry.user_id
               AND existing.reference_key = old_entry.id
          ) THEN gen_random_uuid()
          ELSE old_entry.id
        END,
        left(
          'Histórico Coins legado (' || old_entry.transaction_type::text || '): ' ||
          COALESCE(NULLIF(btrim(old_entry.description), ''), 'sem descrição'),
          500
        ),
        NULL,
        old_entry.created_at,
        old_entry.id
      FROM public.coin_transactions old_entry
      WHERE old_entry.amount <> 0
        AND NOT EXISTS (
          SELECT 1 FROM public.tonecos_coin_entries imported
           WHERE imported.imported_legacy_coin_transaction_id = old_entry.id
        )
      ON CONFLICT DO NOTHING
    $sql$;

    EXECUTE $sql$
      INSERT INTO public.tonecos_coin_entries (
        user_id, entry_type, delta, reference_key, reason, created_by, created_at,
        imported_legacy_wallet_id
      )
      SELECT
        wallet.user_id,
        'legacy_import',
        (wallet.balance::numeric(12,2) - COALESCE(SUM(old_entry.amount), 0))::numeric(12,2),
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.tonecos_coin_entries existing
             WHERE existing.user_id = wallet.user_id
               AND existing.reference_key = wallet.id
          ) THEN gen_random_uuid()
          ELSE wallet.id
        END,
        'Reconciliação do saldo histórico da carteira Coins',
        NULL,
        wallet.updated_at,
        wallet.id
      FROM public.user_coins wallet
      LEFT JOIN public.coin_transactions old_entry ON old_entry.user_id = wallet.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.tonecos_coin_entries imported
         WHERE imported.imported_legacy_wallet_id = wallet.id
      )
      GROUP BY wallet.id, wallet.user_id, wallet.balance, wallet.updated_at
      HAVING wallet.balance::numeric(12,2) - COALESCE(SUM(old_entry.amount), 0) <> 0
      ON CONFLICT DO NOTHING
    $sql$;

    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
          FROM public.user_coins wallet
          LEFT JOIN (
            SELECT e.user_id, SUM(e.delta) AS imported_balance
              FROM public.tonecos_coin_entries e
             WHERE e.imported_legacy_coin_transaction_id IS NOT NULL
                OR e.imported_legacy_wallet_id IS NOT NULL
             GROUP BY e.user_id
          ) imported ON imported.user_id = wallet.user_id
         WHERE COALESCE(imported.imported_balance, 0) <> wallet.balance
      )
    $sql$ INTO v_balance_mismatch;
    IF v_balance_mismatch THEN
      RAISE EXCEPTION 'TONART_LEGACY_COIN_BALANCE_RECONCILIATION_FAILED';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping legacy Coins import; public.user_coins and public.coin_transactions are not both provisioned.';
  END IF;

  IF to_regclass('public.coin_packages') IS NOT NULL THEN
    EXECUTE 'LOCK TABLE public.coin_packages IN SHARE ROW EXCLUSIVE MODE';
    EXECUTE 'UPDATE public.coin_packages SET is_active = false, updated_at = now() WHERE is_active IS TRUE';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.coin_packages FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regclass('public.user_coins') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.user_coins FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regclass('public.coin_transactions') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.coin_transactions FROM PUBLIC, anon, authenticated';
  END IF;
END;
$legacy_coin_migration$;

CREATE UNIQUE INDEX IF NOT EXISTS tonecos_coin_entries_reversal_unique
  ON public.tonecos_coin_entries(reverses_entry_id)
  WHERE reverses_entry_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_my_tonecos_coin_balance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'balance', COALESCE(sum(delta), 0)::numeric(12,2),
    'total_earned', COALESCE(sum(delta) FILTER (WHERE delta > 0), 0)::numeric(12,2),
    'total_spent', COALESCE(-sum(delta) FILTER (WHERE delta < 0), 0)::numeric(12,2),
    'entry_count', count(*)::bigint,
    'updated_at', max(created_at)
  )
  FROM public.tonecos_coin_entries
  WHERE user_id = (SELECT auth.uid());
$function$;
REVOKE ALL ON FUNCTION public.get_my_tonecos_coin_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tonecos_coin_balance() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.credit_tonecos_coins(
  p_user_id uuid, p_amount integer, p_reference_key uuid, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_existing public.tonecos_coin_entries%ROWTYPE;
  v_current numeric(12,2);
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_reference_key IS NULL
     OR p_amount IS NULL OR p_amount < 1 OR p_amount > 10000
     OR char_length(v_reason) < 4 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Invalid coin credit request' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Coin recipient not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 773042));
  SELECT * INTO v_existing FROM public.tonecos_coin_entries
   WHERE user_id = p_user_id AND reference_key = p_reference_key;
  IF FOUND THEN
    IF v_existing.entry_type <> 'admin_credit' OR v_existing.delta <> p_amount OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION 'Coin credit reference conflicts with different request' USING ERRCODE = '23505';
    END IF;
    SELECT COALESCE(sum(delta), 0)::numeric(12,2) INTO v_current
      FROM public.tonecos_coin_entries WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'user_id', p_user_id, 'credited', p_amount, 'balance', v_current,
      'transaction_id', v_existing.id, 'idempotent', true
    );
  END IF;
  SELECT COALESCE(sum(delta), 0)::numeric(12,2) INTO v_current
    FROM public.tonecos_coin_entries WHERE user_id = p_user_id;
  IF v_current + p_amount > 1000000 THEN
    RAISE EXCEPTION 'Coin balance cap exceeded' USING ERRCODE = '22003';
  END IF;
  INSERT INTO public.tonecos_coin_entries(user_id, entry_type, delta, reference_key, reason, created_by)
  VALUES (p_user_id, 'admin_credit', p_amount, p_reference_key, v_reason, v_actor)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object(
    'user_id', p_user_id, 'credited', p_amount, 'balance', v_current + p_amount,
    'transaction_id', v_id, 'idempotent', false
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.credit_tonecos_coins(uuid, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.credit_tonecos_coins(uuid, integer, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.reverse_tonecos_coin_entry(
  p_entry_id uuid, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_source public.tonecos_coin_entries%ROWTYPE;
  v_existing public.tonecos_coin_entries%ROWTYPE;
  v_type text;
  v_delta numeric(12,2);
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_balance numeric(12,2);
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_entry_id IS NULL OR char_length(v_reason) < 4 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Invalid Coins reversal request' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_source FROM public.tonecos_coin_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coins entry not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_source.user_id::text, 773042));
  SELECT * INTO v_existing FROM public.tonecos_coin_entries WHERE reverses_entry_id = p_entry_id;
  IF FOUND THEN
    IF v_existing.reason <> v_reason THEN
      RAISE EXCEPTION 'Coins reversal reference conflicts with different request' USING ERRCODE = '23505';
    END IF;
    SELECT COALESCE(sum(delta), 0)::numeric(12,2) INTO v_balance
      FROM public.tonecos_coin_entries WHERE user_id = v_source.user_id;
    RETURN jsonb_build_object(
      'transaction_id', v_existing.id, 'balance', v_balance, 'idempotent', true
    );
  END IF;
  IF v_source.entry_type = 'purchase_spend' AND v_source.delta < 0 THEN
    v_type := 'purchase_reversal';
    v_delta := -v_source.delta;
  ELSIF v_source.entry_type = 'shipment_bonus' AND v_source.delta > 0 THEN
    v_type := 'bonus_reversal';
    v_delta := -v_source.delta;
  ELSE
    RAISE EXCEPTION 'Coins entry type is not reversible' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(sum(delta), 0)::numeric(12,2) INTO v_balance
    FROM public.tonecos_coin_entries WHERE user_id = v_source.user_id;
  IF v_balance + v_delta < 0 THEN
    RAISE EXCEPTION 'Coins reversal would create a negative wallet balance' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.tonecos_coin_entries(
    user_id, entry_type, delta, reference_key, reverses_entry_id, reason, created_by
  )
  VALUES (
    v_source.user_id, v_type, v_delta, gen_random_uuid(), p_entry_id, v_reason, v_actor
  )
  RETURNING id INTO v_id;
  RETURN jsonb_build_object(
    'transaction_id', v_id, 'balance', v_balance + v_delta, 'idempotent', false
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.reverse_tonecos_coin_entry(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.reverse_tonecos_coin_entry(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_reverse_tonecos_coin_entry(
  p_entry_id uuid, p_reason text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.reverse_tonecos_coin_entry(p_entry_id, p_reason);
$function$;
REVOKE ALL ON FUNCTION public.admin_reverse_tonecos_coin_entry(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reverse_tonecos_coin_entry(uuid, text) TO authenticated, service_role;

-- Grant exactly once on each confirmed actual shipment for fully paid PIX
-- contracts. The ledger reference is the delivery UUID, and the same per-user
-- advisory lock serializes credits, reversals, and any future redemption.
CREATE OR REPLACE FUNCTION private_api.grant_tonecos_subscription_shipment_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_per_shipment numeric(12,2);
  v_bonus_cap numeric(12,2);
  v_already_granted numeric(12,2);
  v_bonus numeric(12,2);
  v_existing public.tonecos_coin_entries%ROWTYPE;
BEGIN
  IF NEW.status::text NOT IN ('shipped', 'delivered')
     OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_subscription FROM public.subscriptions
   WHERE id = NEW.subscription_id;
  IF NOT FOUND OR v_subscription.plan_snapshot IS NULL
     OR v_subscription.payment_status::text <> 'paid'
     OR lower(COALESCE(v_subscription.payment_method, '')) <> 'pix'
     OR lower(COALESCE(v_subscription.plan_snapshot->>'payment_method', '')) <> 'pix'
     OR v_subscription.plan_snapshot->>'payment_type' <> 'one_time'
     OR v_subscription.total_paid IS DISTINCT FROM (v_subscription.plan_snapshot->>'total_price_brl')::numeric THEN
    RETURN NEW;
  END IF;
  v_per_shipment := COALESCE((v_subscription.plan_snapshot->>'coin_bonus_per_shipment')::numeric, 0);
  v_bonus_cap := COALESCE((v_subscription.plan_snapshot->>'coin_bonus_cap')::numeric, 0);
  IF v_per_shipment <= 0 OR v_bonus_cap < v_per_shipment THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_subscription.user_id::text, 773042));
  SELECT * INTO v_existing FROM public.tonecos_coin_entries
   WHERE user_id = v_subscription.user_id AND reference_key = NEW.id;
  IF FOUND THEN
    IF v_existing.entry_type <> 'shipment_bonus' THEN
      RAISE EXCEPTION 'Coins shipment bonus reference conflict' USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(sum(entry.delta), 0)::numeric(12,2)
       + COALESCE((
           SELECT sum(reversal.delta)
             FROM public.tonecos_coin_entries reversal
             JOIN public.tonecos_coin_entries original ON original.id = reversal.reverses_entry_id
             JOIN public.subscription_deliveries source_delivery ON source_delivery.id = original.reference_key
            WHERE original.user_id = v_subscription.user_id
              AND original.entry_type = 'shipment_bonus'
              AND reversal.entry_type = 'bonus_reversal'
              AND source_delivery.subscription_id = v_subscription.id
         ), 0)
    INTO v_already_granted
    FROM public.tonecos_coin_entries entry
    JOIN public.subscription_deliveries source_delivery ON source_delivery.id = entry.reference_key
   WHERE entry.user_id = v_subscription.user_id
     AND entry.entry_type = 'shipment_bonus'
     AND source_delivery.subscription_id = v_subscription.id;
  v_bonus := LEAST(v_per_shipment, GREATEST(v_bonus_cap - v_already_granted, 0));
  IF v_bonus <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.tonecos_coin_entries(
    user_id, entry_type, delta, reference_key, reason, created_by
  )
  VALUES (
    v_subscription.user_id, 'shipment_bonus', v_bonus, NEW.id,
    'Bônus Coins PIX · envio ' || left(NEW.id::text, 8), NULL
  );
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private_api.grant_tonecos_subscription_shipment_bonus()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS grant_tonecos_subscription_shipment_bonus ON public.subscription_deliveries;
CREATE TRIGGER grant_tonecos_subscription_shipment_bonus
AFTER UPDATE OF status ON public.subscription_deliveries
FOR EACH ROW EXECUTE FUNCTION private_api.grant_tonecos_subscription_shipment_bonus();

-- Customer quotes, plan principal, and their historical payment records are no
-- longer a Coins spend or minting path. Preserve wrappers for old clients but
-- fail closed with an explicit business-rule error.
CREATE OR REPLACE FUNCTION private_api.apply_tonecos_coins_to_quote(
  p_quote_id uuid, p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  RAISE EXCEPTION 'QUOTE_COINS_NOT_ELIGIBLE' USING ERRCODE = '22023';
END;
$function$;
REVOKE ALL ON FUNCTION private_api.apply_tonecos_coins_to_quote(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.apply_tonecos_coins_to_quote(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RAISE EXCEPTION 'SUBSCRIPTION_PRINCIPAL_IS_NOT_COINS' USING ERRCODE = '22023';
END;
$function$;
REVOKE ALL ON FUNCTION private_api.admin_process_subscription_payment(uuid, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_process_subscription_payment(uuid, numeric, text, text)
  TO authenticated, service_role;

-- Preserve the old RPC contract while keeping plan principal out of the Coins ledger.
CREATE OR REPLACE FUNCTION public.admin_process_subscription_payment(
  p_subscription_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_external_reference text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_process_subscription_payment(
    p_subscription_id, p_amount, p_payment_method, p_external_reference
  );
$function$;
REVOKE ALL ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_subscription_payment(uuid, numeric, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tonart_admin_customer_coins_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'Customer profile not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'balance', COALESCE(sum(e.delta), 0)::numeric(12,2),
      'total_earned', COALESCE(sum(e.delta) FILTER (WHERE e.delta > 0), 0)::numeric(12,2),
      'total_spent', COALESCE(-sum(e.delta) FILTER (WHERE e.delta < 0), 0)::numeric(12,2),
      'entry_count', count(*)::bigint,
      'updated_at', max(e.created_at)
    )
    FROM public.tonecos_coin_entries e WHERE e.user_id = p_user_id
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.tonart_admin_customer_coins_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tonart_admin_customer_coins_balance(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_production_setting(p_key text, p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text := public.admin_validate_setting_key(p_key);
  v_value text := public.admin_validate_setting_value(p_value, 64);
  v_number integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF v_key NOT IN (
    'monthly_production_limit', 'production_days_min', 'shipping_business_days',
    'sales_duration_days', 'delivery_interval_days', 'monthly_capacity',
    'tonart_model_change_cutoff_days'
  ) THEN
    RAISE EXCEPTION 'Invalid production setting key' USING ERRCODE = '22023';
  END IF;
  IF v_value !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Production setting must be a non-negative integer' USING ERRCODE = '22023';
  END IF;
  v_number := v_value::integer;
  IF v_number < 1
     OR (v_key = 'tonart_model_change_cutoff_days' AND v_number > 365)
     OR (v_key IN ('production_days_min', 'shipping_business_days', 'sales_duration_days', 'delivery_interval_days') AND v_number > 365)
     OR (v_key IN ('monthly_production_limit', 'monthly_capacity') AND v_number > 100000) THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (v_key, v_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN v_key;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_production_setting(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_production_setting(text, text)
  TO authenticated, service_role;

-- Keep compatibility entry points but fail closed so no new operation writes
-- to the retired aggregate wallet or its catalog-independent purchase tables.
CREATE OR REPLACE FUNCTION public.admin_add_coins_to_user(
  p_user_id uuid, p_amount integer, p_description text DEFAULT NULL,
  p_reference_id text DEFAULT NULL, p_reference_type text DEFAULT 'admin_adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Retired compatibility RPC; keep it fail-closed without depending on the
  -- removed legacy admin helper.
  RAISE EXCEPTION 'LEGACY_COIN_WALLET_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.initialize_current_user_coin_balance(
  p_initial_amount integer DEFAULT 0, p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LEGACY_COIN_WALLET_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_current_user_coin_balance(integer, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.coin_debit_user_balance(
  p_user_id uuid, p_amount integer, p_description text, p_reference_id uuid,
  p_reference_type text, p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LEGACY_COIN_WALLET_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.coin_debit_user_balance(uuid, integer, text, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purchase_character_with_coins(p_user_id uuid, p_character_id uuid)
RETURNS TABLE(success boolean, message text, new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LEGACY_COIN_PURCHASE_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_character_with_coins(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purchase_collection_with_coins(p_user_id uuid, p_collection_id uuid)
RETURNS TABLE(success boolean, message text, new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LEGACY_COIN_PURCHASE_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_collection_with_coins(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refund_coin_purchase_for_current_user(
  p_item_id text, p_item_type text, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LEGACY_COIN_PURCHASE_DISABLED' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON COLUMN public.subscriptions.plan_snapshot IS
  'Immutable checkout terms for the purchased-piece plan, payment, Coins bonus and model-change cutoff.';
COMMENT ON COLUMN public.subscriptions.collection_model_slugs_snapshot IS
  'Curated canonical catalog model slugs valid for this contract even if collection curation later changes.';
COMMENT ON COLUMN public.subscription_deliveries.catalog_model_slug IS
  'Canonical catalog slug assigned to this contract delivery; never a copied catalog record.';
COMMENT ON COLUMN public.subscription_deliveries.production_started_at IS
  'First server-recorded transition into production; model choices cannot change afterward.';
COMMENT ON COLUMN public.tonecos_coin_entries.delta IS
  'Signed Coins amount with two decimal places. The immutable ledger remains the only wallet balance source.';
COMMENT ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid) IS
  'Schedules existing configured shipping cycles; new purchased-piece contracts start in month two and use the contract model order.';
COMMENT ON FUNCTION private_api.change_subscription_delivery_model_for_current_user(uuid, text, text, text) IS
  'Owner-only contract model change; locks subscription and delivery, validates snapshot curation, production start, duplicate choices and configured cutoff.';

-- Preserve the existing admin overview RPC and expose reversal links so the
-- current ledger UI can show which immutable entries already have a reversal.
CREATE OR REPLACE FUNCTION private_api.tonart_admin_workspace_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'profileCount', (SELECT count(*)::int FROM public.profiles),
    'quoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL),
    'pendingQuoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND status = 'pending'),
    'reviewingQuoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND status = 'reviewing'),
    'answeredQuoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND status = 'answered'),
    'archivedQuoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND status = 'archived'),
    'pricedQuoteCount', (SELECT count(*)::int FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND total_amount > 0 AND status IN ('answered', 'archived')),
    'quotedTotalCents', (SELECT COALESCE(sum(round(total_amount * 100)), 0)::bigint FROM public.quotes WHERE catalog_requested_at IS NOT NULL AND total_amount > 0 AND status IN ('answered', 'archived')),
    'recentQuotes', (
      SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', q.id, 'status', q.status, 'customerEmail', q.email,
        'createdAt', q.created_at, 'quotedAmountCents', q.quoted_amount_cents,
        'modelCount', q.model_count
      ) ORDER BY q.created_at DESC, q.id DESC), '[]'::jsonb)
      FROM (
        SELECT cq.id, cq.status, p.email, cq.created_at,
          CASE WHEN cq.status IN ('answered', 'archived') AND cq.total_amount > 0
            THEN round(cq.total_amount * 100)::bigint ELSE NULL END AS quoted_amount_cents,
          jsonb_array_length(cq.requested_catalog_models) AS model_count
        FROM public.quotes cq
        LEFT JOIN public.profiles p ON p.id = cq.user_id
        WHERE cq.catalog_requested_at IS NOT NULL
        ORDER BY cq.created_at DESC, cq.id DESC
        LIMIT 25
      ) q
    ),
    'coinEntryCount', (SELECT count(*)::int FROM public.tonecos_coin_entries),
    'recentProfiles', (
      SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', p.id, 'email', p.email, 'fullName', p.full_name, 'createdAt', p.created_at
      ) ORDER BY p.created_at DESC, p.id DESC), '[]'::jsonb)
      FROM (
        SELECT id, email, full_name, created_at FROM public.profiles
        ORDER BY created_at DESC, id DESC LIMIT 25
      ) p
    ),
    'recentCoinEntries', (
      SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', e.id, 'userId', e.user_id, 'userEmail', e.email,
        'type', e.entry_type, 'delta', e.delta, 'reason', e.reason,
        'createdAt', e.created_at, 'reversesEntryId', e.reverses_entry_id
      ) ORDER BY e.created_at DESC, e.id DESC), '[]'::jsonb)
      FROM (
        SELECT ce.id, ce.user_id, p.email, ce.entry_type, ce.delta,
               ce.reason, ce.created_at, ce.reverses_entry_id
        FROM public.tonecos_coin_entries ce
        LEFT JOIN public.profiles p ON p.id = ce.user_id
        ORDER BY ce.created_at DESC, ce.id DESC
        LIMIT 25
      ) e
    )
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.tonart_admin_workspace_overview()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.tonart_admin_workspace_overview()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tonart_admin_workspace_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.tonart_admin_workspace_overview();
$function$;
REVOKE ALL ON FUNCTION public.tonart_admin_workspace_overview()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tonart_admin_workspace_overview()
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
