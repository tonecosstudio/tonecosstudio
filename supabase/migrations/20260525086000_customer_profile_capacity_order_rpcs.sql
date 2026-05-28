-- Customer-facing profile, capacity alert, and order migration write RPCs.

CREATE TABLE IF NOT EXISTS public.order_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  old_order_number text NULL,
  order_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_migrations
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS old_order_number text NULL,
  ADD COLUMN IF NOT EXISTS order_description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS alert_threshold integer DEFAULT 80,
  ADD COLUMN IF NOT EXISTS alert_email text NULL,
  ADD COLUMN IF NOT EXISTS alert_sms text NULL,
  ADD COLUMN IF NOT EXISTS alert_triggered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_triggered_at timestamptz NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS delivery_address jsonb NULL,
  ADD COLUMN IF NOT EXISTS preferences_text text NULL,
  ADD COLUMN IF NOT EXISTS preference_tags text[] NULL,
  ADD COLUMN IF NOT EXISTS full_name text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS whatsapp text NULL,
  ADD COLUMN IF NOT EXISTS cpf text NULL,
  ADD COLUMN IF NOT EXISTS birth_date text NULL,
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_updates boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'order_migrations_status_check'
       AND conrelid = 'public.order_migrations'::regclass
  ) THEN
    ALTER TABLE public.order_migrations
      ADD CONSTRAINT order_migrations_status_check
      CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'cycles_alert_threshold_check'
       AND conrelid = 'public.cycles'::regclass
  ) THEN
    ALTER TABLE public.cycles
      ADD CONSTRAINT cycles_alert_threshold_check
      CHECK (alert_threshold BETWEEN 1 AND 100)
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_order_migrations_user_id
  ON public.order_migrations (user_id);
CREATE INDEX IF NOT EXISTS idx_order_migrations_status
  ON public.order_migrations (status);
CREATE INDEX IF NOT EXISTS idx_order_migrations_created_at
  ON public.order_migrations (created_at DESC);

ALTER TABLE public.order_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_migrations_select_own_or_admin ON public.order_migrations;
DROP POLICY IF EXISTS order_migrations_insert_own ON public.order_migrations;
DROP POLICY IF EXISTS order_migrations_update_admin ON public.order_migrations;
DROP POLICY IF EXISTS order_migrations_service_role_all ON public.order_migrations;

CREATE POLICY order_migrations_select_own_or_admin
  ON public.order_migrations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY order_migrations_service_role_all
  ON public.order_migrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.order_migrations FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_migrations FROM authenticated;
GRANT SELECT ON public.order_migrations TO authenticated;
GRANT ALL ON public.order_migrations TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_mutation_validate_text(
  p_value text,
  p_field text,
  p_max_length integer,
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
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field USING ERRCODE = '22023';
    END IF;
    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length THEN
    RAISE EXCEPTION '% exceeds maximum length', p_field USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_mutation_validate_email(
  p_value text,
  p_field text,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(public.customer_mutation_validate_text(p_value, p_field, 320, p_required));
BEGIN
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION '% is invalid', p_field USING ERRCODE = '22023';
  END IF;

  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_mutation_jsonb_text_array(p_value jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result text[];
  v_item text;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_value) <> 'array' THEN
    RAISE EXCEPTION 'preference_tags must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_value) > 20 THEN
    RAISE EXCEPTION 'preference_tags has too many items' USING ERRCODE = '22023';
  END IF;

  v_result := ARRAY[]::text[];
  FOR v_item IN SELECT jsonb_array_elements_text(p_value)
  LOOP
    v_result := v_result || public.customer_mutation_validate_text(v_item, 'preference_tag', 50, true);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_order_migration_request(
  p_full_name text,
  p_email text,
  p_phone text,
  p_old_order_number text,
  p_order_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_full_name text := public.customer_mutation_validate_text(p_full_name, 'full_name', 160, true);
  v_email text := public.customer_mutation_validate_email(p_email, 'email', true);
  v_phone text := public.customer_mutation_validate_text(p_phone, 'phone', 40, false);
  v_old_order_number text := public.customer_mutation_validate_text(p_old_order_number, 'old_order_number', 80, false);
  v_order_description text := public.customer_mutation_validate_text(p_order_description, 'order_description', 4000, true);
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF v_phone IS NOT NULL AND v_phone !~ '^[0-9+(). -]{8,40}$' THEN
    RAISE EXCEPTION 'phone is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.order_migrations (
    user_id,
    full_name,
    email,
    phone,
    old_order_number,
    order_description,
    status
  )
  VALUES (
    v_user_id,
    v_full_name,
    v_email,
    v_phone,
    v_old_order_number,
    v_order_description,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.configure_capacity_alert(
  p_cycle_id uuid,
  p_threshold integer,
  p_email text,
  p_sms text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.customer_mutation_validate_email(p_email, 'alert_email', false);
  v_sms text := public.customer_mutation_validate_text(p_sms, 'alert_sms', 40, false);
  v_row public.cycles%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'cycle_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_threshold IS NULL OR p_threshold < 1 OR p_threshold > 100 THEN
    RAISE EXCEPTION 'alert threshold must be between 1 and 100' USING ERRCODE = '22023';
  END IF;

  IF v_sms IS NOT NULL THEN
    RAISE EXCEPTION 'SMS alerts require a configured server-side SMS provider' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cycles
     SET alert_threshold = p_threshold,
         alert_email = v_email,
         alert_sms = NULL,
         updated_at = now()
   WHERE id = p_cycle_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'threshold', v_row.alert_threshold,
    'email', v_row.alert_email,
    'sms', v_row.alert_sms
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_capacity_alert(p_cycle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
  v_used integer;
  v_threshold integer;
  v_triggered boolean;
  v_percentage integer;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT COALESCE(capacity, capacity_max, capacity_limit, 100),
         GREATEST(COALESCE(used_capacity, capacity_current, reserved_capacity, 0), 0),
         COALESCE(alert_threshold, 80),
         COALESCE(alert_triggered, false)
    INTO v_capacity, v_used, v_threshold, v_triggered
    FROM public.cycles
   WHERE id = p_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = 'P0002';
  END IF;

  v_percentage := CASE
    WHEN v_capacity > 0 THEN round((v_used::numeric / v_capacity::numeric) * 100)::integer
    ELSE 0
  END;

  IF v_percentage >= v_threshold AND NOT v_triggered THEN
    UPDATE public.cycles
       SET alert_triggered = true,
           alert_triggered_at = now(),
           updated_at = now()
     WHERE id = p_cycle_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_capacity_alert(p_cycle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.cycles
     SET alert_triggered = false,
         alert_triggered_at = NULL,
         updated_at = now()
   WHERE id = p_cycle_id
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_current_user_profile(p_profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_row public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'Profile payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_profile)
  LOOP
    IF v_key NOT IN (
      'delivery_address',
      'preferences_text',
      'preference_tags',
      'full_name',
      'phone',
      'whatsapp',
      'cpf',
      'birth_date',
      'email_notifications',
      'order_updates',
      'marketing_emails'
    ) THEN
      RAISE EXCEPTION 'Unsupported profile field: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'delivery_address'
       AND jsonb_typeof(v_value) NOT IN ('object', 'null') THEN
      RAISE EXCEPTION 'delivery_address must be an object' USING ERRCODE = '22023';
    END IF;

    IF v_key = 'preference_tags' THEN
      PERFORM public.customer_mutation_jsonb_text_array(v_value);
    END IF;

    IF v_key IN ('email_notifications', 'order_updates', 'marketing_emails')
       AND jsonb_typeof(v_value) NOT IN ('boolean', 'null') THEN
      RAISE EXCEPTION '% must be boolean', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  PERFORM public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false);

  IF p_profile ? 'cpf'
     AND p_profile->>'cpf' IS NOT NULL
     AND public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false) !~ '^[0-9.\-]{11,20}$' THEN
    RAISE EXCEPTION 'cpf is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_profile ? 'birth_date'
     AND p_profile->>'birth_date' IS NOT NULL
     AND public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'birth_date must use YYYY-MM-DD' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
     SET delivery_address = CASE WHEN p_profile ? 'delivery_address'
           THEN NULLIF(p_profile->'delivery_address', 'null'::jsonb)
           ELSE delivery_address
         END,
         preferences_text = CASE WHEN p_profile ? 'preferences_text'
           THEN public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false)
           ELSE preferences_text
         END,
         preference_tags = CASE WHEN p_profile ? 'preference_tags'
           THEN public.customer_mutation_jsonb_text_array(p_profile->'preference_tags')
           ELSE preference_tags
         END,
         full_name = CASE WHEN p_profile ? 'full_name'
           THEN public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false)
           ELSE full_name
         END,
         phone = CASE WHEN p_profile ? 'phone'
           THEN public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false)
           ELSE phone
         END,
         whatsapp = CASE WHEN p_profile ? 'whatsapp'
           THEN public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false)
           ELSE whatsapp
         END,
         cpf = CASE WHEN p_profile ? 'cpf'
           THEN public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false)
           ELSE cpf
         END,
         birth_date = CASE WHEN p_profile ? 'birth_date'
           THEN public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false)
           ELSE birth_date
         END,
         email_notifications = CASE WHEN p_profile ? 'email_notifications'
           THEN (p_profile->>'email_notifications')::boolean
           ELSE email_notifications
         END,
         order_updates = CASE WHEN p_profile ? 'order_updates'
           THEN (p_profile->>'order_updates')::boolean
           ELSE order_updates
         END,
         marketing_emails = CASE WHEN p_profile ? 'marketing_emails'
           THEN (p_profile->>'marketing_emails')::boolean
           ELSE marketing_emails
         END,
         updated_at = now()
   WHERE id = v_user_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.customer_mutation_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_mutation_validate_email(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_mutation_jsonb_text_array(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_order_migration_request(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.configure_capacity_alert(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_capacity_alert(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_capacity_alert(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_current_user_profile(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_order_migration_request(text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.configure_capacity_alert(uuid, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_capacity_alert(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_capacity_alert(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.submit_order_migration_request(text, text, text, text, text) IS
  'Current-user order migration request creation with server-side validation.';
COMMENT ON FUNCTION public.configure_capacity_alert(uuid, integer, text, text) IS
  'Admin-only cycle capacity alert configuration.';
COMMENT ON FUNCTION public.upsert_current_user_profile(jsonb) IS
  'Validated current-user profile update/upsert without direct profile DML from the client.';

NOTIFY pgrst, 'reload schema';
