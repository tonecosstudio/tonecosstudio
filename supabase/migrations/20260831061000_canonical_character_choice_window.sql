BEGIN;

-- A character-choice window exists before a character choice does. The production
-- queue owns that pre-choice state. The duration comes only from system_settings;
-- there is no browser/env/default fallback.

CREATE OR REPLACE FUNCTION private_api.require_character_choice_days()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_raw text;
  v_days integer;
BEGIN
  SELECT NULLIF(btrim(value), '')
    INTO v_raw
    FROM public.system_settings
   WHERE key = 'character_choice_days';

  IF v_raw IS NULL OR v_raw !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_DAYS_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_days := v_raw::integer;

  IF v_days < 1 OR v_days > 365 THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_DAYS_INVALID' USING ERRCODE = '22023';
  END IF;

  RETURN v_days;
END;
$$;

CREATE OR REPLACE FUNCTION private_api.initialize_production_choice_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_days integer;
  v_entering_choice boolean;
BEGIN
  IF NEW.current_stage::text IS DISTINCT FROM 'awaiting_choice' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_USER_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF NEW.order_id IS NULL OR NULLIF(btrim(NEW.order_id::text), '') IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_ORDER_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF NEW.order_type IS NULL
     OR NEW.order_type NOT IN ('subscription_delivery', 'standalone_purchase') THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_ORDER_TYPE_INVALID' USING ERRCODE = '22023';
  END IF;

  IF NEW.collection_id IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_COLLECTION_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_entering_choice := TG_OP = 'INSERT'
    OR OLD.current_stage::text IS DISTINCT FROM NEW.current_stage::text;

  IF v_entering_choice OR NEW.choice_deadline IS NULL THEN
    v_days := private_api.require_character_choice_days();
    NEW.choice_deadline := now() + make_interval(days => v_days);
    NEW.choice_status := 'pending';
    NEW.choice_made_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS production_queue_initialize_choice_window
  ON public.production_queue;

CREATE TRIGGER production_queue_initialize_choice_window
BEFORE INSERT OR UPDATE OF current_stage
ON public.production_queue
FOR EACH ROW
EXECUTE FUNCTION private_api.initialize_production_choice_window();

REVOKE ALL ON FUNCTION private_api.require_character_choice_days()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.initialize_production_choice_window()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_api.require_character_choice_days()
  TO service_role;

COMMENT ON FUNCTION private_api.require_character_choice_days() IS
  'Returns the canonical character-choice window duration from system_settings and fails closed when missing or invalid.';
COMMENT ON FUNCTION private_api.initialize_production_choice_window() IS
  'Initializes production_queue choice_deadline/status whenever an order enters awaiting_choice. No local/default duration is allowed.';

NOTIFY pgrst, 'reload schema';

COMMIT;
