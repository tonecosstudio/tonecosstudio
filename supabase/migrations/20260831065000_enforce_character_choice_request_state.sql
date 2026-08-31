BEGIN;

CREATE OR REPLACE FUNCTION private_api.enforce_character_choice_request_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_queue public.production_queue%ROWTYPE;
  v_queue_count integer;
  v_existing_count integer;
BEGIN
  IF NEW.status::text IS DISTINCT FROM 'submitted' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL
     OR NEW.order_id IS NULL
     OR NEW.order_type IS NULL
     OR NEW.collection_id IS NULL
     OR NEW.character_id IS NULL
     OR NEW.deadline IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_INCOMPLETE' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_queue_count
    FROM public.production_queue pq
   WHERE pq.order_id::text = NEW.order_id::text
     AND pq.order_type = NEW.order_type
     AND pq.user_id = NEW.user_id;

  IF v_queue_count <> 1 THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_REQUEST_NOT_UNIQUE' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_queue
    FROM public.production_queue pq
   WHERE pq.order_id::text = NEW.order_id::text
     AND pq.order_type = NEW.order_type
     AND pq.user_id = NEW.user_id
   FOR UPDATE;

  IF v_queue.current_stage::text IS DISTINCT FROM 'awaiting_choice'
     OR v_queue.choice_status NOT IN ('pending', 'submitted', 'rejected') THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_REQUEST_NOT_OPEN' USING ERRCODE = '22023';
  END IF;

  IF v_queue.choice_deadline IS NULL OR v_queue.choice_deadline <= now() THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_DEADLINE_EXPIRED' USING ERRCODE = '22023';
  END IF;

  IF NEW.deadline IS DISTINCT FROM v_queue.choice_deadline THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_DEADLINE_MISMATCH' USING ERRCODE = '22023';
  END IF;

  IF NEW.collection_id IS DISTINCT FROM v_queue.collection_id THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_COLLECTION_MISMATCH' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_existing_count
    FROM public.character_choices cc
   WHERE cc.order_id::text = NEW.order_id::text
     AND cc.order_type = NEW.order_type
     AND cc.user_id = NEW.user_id
     AND cc.id IS DISTINCT FROM NEW.id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'CHARACTER_CHOICE_ALREADY_EXISTS' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS character_choices_enforce_request_state
  ON public.character_choices;

CREATE TRIGGER character_choices_enforce_request_state
BEFORE INSERT OR UPDATE OF status, character_id, collection_id, deadline
ON public.character_choices
FOR EACH ROW
EXECUTE FUNCTION private_api.enforce_character_choice_request_state();

REVOKE ALL ON FUNCTION private_api.enforce_character_choice_request_state()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private_api.enforce_character_choice_request_state() IS
  'Fail-closed invariant: submitted character choices must map to exactly one open production_queue request for the same user/order/type/collection and persisted deadline.';

NOTIFY pgrst, 'reload schema';

COMMIT;
