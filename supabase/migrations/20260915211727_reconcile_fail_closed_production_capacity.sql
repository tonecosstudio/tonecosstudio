BEGIN;

ALTER TABLE public.monthly_production
  ALTER COLUMN global_limit DROP DEFAULT;

ALTER TABLE public.cycles
  ALTER COLUMN capacity DROP DEFAULT,
  ALTER COLUMN capacity_max DROP DEFAULT,
  ALTER COLUMN capacity_limit DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'monthly_production_global_limit_positive'
      AND conrelid = 'public.monthly_production'::regclass
  ) THEN
    ALTER TABLE public.monthly_production
      ADD CONSTRAINT monthly_production_global_limit_positive
      CHECK (global_limit > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cycles_capacity_positive'
      AND conrelid = 'public.cycles'::regclass
  ) THEN
    ALTER TABLE public.cycles
      ADD CONSTRAINT cycles_capacity_positive
      CHECK (capacity IS NOT NULL AND capacity > 0) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_cycle_capacity_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_capacity := COALESCE(NEW.capacity, NEW.capacity_max, NEW.capacity_limit);
    IF v_capacity IS NULL OR v_capacity < 1 THEN
      RAISE EXCEPTION 'CYCLE_CAPACITY_REQUIRED' USING ERRCODE = '22023';
    END IF;

    NEW.capacity := v_capacity;
    NEW.capacity_max := v_capacity;
    NEW.capacity_limit := v_capacity;
    NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, NEW.capacity_current, NEW.reserved_capacity, 0), 0);
    NEW.capacity_current := NEW.used_capacity;
    NEW.reserved_capacity := NEW.used_capacity;
    RETURN NEW;
  END IF;

  IF NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    v_capacity := NEW.capacity;
  ELSIF NEW.capacity_max IS DISTINCT FROM OLD.capacity_max THEN
    v_capacity := NEW.capacity_max;
  ELSIF NEW.capacity_limit IS DISTINCT FROM OLD.capacity_limit THEN
    v_capacity := NEW.capacity_limit;
  ELSE
    v_capacity := COALESCE(NEW.capacity, NEW.capacity_max, NEW.capacity_limit);
  END IF;

  IF v_capacity IS NULL OR v_capacity < 1 THEN
    RAISE EXCEPTION 'CYCLE_CAPACITY_REQUIRED' USING ERRCODE = '22023';
  END IF;

  NEW.capacity := v_capacity;
  NEW.capacity_max := v_capacity;
  NEW.capacity_limit := v_capacity;

  IF NEW.used_capacity IS DISTINCT FROM OLD.used_capacity THEN
    NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, 0), 0);
  ELSIF NEW.capacity_current IS DISTINCT FROM OLD.capacity_current THEN
    NEW.used_capacity := GREATEST(COALESCE(NEW.capacity_current, 0), 0);
  ELSIF NEW.reserved_capacity IS DISTINCT FROM OLD.reserved_capacity THEN
    NEW.used_capacity := GREATEST(COALESCE(NEW.reserved_capacity, 0), 0);
  ELSE
    NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, NEW.capacity_current, NEW.reserved_capacity, 0), 0);
  END IF;

  NEW.capacity_current := NEW.used_capacity;
  NEW.reserved_capacity := NEW.used_capacity;

  IF NEW.used_capacity > v_capacity THEN
    RAISE EXCEPTION 'CYCLE_CAPACITY_EXCEEDED' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_capacity_available(
  p_cycle_id uuid,
  p_quantity integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
  v_used integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(capacity, capacity_max, capacity_limit),
         GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0)
    INTO v_capacity, v_used
    FROM public.cycles
   WHERE id = p_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_capacity IS NULL OR v_capacity < 1 THEN
    RAISE EXCEPTION 'CYCLE_CAPACITY_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  RETURN v_used + p_quantity <= v_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_current_cycle(
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  id uuid,
  cycle_number integer,
  month integer,
  year integer,
  shipping_date date,
  status text,
  capacity integer,
  used_capacity integer,
  capacity_max integer,
  capacity_current integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year integer := extract(year from timezone('America/Bahia', p_now))::integer;
  v_month integer := extract(month from timezone('America/Bahia', p_now))::integer;
  v_cycle_number integer := 1;
  v_open_start date := make_date(
    extract(year from timezone('America/Bahia', p_now))::integer,
    extract(month from timezone('America/Bahia', p_now))::integer,
    1
  );
  v_open_end date;
  v_production_start date;
  v_production_end date;
  v_shipping_date date;
  v_cycle_id uuid;
  v_capacity integer;
  v_raw_limit text;
BEGIN
  SELECT value::text
    INTO v_raw_limit
    FROM public.system_settings
   WHERE key = 'monthly_production_limit';

  IF v_raw_limit IS NULL OR btrim(v_raw_limit) !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_capacity := btrim(v_raw_limit)::integer;
  IF v_capacity < 1 OR v_capacity > 100000 THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  v_open_end := (v_open_start + interval '1 month - 1 day')::date;
  v_production_start := (v_open_start + interval '1 month')::date;
  v_production_end := (v_open_start + interval '2 months - 1 day')::date;
  v_shipping_date := (v_open_start + interval '2 months')::date;

  SELECT c.id
    INTO v_cycle_id
    FROM public.cycles c
   WHERE c.year = v_year
     AND c.month = v_month
     AND c.cycle_number = v_cycle_number
   LIMIT 1;

  IF v_cycle_id IS NULL THEN
    BEGIN
      INSERT INTO public.cycles (
        year, month, cycle_number, name, status,
        open_start, open_end, production_start, production_end,
        shipping_date, cutoff_date,
        sales_start_date, sales_end_date,
        production_start_date, production_end_date,
        shipping_start_date, shipping_end_date,
        capacity, used_capacity, capacity_max, capacity_current,
        capacity_limit, reserved_capacity
      )
      VALUES (
        v_year, v_month, v_cycle_number,
        v_year::text || '-' || lpad(v_month::text, 2, '0') || '-cycle-1',
        'open',
        v_open_start::timestamptz, v_open_end::timestamptz,
        v_production_start::timestamptz, v_production_end::timestamptz,
        v_shipping_date, v_open_end::timestamptz,
        v_open_start, v_open_end,
        v_production_start, v_production_end,
        v_shipping_date, v_shipping_date,
        v_capacity, 0, v_capacity, 0, v_capacity, 0
      )
      RETURNING public.cycles.id INTO v_cycle_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT c.id
        INTO v_cycle_id
        FROM public.cycles c
       WHERE c.year = v_year
         AND c.month = v_month
         AND c.cycle_number = v_cycle_number
       LIMIT 1;
    END;
  END IF;

  RETURN QUERY
  SELECT c.id,
         c.cycle_number,
         c.month,
         c.year,
         COALESCE(c.shipping_date, c.shipping_start_date),
         c.status::text,
         COALESCE(c.capacity, c.capacity_max, c.capacity_limit),
         GREATEST(COALESCE(c.used_capacity, c.capacity_current, c.reserved_capacity, 0), 0),
         COALESCE(c.capacity_max, c.capacity, c.capacity_limit),
         GREATEST(COALESCE(c.capacity_current, c.used_capacity, c.reserved_capacity, 0), 0)
    FROM public.cycles c
   WHERE c.id = v_cycle_id
     AND COALESCE(c.capacity, c.capacity_max, c.capacity_limit) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_production_limit()
RETURNS TABLE(
  prod_month integer,
  prod_year integer,
  prod_global_limit integer,
  prod_units_sold integer,
  prod_available integer,
  prod_is_closed boolean,
  prod_percentage_sold numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH current_period AS (
    SELECT
      EXTRACT(MONTH FROM CURRENT_DATE)::integer AS month,
      EXTRACT(YEAR FROM CURRENT_DATE)::integer AS year
  ),
  configured_limit AS (
    SELECT btrim(value::text)::integer AS value
      FROM public.system_settings
     WHERE key = 'monthly_production_limit'
       AND btrim(value::text) ~ '^[0-9]+$'
       AND btrim(value::text)::numeric BETWEEN 1 AND 100000
  ),
  resolved AS (
    SELECT
      period.month,
      period.year,
      COALESCE(production.global_limit, configured.value) AS global_limit,
      COALESCE(production.units_sold, 0) AS units_sold,
      COALESCE(production.is_closed, false) AS is_closed
    FROM current_period period
    CROSS JOIN configured_limit configured
    LEFT JOIN public.monthly_production production
      ON production.month = period.month
     AND production.year = period.year
  )
  SELECT
    month,
    year,
    global_limit,
    units_sold,
    GREATEST(global_limit - units_sold, 0),
    is_closed,
    ROUND(units_sold::numeric / global_limit::numeric * 100, 2)
  FROM resolved
  WHERE global_limit > 0;
$function$;

CREATE OR REPLACE FUNCTION public.are_sales_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH configured_limit AS (
    SELECT btrim(value::text)::integer AS value
      FROM public.system_settings
     WHERE key = 'monthly_production_limit'
       AND btrim(value::text) ~ '^[0-9]+$'
       AND btrim(value::text)::numeric BETWEEN 1 AND 100000
  ),
  current_state AS (
    SELECT mp.is_closed
      FROM public.monthly_production mp
     WHERE mp.month = EXTRACT(MONTH FROM CURRENT_DATE)::integer
       AND mp.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  )
  SELECT EXISTS (SELECT 1 FROM configured_limit)
     AND COALESCE((SELECT NOT is_closed FROM current_state), true);
$function$;

CREATE OR REPLACE FUNCTION public.increment_monthly_sales(quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  v_raw_limit text;
  v_configured_limit integer;
  v_global_limit integer;
  v_current_sold integer;
  v_is_closed boolean;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only trusted backends or admins can increment monthly sales' USING ERRCODE = '42501';
  END IF;

  IF quantity IS NULL OR quantity < 1 OR quantity > 1000 THEN
    RAISE EXCEPTION 'INVALID_MONTHLY_SALES_QUANTITY' USING ERRCODE = '22023';
  END IF;

  SELECT value::text
    INTO v_raw_limit
    FROM public.system_settings
   WHERE key = 'monthly_production_limit';

  IF v_raw_limit IS NULL OR btrim(v_raw_limit) !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_configured_limit := btrim(v_raw_limit)::integer;
  IF v_configured_limit < 1 OR v_configured_limit > 100000 THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_configured_limit)
  ON CONFLICT (month, year) DO NOTHING;

  SELECT global_limit, units_sold, is_closed
    INTO v_global_limit, v_current_sold, v_is_closed
    FROM public.monthly_production
   WHERE month = v_current_month
     AND year = v_current_year
   FOR UPDATE;

  IF NOT FOUND OR v_global_limit IS NULL OR v_global_limit < 1 THEN
    RAISE EXCEPTION 'CURRENT_PRODUCTION_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  IF v_is_closed THEN
    RAISE EXCEPTION 'CURRENT_MONTH_SALES_CLOSED' USING ERRCODE = '55000';
  END IF;

  IF v_current_sold + quantity > v_global_limit THEN
    RAISE EXCEPTION 'MONTHLY_PRODUCTION_LIMIT_REACHED' USING ERRCODE = '23514';
  END IF;

  UPDATE public.monthly_production
     SET units_sold = units_sold + quantity,
         is_closed = CASE WHEN units_sold + quantity >= v_global_limit THEN true ELSE is_closed END,
         closed_reason = CASE WHEN units_sold + quantity >= v_global_limit THEN 'automatic' ELSE closed_reason END,
         closed_at = CASE WHEN units_sold + quantity >= v_global_limit THEN now() ELSE closed_at END,
         updated_at = now()
   WHERE month = v_current_month
     AND year = v_current_year;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_cycle_capacity_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_capacity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_current_cycle(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_monthly_sales(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_production_setting(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_capacity_available(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_capacity(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_current_cycle(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_monthly_sales(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_setting(text, text) TO service_role;

COMMENT ON FUNCTION public.get_current_production_limit() IS
  'Reads current production capacity only when monthly_production_limit is valid; never falls back to a fabricated default.';
COMMENT ON FUNCTION public.are_sales_open() IS
  'Returns false when monthly production configuration is missing or invalid.';
COMMENT ON FUNCTION public.increment_monthly_sales(integer) IS
  'Atomically increments the persisted current-month limit; new months require a valid monthly_production_limit setting.';

NOTIFY pgrst, 'reload schema';

COMMIT;
