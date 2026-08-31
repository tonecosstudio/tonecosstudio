BEGIN;

CREATE OR REPLACE FUNCTION private_api.validate_critical_system_setting(
  p_key text,
  p_value text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_key text := lower(NULLIF(btrim(COALESCE(p_key, '')), ''));
  v_value text := public.admin_validate_setting_value(p_value, 4000);
  v_numeric numeric;
  v_integer integer;
BEGIN
  IF v_key IN (
    'default_price_full',
    'default_price_pix',
    'default_deposit_amount',
    'pix_discount_percentage'
  ) THEN
    IF v_value !~ '^[0-9]+([.][0-9]+)?$' THEN
      RAISE EXCEPTION 'Invalid numeric system setting: %', v_key USING ERRCODE = '22023';
    END IF;

    v_numeric := v_value::numeric;

    IF v_key IN ('default_price_full', 'default_price_pix') AND v_numeric <= 0 THEN
      RAISE EXCEPTION 'System setting must be greater than zero: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'default_deposit_amount' AND v_numeric < 0 THEN
      RAISE EXCEPTION 'System setting cannot be negative: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'pix_discount_percentage' AND (v_numeric < 0 OR v_numeric > 100) THEN
      RAISE EXCEPTION 'PIX discount must be between 0 and 100' USING ERRCODE = '22023';
    END IF;
  ELSIF v_key IN (
    'max_installments_no_interest',
    'max_installments_with_interest',
    'monthly_production_limit',
    'production_days_min',
    'production_days_max',
    'shipping_business_days',
    'sales_duration_days',
    'delivery_interval_days',
    'character_choice_days',
    'balance_payment_days',
    'exchange_deadline_days',
    'days_to_next_delivery'
  ) THEN
    IF v_value !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Invalid integer system setting: %', v_key USING ERRCODE = '22023';
    END IF;

    v_integer := v_value::integer;

    IF v_key = 'exchange_deadline_days' THEN
      IF v_integer < 0 OR v_integer > 365 THEN
        RAISE EXCEPTION 'Exchange deadline out of range' USING ERRCODE = '22023';
      END IF;
    ELSIF v_integer < 1 THEN
      RAISE EXCEPTION 'System setting must be a positive integer: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key IN ('max_installments_no_interest', 'max_installments_with_interest')
       AND v_integer > 100 THEN
      RAISE EXCEPTION 'Installment count out of range' USING ERRCODE = '22023';
    END IF;

    IF v_key = 'monthly_production_limit' AND v_integer > 100000 THEN
      RAISE EXCEPTION 'Monthly production limit out of range' USING ERRCODE = '22023';
    END IF;

    IF v_key = 'shipping_business_days' AND v_integer > 31 THEN
      RAISE EXCEPTION 'Shipping business day out of range' USING ERRCODE = '22023';
    END IF;

    IF v_key IN ('character_choice_days', 'balance_payment_days') AND v_integer > 365 THEN
      RAISE EXCEPTION 'Operational deadline out of range: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key IN (
      'production_days_min',
      'production_days_max',
      'sales_duration_days',
      'delivery_interval_days',
      'days_to_next_delivery'
    ) AND v_integer > 3650 THEN
      RAISE EXCEPTION 'Operational duration out of range: %', v_key USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_system_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_key text;
  v_value text;
  v_count integer := 0;
  v_price_full numeric;
  v_price_pix numeric;
  v_deposit numeric;
  v_production_min integer;
  v_production_max integer;
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
    v_value := private_api.validate_critical_system_setting(v_key, v_value);

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

  SELECT value::numeric
    INTO v_price_full
    FROM public.system_settings
   WHERE key = 'default_price_full'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_price_pix
    FROM public.system_settings
   WHERE key = 'default_price_pix'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_deposit
    FROM public.system_settings
   WHERE key = 'default_deposit_amount'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  IF v_price_full IS NOT NULL AND v_price_pix IS NOT NULL AND v_price_pix > v_price_full THEN
    RAISE EXCEPTION 'PIX price cannot exceed full price' USING ERRCODE = '22023';
  END IF;

  IF v_deposit IS NOT NULL
     AND v_price_full IS NOT NULL
     AND v_price_pix IS NOT NULL
     AND v_deposit > LEAST(v_price_full, v_price_pix) THEN
    RAISE EXCEPTION 'Deposit cannot exceed configured sale prices' USING ERRCODE = '22023';
  END IF;

  SELECT value::integer
    INTO v_production_min
    FROM public.system_settings
   WHERE key = 'production_days_min'
     AND value ~ '^[0-9]+$';

  SELECT value::integer
    INTO v_production_max
    FROM public.system_settings
   WHERE key = 'production_days_max'
     AND value ~ '^[0-9]+$';

  IF v_production_min IS NOT NULL
     AND v_production_max IS NOT NULL
     AND v_production_max < v_production_min THEN
    RAISE EXCEPTION 'production_days_max cannot be lower than production_days_min' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

REVOKE ALL ON FUNCTION private_api.validate_critical_system_setting(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_system_settings(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_system_settings(jsonb)
  TO service_role;

COMMENT ON FUNCTION private_api.validate_critical_system_setting(text, text) IS
  'Server-side validation for commercial and operational system settings that must never rely on browser validation.';
COMMENT ON FUNCTION public.admin_upsert_system_settings(jsonb) IS
  'Admin settings upsert with server-side validation and cross-field integrity for critical commercial and operational values.';

NOTIFY pgrst, 'reload schema';

COMMIT;
