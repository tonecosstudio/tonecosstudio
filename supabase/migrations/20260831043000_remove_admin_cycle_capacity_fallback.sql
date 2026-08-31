BEGIN;

-- admin_get_or_create_delivery_cycle is still used by the admin scheduling path.
-- It must never invent capacity. Existing cycles keep their persisted capacity;
-- new cycles require an explicit capacity or the canonical monthly setting.
CREATE OR REPLACE FUNCTION public.admin_get_or_create_delivery_cycle(
  p_cycle_number integer,
  p_month integer,
  p_year integer,
  p_capacity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle public.cycles%ROWTYPE;
  v_capacity integer;
  v_raw_limit text;
  v_open_start date;
  v_open_end date;
  v_production_start date;
  v_production_end date;
  v_shipping_date date;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_cycle_number IS NULL OR p_cycle_number NOT IN (1, 2) THEN
    RAISE EXCEPTION 'INVALID_CYCLE_NUMBER' USING ERRCODE = '22023';
  END IF;

  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'INVALID_CYCLE_MONTH' USING ERRCODE = '22023';
  END IF;

  IF p_year IS NULL OR p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'INVALID_CYCLE_YEAR' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_cycle
    FROM public.cycles
   WHERE year = p_year
     AND month = p_month
     AND cycle_number = p_cycle_number
   LIMIT 1;

  IF FOUND THEN
    v_capacity := COALESCE(v_cycle.capacity, v_cycle.capacity_max, v_cycle.capacity_limit);
    IF v_capacity IS NULL OR v_capacity < 1 THEN
      RAISE EXCEPTION 'CYCLE_CAPACITY_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    RETURN to_jsonb(v_cycle);
  END IF;

  IF p_capacity IS NOT NULL THEN
    v_capacity := p_capacity;
  ELSE
    SELECT value::text
      INTO v_raw_limit
      FROM public.system_settings
     WHERE key = 'monthly_production_limit';

    IF v_raw_limit IS NULL OR btrim(v_raw_limit) !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'PRODUCTION_LIMIT_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    v_capacity := btrim(v_raw_limit)::integer;
  END IF;

  IF v_capacity < 1 OR v_capacity > 100000 THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  v_open_start := make_date(p_year, p_month, 1);
  v_open_end := (v_open_start + interval '1 month - 1 day')::date;
  v_production_start := (v_open_start + interval '1 month')::date;
  v_production_end := (v_open_start + interval '2 months - 1 day')::date;
  v_shipping_date := (v_open_start + interval '2 months')::date;

  BEGIN
    INSERT INTO public.cycles (
      year,
      month,
      cycle_number,
      name,
      status,
      open_start,
      open_end,
      production_start,
      production_end,
      shipping_date,
      cutoff_date,
      sales_start_date,
      sales_end_date,
      production_start_date,
      production_end_date,
      shipping_start_date,
      shipping_end_date,
      capacity,
      used_capacity,
      capacity_max,
      capacity_current,
      capacity_limit,
      reserved_capacity
    )
    VALUES (
      p_year,
      p_month,
      p_cycle_number,
      p_year::text || '-' || lpad(p_month::text, 2, '0') || '-cycle-' || p_cycle_number::text,
      'open',
      v_open_start::timestamptz,
      v_open_end::timestamptz,
      v_production_start::timestamptz,
      v_production_end::timestamptz,
      v_shipping_date,
      v_open_end::timestamptz,
      v_open_start,
      v_open_end,
      v_production_start,
      v_production_end,
      v_shipping_date,
      v_shipping_date,
      v_capacity,
      0,
      v_capacity,
      0,
      v_capacity,
      0
    )
    RETURNING * INTO v_cycle;
  EXCEPTION WHEN unique_violation THEN
    SELECT *
      INTO v_cycle
      FROM public.cycles
     WHERE year = p_year
       AND month = p_month
       AND cycle_number = p_cycle_number
     LIMIT 1;
  END;

  IF v_cycle.id IS NULL THEN
    RAISE EXCEPTION 'CYCLE_CREATION_FAILED' USING ERRCODE = '55000';
  END IF;

  RETURN to_jsonb(v_cycle);
END;
$$;

COMMENT ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) IS
  'Admin-only delivery-cycle lookup/creation. New cycles require explicit or configured production capacity; no numeric fallback is permitted.';

NOTIFY pgrst, 'reload schema';

COMMIT;
