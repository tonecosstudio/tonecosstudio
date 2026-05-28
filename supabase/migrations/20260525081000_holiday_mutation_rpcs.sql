-- Holiday mutation RPCs.
-- Keeps calendar writes admin-only and validated at the database boundary.

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'national',
  state_code text,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS holiday_date date,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'holidays'
       AND column_name = 'date'
  ) THEN
    EXECUTE 'UPDATE public.holidays SET holiday_date = COALESCE(holiday_date, date::date) WHERE holiday_date IS NULL';
  END IF;

  UPDATE public.holidays
     SET type = COALESCE(NULLIF(btrim(type), ''), 'national'),
         is_recurring = COALESCE(is_recurring, false),
         created_at = COALESCE(created_at, now()),
         updated_at = COALESCE(updated_at, now());

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'holidays_type_valid'
       AND conrelid = 'public.holidays'::regclass
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_type_valid
      CHECK (type IN ('national', 'state')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'holidays_state_code_valid'
       AND conrelid = 'public.holidays'::regclass
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_state_code_valid
      CHECK (
        (type = 'national' AND state_code IS NULL)
        OR (type = 'state' AND state_code ~ '^[A-Z]{2}$')
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'holidays_unique_date_name'
       AND conrelid = 'public.holidays'::regclass
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_unique_date_name UNIQUE (holiday_date, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date
  ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_year
  ON public.holidays((extract(year from holiday_date)));

DROP TRIGGER IF EXISTS set_updated_at_holidays ON public.holidays;
CREATE TRIGGER set_updated_at_holidays
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_public" ON public.holidays;
CREATE POLICY "holidays_select_public"
  ON public.holidays FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "holidays_mutate_admin_service" ON public.holidays;
CREATE POLICY "holidays_mutate_admin_service"
  ON public.holidays FOR ALL
  USING (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.holiday_validate_text(
  p_value text,
  p_label text,
  p_max_length integer DEFAULT 500,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF p_required AND v_value IS NULL THEN
    RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
  END IF;

  IF v_value IS NOT NULL AND (
    length(v_value) > p_max_length
    OR v_value ~ '[[:cntrl:]]'
    OR v_value ~ '<[^>]*>'
  ) THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_holiday_payload(
  p_holiday_date date,
  p_name text,
  p_description text,
  p_type text,
  p_state_code text,
  p_is_recurring boolean
)
RETURNS TABLE (
  holiday_date date,
  name text,
  description text,
  type text,
  state_code text,
  is_recurring boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.holiday_validate_text(p_name, 'holiday name', 160);
  v_description text := public.holiday_validate_text(p_description, 'holiday description', 1000, false);
  v_type text := lower(public.holiday_validate_text(p_type, 'holiday type', 20));
  v_state_code text := upper(public.holiday_validate_text(p_state_code, 'state code', 2, false));
BEGIN
  IF p_holiday_date IS NULL
     OR p_holiday_date < DATE '2000-01-01'
     OR p_holiday_date > DATE '2100-12-31' THEN
    RAISE EXCEPTION 'Invalid holiday date' USING ERRCODE = '22023';
  END IF;

  IF v_type NOT IN ('national', 'state') THEN
    RAISE EXCEPTION 'Invalid holiday type' USING ERRCODE = '22023';
  END IF;

  IF v_type = 'national' THEN
    v_state_code := NULL;
  ELSIF v_state_code IS NULL OR v_state_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'State code is required for state holidays' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY SELECT
    p_holiday_date,
    v_name,
    v_description,
    v_type,
    v_state_code,
    COALESCE(p_is_recurring, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_holiday(
  p_holiday_date date,
  p_name text,
  p_description text DEFAULT NULL,
  p_type text DEFAULT 'national',
  p_state_code text DEFAULT NULL,
  p_is_recurring boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payload record;
  v_holiday public.holidays%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
    INTO v_payload
    FROM public.admin_validate_holiday_payload(
      p_holiday_date,
      p_name,
      p_description,
      p_type,
      p_state_code,
      p_is_recurring
    );

  INSERT INTO public.holidays (
    holiday_date,
    name,
    description,
    type,
    state_code,
    is_recurring
  )
  VALUES (
    v_payload.holiday_date,
    v_payload.name,
    v_payload.description,
    v_payload.type,
    v_payload.state_code,
    v_payload.is_recurring
  )
  RETURNING * INTO v_holiday;

  RETURN to_jsonb(v_holiday);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_holiday(
  p_holiday_id uuid,
  p_holiday_date date DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_state_code text DEFAULT NULL,
  p_is_recurring boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.holidays%ROWTYPE;
  v_payload record;
  v_holiday public.holidays%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_holiday_id IS NULL THEN
    RAISE EXCEPTION 'Holiday id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.holidays
   WHERE id = p_holiday_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Holiday not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_payload
    FROM public.admin_validate_holiday_payload(
      COALESCE(p_holiday_date, v_existing.holiday_date),
      COALESCE(p_name, v_existing.name),
      COALESCE(p_description, v_existing.description),
      COALESCE(p_type, v_existing.type),
      COALESCE(p_state_code, v_existing.state_code),
      COALESCE(p_is_recurring, v_existing.is_recurring)
    );

  UPDATE public.holidays
     SET holiday_date = v_payload.holiday_date,
         name = v_payload.name,
         description = v_payload.description,
         type = v_payload.type,
         state_code = v_payload.state_code,
         is_recurring = v_payload.is_recurring,
         updated_at = now()
   WHERE id = p_holiday_id
   RETURNING * INTO v_holiday;

  RETURN to_jsonb(v_holiday);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_holiday(
  p_holiday_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_holiday public.holidays%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_holiday_id IS NULL THEN
    RAISE EXCEPTION 'Holiday id is required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.holidays
   WHERE id = p_holiday_id
   RETURNING * INTO v_holiday;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Holiday not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_holiday);
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.holidays FROM anon, authenticated;
GRANT SELECT ON public.holidays TO anon, authenticated;
GRANT ALL ON public.holidays TO service_role;

REVOKE EXECUTE ON FUNCTION public.holiday_validate_text(text, text, integer, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_validate_holiday_payload(date, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_add_holiday(date, text, text, text, text, boolean)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_holiday(uuid, date, text, text, text, text, boolean)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_holiday(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_add_holiday(date, text, text, text, text, boolean)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_holiday(uuid, date, text, text, text, text, boolean)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_holiday(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_add_holiday(date, text, text, text, text, boolean) IS
  'Admin-only validated holiday creation.';
COMMENT ON FUNCTION public.admin_update_holiday(uuid, date, text, text, text, text, boolean) IS
  'Admin-only validated holiday update.';
COMMENT ON FUNCTION public.admin_delete_holiday(uuid) IS
  'Admin-only holiday deletion returning the removed row.';

NOTIFY pgrst, 'reload schema';
