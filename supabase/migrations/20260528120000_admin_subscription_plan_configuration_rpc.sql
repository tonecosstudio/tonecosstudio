-- Admin subscription plan configuration SSOT.
-- Keeps subscription-plan writes behind the same validated RPC boundary used by
-- the rest of the admin configuration surface.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS price_full numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_pix numeric(10,2),
  ADD COLUMN IF NOT EXISTS deliveries_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_included integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_per_cycle integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slug text;

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
    'name',
    'description',
    'billing_interval',
    'plan_type',
    'slug',
    'price',
    'price_full',
    'price_pix',
    'coins_included',
    'deliveries_per_cycle',
    'deliveries_total',
    'is_active'
  ];
  v_allowed_plan_types text[] := ARRAY['avulso', 'bimestral', 'trimestral', 'semestral', 'anual'];
  v_key text;
  v_value jsonb;
  v_text text;
  v_assignments text[] := ARRAY[]::text[];
  v_columns text[] := ARRAY[]::text[];
  v_values text[] := ARRAY[]::text[];
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Subscription plan payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_plan_id IS NULL AND NULLIF(btrim(COALESCE(p_data->>'name', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Subscription plan name is required' USING ERRCODE = '22023';
  END IF;

  IF p_plan_id IS NULL AND NULLIF(btrim(COALESCE(p_data->>'plan_type', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Subscription plan type is required' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data)
  LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported subscription plan field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_data)
  LOOP
    v_text := NULLIF(btrim(COALESCE(v_value #>> '{}', '')), '');

    IF v_key IN ('name', 'slug') THEN
      v_text := public.admin_validate_setting_value(v_text, 120);
    ELSIF v_key = 'description' THEN
      IF v_text IS NOT NULL AND (length(v_text) > 500 OR v_text ~ '[[:cntrl:]<>]') THEN
        RAISE EXCEPTION 'Invalid subscription plan description' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('billing_interval', 'plan_type') THEN
      IF v_text IS NULL OR NOT v_text = ANY(v_allowed_plan_types) THEN
        RAISE EXCEPTION 'Invalid subscription plan type' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('price', 'price_full', 'price_pix') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]+)?$' OR v_text::numeric < 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid subscription plan price' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('coins_included', 'deliveries_per_cycle', 'deliveries_total') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+$' OR v_text::integer < 0 OR v_text::integer > 10000000 THEN
        RAISE EXCEPTION 'Invalid subscription plan quantity' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'is_active' THEN
      IF v_text NOT IN ('true', 'false') THEN
        RAISE EXCEPTION 'Invalid subscription plan active flag' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF v_text IS NULL THEN
      v_assignments := array_append(v_assignments, format('%I = NULL', v_key));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, 'NULL');
    ELSIF v_key IN ('price', 'price_full', 'price_pix', 'coins_included', 'deliveries_per_cycle', 'deliveries_total') THEN
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

  v_assignments := array_append(v_assignments, 'updated_at = now()');

  IF array_length(v_assignments, 1) IS NULL THEN
    RAISE EXCEPTION 'No supported subscription plan fields supplied' USING ERRCODE = '22023';
  END IF;

  IF p_plan_id IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.subscription_plans SET %s WHERE id = %L RETURNING id',
      array_to_string(v_assignments, ', '),
      p_plan_id
    ) INTO v_result_id;
  ELSE
    EXECUTE format(
      'INSERT INTO public.subscription_plans (%s) VALUES (%s) RETURNING id',
      array_to_string(v_columns, ', '),
      array_to_string(v_values, ', ')
    ) INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb) IS
  'Validated admin-only subscription plan configuration writer.';
