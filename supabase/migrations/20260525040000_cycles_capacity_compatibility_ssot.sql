-- Capacity SSOT compatibility layer for cycles.
-- Canonical fields are capacity and used_capacity; legacy aliases are kept synced.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cycle_status')
     AND NOT EXISTS (
       SELECT 1
         FROM pg_enum
        WHERE enumtypid = to_regtype('public.cycle_status')
          AND enumlabel = 'open'
     ) THEN
    ALTER TYPE public.cycle_status ADD VALUE 'open';
  END IF;
END $$;

ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS cycle_number integer DEFAULT 1;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS open_start timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS open_end timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS production_start timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS production_end timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS shipping_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS cutoff_date timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS reveal_date timestamptz;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS sales_start_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS sales_end_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS production_start_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS production_end_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS shipping_start_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS shipping_end_date date;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 100;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS used_capacity integer DEFAULT 0;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS capacity_max integer DEFAULT 100;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS capacity_current integer DEFAULT 0;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS capacity_limit integer DEFAULT 100;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS reserved_capacity integer DEFAULT 0;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

UPDATE public.cycles
   SET name = COALESCE(name, year::text || '-' || lpad(month::text, 2, '0') || '-cycle-' || COALESCE(cycle_number, 1)::text),
       cycle_number = COALESCE(cycle_number, 1),
       open_start = COALESCE(open_start, sales_start_date::timestamptz, make_date(year, month, 1)::timestamptz),
       open_end = COALESCE(
         open_end,
         sales_end_date::timestamptz,
         (make_date(year, month, 1) + interval '1 month - 1 day')::timestamptz
       ),
       production_start = COALESCE(
         production_start,
         production_start_date::timestamptz,
         (make_date(year, month, 1) + interval '1 month')::timestamptz
       ),
       production_end = COALESCE(
         production_end,
         production_end_date::timestamptz,
         (make_date(year, month, 1) + interval '2 months - 1 day')::timestamptz
       ),
       shipping_date = COALESCE(shipping_date, shipping_start_date, (make_date(year, month, 1) + interval '2 months')::date),
       cutoff_date = COALESCE(cutoff_date, open_end),
       sales_start_date = COALESCE(sales_start_date, open_start::date, make_date(year, month, 1)),
       sales_end_date = COALESCE(sales_end_date, open_end::date, (make_date(year, month, 1) + interval '1 month - 1 day')::date),
       production_start_date = COALESCE(production_start_date, production_start::date, (make_date(year, month, 1) + interval '1 month')::date),
       production_end_date = COALESCE(production_end_date, production_end::date, (make_date(year, month, 1) + interval '2 months - 1 day')::date),
       shipping_start_date = COALESCE(shipping_start_date, shipping_date, (make_date(year, month, 1) + interval '2 months')::date),
       shipping_end_date = COALESCE(shipping_end_date, shipping_start_date, shipping_date, (make_date(year, month, 1) + interval '2 months')::date),
       capacity = COALESCE(capacity, capacity_max, capacity_limit, 100),
       capacity_max = COALESCE(capacity_max, capacity, capacity_limit, 100),
       capacity_limit = COALESCE(capacity_limit, capacity, capacity_max, 100),
       used_capacity = GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0),
       capacity_current = GREATEST(COALESCE(capacity_current, used_capacity, reserved_capacity, 0), 0),
       reserved_capacity = GREATEST(COALESCE(reserved_capacity, used_capacity, capacity_current, 0), 0);

CREATE OR REPLACE FUNCTION public.sync_cycle_capacity_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.capacity := COALESCE(NEW.capacity, NEW.capacity_max, NEW.capacity_limit, 100);
    NEW.capacity_max := NEW.capacity;
    NEW.capacity_limit := NEW.capacity;
    NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, NEW.capacity_current, NEW.reserved_capacity, 0), 0);
    NEW.capacity_current := NEW.used_capacity;
    NEW.reserved_capacity := NEW.used_capacity;
  ELSE
    IF NEW.capacity IS DISTINCT FROM OLD.capacity THEN
      NEW.capacity_max := NEW.capacity;
      NEW.capacity_limit := NEW.capacity;
    ELSIF NEW.capacity_max IS DISTINCT FROM OLD.capacity_max THEN
      NEW.capacity := NEW.capacity_max;
      NEW.capacity_limit := NEW.capacity_max;
    ELSIF NEW.capacity_limit IS DISTINCT FROM OLD.capacity_limit THEN
      NEW.capacity := NEW.capacity_limit;
      NEW.capacity_max := NEW.capacity_limit;
    ELSE
      NEW.capacity := COALESCE(NEW.capacity, NEW.capacity_max, NEW.capacity_limit, 100);
      NEW.capacity_max := NEW.capacity;
      NEW.capacity_limit := NEW.capacity;
    END IF;

    IF NEW.used_capacity IS DISTINCT FROM OLD.used_capacity THEN
      NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, 0), 0);
      NEW.capacity_current := NEW.used_capacity;
      NEW.reserved_capacity := NEW.used_capacity;
    ELSIF NEW.capacity_current IS DISTINCT FROM OLD.capacity_current THEN
      NEW.capacity_current := GREATEST(COALESCE(NEW.capacity_current, 0), 0);
      NEW.used_capacity := NEW.capacity_current;
      NEW.reserved_capacity := NEW.capacity_current;
    ELSIF NEW.reserved_capacity IS DISTINCT FROM OLD.reserved_capacity THEN
      NEW.reserved_capacity := GREATEST(COALESCE(NEW.reserved_capacity, 0), 0);
      NEW.used_capacity := NEW.reserved_capacity;
      NEW.capacity_current := NEW.reserved_capacity;
    ELSE
      NEW.used_capacity := GREATEST(COALESCE(NEW.used_capacity, NEW.capacity_current, NEW.reserved_capacity, 0), 0);
      NEW.capacity_current := NEW.used_capacity;
      NEW.reserved_capacity := NEW.used_capacity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cycle_capacity_columns ON public.cycles;
CREATE TRIGGER sync_cycle_capacity_columns
  BEFORE INSERT OR UPDATE OF capacity, used_capacity, capacity_max, capacity_current, capacity_limit, reserved_capacity
  ON public.cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cycle_capacity_columns();

CREATE OR REPLACE FUNCTION public.check_capacity_available(
  p_cycle_id uuid,
  p_quantity integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
  v_used integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT COALESCE(capacity, capacity_max, capacity_limit, 100),
         GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0)
    INTO v_capacity, v_used
    FROM public.cycles
   WHERE id = p_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND';
  END IF;

  RETURN v_used + p_quantity <= v_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_capacity(
  p_cycle_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
  v_used integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT COALESCE(capacity, capacity_max, capacity_limit, 100),
         GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0)
    INTO v_capacity, v_used
    FROM public.cycles
   WHERE id = p_cycle_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND';
  END IF;

  IF v_used + p_quantity > v_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED';
  END IF;

  UPDATE public.cycles
     SET used_capacity = v_used + p_quantity,
         capacity_current = v_used + p_quantity,
         reserved_capacity = v_used + p_quantity,
         updated_at = now()
   WHERE id = p_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_capacity(
  p_cycle_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0)
    INTO v_used
    FROM public.cycles
   WHERE id = p_cycle_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND';
  END IF;

  UPDATE public.cycles
     SET used_capacity = GREATEST(v_used - p_quantity, 0),
         capacity_current = GREATEST(v_used - p_quantity, 0),
         reserved_capacity = GREATEST(v_used - p_quantity, 0),
         updated_at = now()
   WHERE id = p_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_cycle_capacity(cycle_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.reserve_capacity(cycle_id, 1);
$$;

CREATE OR REPLACE FUNCTION public.decrement_cycle_capacity(cycle_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.release_capacity(cycle_id, 1);
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
  v_now timestamp := timezone('America/Sao_Paulo', p_now);
  v_year integer := extract(year from timezone('America/Sao_Paulo', p_now))::integer;
  v_month integer := extract(month from timezone('America/Sao_Paulo', p_now))::integer;
  v_cycle_number integer := 1;
  v_open_start date := make_date(extract(year from timezone('America/Sao_Paulo', p_now))::integer, extract(month from timezone('America/Sao_Paulo', p_now))::integer, 1);
  v_open_end date;
  v_production_start date;
  v_production_end date;
  v_shipping_date date;
  v_cycle_id uuid;
BEGIN
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
        v_year,
        v_month,
        v_cycle_number,
        v_year::text || '-' || lpad(v_month::text, 2, '0') || '-cycle-1',
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
        100,
        0,
        100,
        0,
        100,
        0
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
         COALESCE(c.capacity, c.capacity_max, c.capacity_limit, 100),
         GREATEST(COALESCE(c.used_capacity, c.capacity_current, c.reserved_capacity, 0), 0),
         COALESCE(c.capacity_max, c.capacity, c.capacity_limit, 100),
         GREATEST(COALESCE(c.capacity_current, c.used_capacity, c.reserved_capacity, 0), 0)
    FROM public.cycles c
   WHERE c.id = v_cycle_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_cycle_capacity_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_capacity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_capacity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_cycle_capacity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_cycle_capacity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_current_cycle(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_capacity_available(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.check_capacity_available(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_capacity(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_capacity(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_cycle_capacity(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_cycle_capacity(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_current_cycle(timestamptz) TO service_role;

COMMENT ON FUNCTION public.check_capacity_available(uuid, integer) IS
  'Checks capacity using canonical cycle capacity fields.';
COMMENT ON FUNCTION public.reserve_capacity(uuid, integer) IS
  'Atomically reserves cycle capacity and syncs legacy aliases.';
COMMENT ON FUNCTION public.release_capacity(uuid, integer) IS
  'Atomically releases cycle capacity and syncs legacy aliases.';
COMMENT ON FUNCTION public.get_or_create_current_cycle(timestamptz) IS
  'Server-side current cycle resolver using canonical capacity fields.';
