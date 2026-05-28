-- Admin settings and pricing RPCs.
-- Moves small admin mutations behind validated SECURITY DEFINER functions.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS collections_count integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_plans_collections_count_valid'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_collections_count_valid
      CHECK (collections_count = -1 OR collections_count > 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_setting_key(p_key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text := lower(NULLIF(btrim(COALESCE(p_key, '')), ''));
BEGIN
  IF v_key IS NULL OR v_key !~ '^[a-z][a-z0-9_]{1,79}$' THEN
    RAISE EXCEPTION 'Invalid setting key' USING ERRCODE = '22023';
  END IF;

  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_setting_value(
  p_value text,
  p_max_length integer DEFAULT 4000
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
    RAISE EXCEPTION 'Setting value is required' USING ERRCODE = '22023';
  END IF;

  IF length(v_value) > p_max_length OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid setting value' USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_system_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
  v_value text;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Settings update payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN
    SELECT key, value
    FROM jsonb_each_text(p_updates)
  LOOP
    v_key := public.admin_validate_setting_key(v_key);
    v_value := public.admin_validate_setting_value(v_value, 4000);

    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (v_key, v_value, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No settings supplied' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_setting(
  p_key text,
  p_value text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text := public.admin_validate_setting_key(p_key);
  v_value text := btrim(COALESCE(p_value, ''));
BEGIN
  PERFORM public.assert_admin_access();

  IF v_key NOT LIKE 'pix_key\_%' ESCAPE '\'
    AND v_key NOT LIKE 'payment_link\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'Invalid payment setting key' USING ERRCODE = '22023';
  END IF;

  IF length(v_value) > 1000 OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid payment setting value' USING ERRCODE = '22023';
  END IF;

  IF v_key LIKE 'payment_link\_%' ESCAPE '\'
    AND v_value <> ''
    AND v_value !~ '^https://[^[:space:]<>]{3,}$' THEN
    RAISE EXCEPTION 'Payment links must use HTTPS' USING ERRCODE = '22023';
  END IF;

  UPDATE public.system_settings
  SET value = v_value,
      updated_at = now()
  WHERE key = v_key
  RETURNING key INTO v_key;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Payment setting not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_setting(
  p_key text,
  p_value text
)
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
  PERFORM public.assert_admin_access();

  IF v_key NOT IN (
    'monthly_production_limit',
    'production_days_min',
    'shipping_business_days',
    'sales_duration_days',
    'delivery_interval_days',
    'monthly_capacity'
  ) THEN
    RAISE EXCEPTION 'Invalid production setting key' USING ERRCODE = '22023';
  END IF;

  IF v_value !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Production setting must be a positive integer' USING ERRCODE = '22023';
  END IF;

  v_number := v_value::integer;

  IF v_number < 1
    OR (v_key IN ('production_days_min', 'shipping_business_days', 'sales_duration_days', 'delivery_interval_days') AND v_number > 365)
    OR (v_key IN ('monthly_production_limit', 'monthly_capacity') AND v_number > 100000) THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (v_key, v_value, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription_plan_collection_limit(
  p_plan_id uuid,
  p_collections_count integer
)
RETURNS TABLE(id uuid, collections_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_access();

  IF p_collections_count <> -1
    AND (p_collections_count < 1 OR p_collections_count > 10000) THEN
    RAISE EXCEPTION 'Invalid collections count' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE public.subscription_plans sp
  SET collections_count = p_collections_count,
      updated_at = now()
  WHERE sp.id = p_plan_id
  RETURNING sp.id, sp.collections_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_standalone_pricing(
  p_updates jsonb,
  p_pix_discount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_price numeric;
  v_rows integer;
  v_count integer := 0;
  v_sets text[];
BEGIN
  PERFORM public.assert_admin_access();

  IF to_regclass('public.character_standalone_pricing') IS NULL THEN
    RAISE EXCEPTION 'Standalone pricing table not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'Standalone pricing updates must be an array' USING ERRCODE = '22023';
  END IF;

  IF p_pix_discount < 0 OR p_pix_discount > 100 THEN
    RAISE EXCEPTION 'Invalid PIX discount' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates)
  LOOP
    IF NULLIF(v_item->>'id', '') IS NULL THEN
      CONTINUE;
    END IF;

    v_id := (v_item->>'id')::uuid;
    v_price := (v_item->>'price')::numeric;

    IF v_price <= 0 OR v_price > 1000000 THEN
      RAISE EXCEPTION 'Invalid standalone price' USING ERRCODE = '22023';
    END IF;

    v_sets := ARRAY[format('%I = %L', 'price_full', v_price)];

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'character_standalone_pricing'
        AND column_name = 'price_pix'
    ) THEN
      v_sets := array_append(v_sets, format('%I = %L', 'price_pix', round(v_price * (1 - p_pix_discount / 100), 2)));
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'character_standalone_pricing'
        AND column_name = 'pix_discount_percentage'
    ) THEN
      v_sets := array_append(v_sets, format('%I = %L', 'pix_discount_percentage', p_pix_discount));
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'character_standalone_pricing'
        AND column_name = 'updated_at'
    ) THEN
      v_sets := array_append(v_sets, 'updated_at = now()');
    END IF;

    EXECUTE format(
      'UPDATE public.character_standalone_pricing SET %s WHERE id = %L',
      array_to_string(v_sets, ', '),
      v_id
    );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'Standalone pricing row not found' USING ERRCODE = 'P0002';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No standalone pricing rows supplied' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_collection_base_prices(
  p_subscription_price integer,
  p_standard_price integer,
  p_premium_price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_subscription_price < 1
    OR p_standard_price < 1
    OR p_premium_price < 1
    OR p_subscription_price > p_standard_price
    OR p_standard_price > p_premium_price THEN
    RAISE EXCEPTION 'Invalid collection base price hierarchy' USING ERRCODE = '22023';
  END IF;

  UPDATE public.collection_base_pricing cbp
  SET base_price_coins = CASE
        WHEN ct.name = 'subscription' THEN p_subscription_price
        WHEN ct.name IN ('standard_catalog', 'standard') THEN p_standard_price
        WHEN ct.name IN ('premium_catalog', 'premium') THEN p_premium_price
        ELSE cbp.base_price_coins
      END,
      updated_at = now()
  FROM public.collection_types ct
  WHERE cbp.collection_type_id = ct.id
    AND ct.name IN ('subscription', 'standard_catalog', 'standard', 'premium_catalog', 'premium');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'Collection base price rows are incomplete' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_pricing_context_multipliers(
  p_chosen_multiplier numeric,
  p_not_chosen_multiplier numeric,
  p_no_subscription_multiplier numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_chosen_multiplier < 0.1
    OR p_not_chosen_multiplier < 0.1
    OR p_no_subscription_multiplier < 0.1
    OR p_chosen_multiplier > 10
    OR p_not_chosen_multiplier > 10
    OR p_no_subscription_multiplier > 10
    OR p_chosen_multiplier > p_not_chosen_multiplier THEN
    RAISE EXCEPTION 'Invalid pricing multipliers' USING ERRCODE = '22023';
  END IF;

  UPDATE public.pricing_context_multipliers
  SET multiplier = CASE user_context
        WHEN 'subscribed_chosen' THEN p_chosen_multiplier
        WHEN 'subscribed_not_chosen' THEN p_not_chosen_multiplier
        WHEN 'no_subscription' THEN p_no_subscription_multiplier
        ELSE multiplier
      END,
      updated_at = now()
  WHERE user_context IN ('subscribed_chosen', 'subscribed_not_chosen', 'no_subscription');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Pricing context rows are incomplete' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_pricing_tier_plan(
  p_tier_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'name',
    'display_name',
    'price_coins',
    'price_brl',
    'price_full',
    'price_pix',
    'deposit_amount',
    'pix_discount_percentage',
    'is_active',
    'is_default',
    'description',
    'base_price'
  ];
  v_key text;
  v_value jsonb;
  v_text text;
  v_assignments text[] := ARRAY[]::text[];
  v_columns text[] := ARRAY[]::text[];
  v_values text[] := ARRAY[]::text[];
  v_result_id uuid;
  v_has_column boolean;
  v_base_price text;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Pricing tier payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_tier_id IS NULL AND NULLIF(btrim(COALESCE(p_data->>'name', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Pricing tier name is required' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data)
  LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported pricing tier field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_data)
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'pricing_tiers'
        AND column_name = v_key
    ) INTO v_has_column;

    IF NOT v_has_column THEN
      CONTINUE;
    END IF;

    v_text := NULLIF(btrim(COALESCE(v_value #>> '{}', '')), '');

    IF v_key IN ('name', 'display_name') THEN
      v_text := public.admin_validate_setting_value(v_text, 120);
    ELSIF v_key = 'description' THEN
      IF v_text IS NOT NULL AND (length(v_text) > 500 OR v_text ~ '[[:cntrl:]<>]') THEN
        RAISE EXCEPTION 'Invalid pricing tier description' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('price_coins') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+$' OR v_text::integer < 1 OR v_text::integer > 10000000 THEN
        RAISE EXCEPTION 'Invalid pricing tier coin price' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('price_brl', 'price_full', 'price_pix', 'base_price') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]+)?$' OR v_text::numeric <= 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid pricing tier price' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'deposit_amount' THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]+)?$' OR v_text::numeric < 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid pricing tier deposit' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'pix_discount_percentage' THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]+)?$' OR v_text::numeric < 0 OR v_text::numeric > 100 THEN
        RAISE EXCEPTION 'Invalid pricing tier PIX discount' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('is_active', 'is_default') THEN
      IF v_text NOT IN ('true', 'false') THEN
        RAISE EXCEPTION 'Invalid pricing tier boolean flag' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF v_text IS NULL THEN
      v_assignments := array_append(v_assignments, format('%I = NULL', v_key));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, 'NULL');
    ELSIF v_key IN ('price_coins', 'price_brl', 'price_full', 'price_pix', 'deposit_amount', 'base_price', 'pix_discount_percentage') THEN
      v_assignments := array_append(v_assignments, format('%I = %s', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, v_text);
    ELSIF v_key IN ('is_active', 'is_default') THEN
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text::boolean));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text::boolean));
    ELSE
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text));
    END IF;
  END LOOP;

  SELECT COALESCE(NULLIF(p_data->>'base_price', ''), NULLIF(p_data->>'price_full', ''), NULLIF(p_data->>'price_brl', ''))
    INTO v_base_price;

  IF v_base_price IS NOT NULL
    AND NOT (p_data ? 'base_price')
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'pricing_tiers'
        AND column_name = 'base_price'
    ) THEN
    IF v_base_price !~ '^[0-9]+(\.[0-9]+)?$' OR v_base_price::numeric <= 0 OR v_base_price::numeric > 1000000 THEN
      RAISE EXCEPTION 'Invalid pricing tier base price' USING ERRCODE = '22023';
    END IF;

    v_assignments := array_append(v_assignments, format('%I = %s', 'base_price', v_base_price));
    v_columns := array_append(v_columns, 'base_price');
    v_values := array_append(v_values, v_base_price);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pricing_tiers'
      AND column_name = 'updated_at'
  ) THEN
    v_assignments := array_append(v_assignments, 'updated_at = now()');
  END IF;

  IF array_length(v_assignments, 1) IS NULL THEN
    RAISE EXCEPTION 'No supported pricing tier fields supplied' USING ERRCODE = '22023';
  END IF;

  IF p_tier_id IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.pricing_tiers SET %s WHERE id = %L RETURNING id',
      array_to_string(v_assignments, ', '),
      p_tier_id
    ) INTO v_result_id;
  ELSE
    EXECUTE format(
      'INSERT INTO public.pricing_tiers (%s) VALUES (%s) RETURNING id',
      array_to_string(v_columns, ', '),
      array_to_string(v_values, ', ')
    ) INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_setting_key(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_setting_value(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_system_settings(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_payment_setting(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_setting(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_subscription_plan_collection_limit(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_standalone_pricing(jsonb, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_collection_base_prices(integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_pricing_context_multipliers(numeric, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_pricing_tier_plan(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_upsert_system_settings(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_setting(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_setting(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_plan_collection_limit(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_standalone_pricing(jsonb, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection_base_prices(integer, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_context_multipliers(numeric, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_pricing_tier_plan(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_upsert_system_settings(jsonb) IS
  'Admin-only validated system settings upsert.';
COMMENT ON FUNCTION public.admin_update_payment_setting(text, text) IS
  'Admin-only validated payment setting update.';
COMMENT ON FUNCTION public.admin_update_production_setting(text, text) IS
  'Admin-only validated production setting update.';
COMMENT ON FUNCTION public.admin_update_subscription_plan_collection_limit(uuid, integer) IS
  'Admin-only validated subscription plan collection limit update.';
COMMENT ON FUNCTION public.admin_update_standalone_pricing(jsonb, numeric) IS
  'Admin-only validated standalone pricing update.';
COMMENT ON FUNCTION public.admin_update_collection_base_prices(integer, integer, integer) IS
  'Admin-only validated collection base price update.';
COMMENT ON FUNCTION public.admin_update_pricing_context_multipliers(numeric, numeric, numeric) IS
  'Admin-only validated pricing context multiplier update.';
COMMENT ON FUNCTION public.admin_save_pricing_tier_plan(uuid, jsonb) IS
  'Admin-only validated pricing tier plan upsert.';

NOTIFY pgrst, 'reload schema';
