BEGIN;

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
    'production_days_max',
    'shipping_business_days',
    'sales_duration_days',
    'delivery_interval_days',
    'character_choice_days',
    'balance_payment_days'
  ) THEN
    RAISE EXCEPTION 'Invalid production setting key' USING ERRCODE = '22023';
  END IF;

  IF v_value !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Production setting must be a positive integer' USING ERRCODE = '22023';
  END IF;

  v_number := v_value::integer;

  IF v_number < 1 THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  IF v_key = 'monthly_production_limit' AND v_number > 100000 THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  IF v_key IN ('shipping_business_days') AND v_number > 31 THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  IF v_key IN ('character_choice_days', 'balance_payment_days') AND v_number > 365 THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  IF v_key IN (
    'production_days_min',
    'production_days_max',
    'sales_duration_days',
    'delivery_interval_days'
  ) AND v_number > 3650 THEN
    RAISE EXCEPTION 'Production setting out of range' USING ERRCODE = '22023';
  END IF;

  IF v_key = 'production_days_min'
     AND EXISTS (
       SELECT 1
         FROM public.system_settings
        WHERE key = 'production_days_max'
          AND value ~ '^[0-9]+$'
          AND value::integer < v_number
     ) THEN
    RAISE EXCEPTION 'production_days_min cannot exceed production_days_max' USING ERRCODE = '22023';
  END IF;

  IF v_key = 'production_days_max'
     AND EXISTS (
       SELECT 1
         FROM public.system_settings
        WHERE key = 'production_days_min'
          AND value ~ '^[0-9]+$'
          AND value::integer > v_number
     ) THEN
    RAISE EXCEPTION 'production_days_max cannot be lower than production_days_min' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (v_key, v_value, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_production_setting(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_production_setting(text, text)
  TO service_role;

COMMENT ON FUNCTION public.admin_update_production_setting(text, text) IS
  'Service-role admin gateway for canonical production capacity and operational deadline settings. Legacy monthly_capacity is rejected.';

NOTIFY pgrst, 'reload schema';

COMMIT;
