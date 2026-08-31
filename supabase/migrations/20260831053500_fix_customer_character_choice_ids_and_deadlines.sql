BEGIN;

-- The customer UI selects collection_characters.id, while character_choices.character_id
-- references characters.id. Translate the selected catalog-entry id to its canonical
-- character id at the database boundary and require a persisted choice deadline.

CREATE OR REPLACE FUNCTION private_api.customer_submit_character_choice(
  p_order_id text,
  p_character_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_id text := public.delivery_cycle_validate_text(p_order_id, 'order id', 120);
  v_existing public.character_choices%ROWTYPE;
  v_choice public.character_choices%ROWTYPE;
  v_character record;
  v_order record;
  v_deadline timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_character_id IS NULL THEN
    RAISE EXCEPTION 'COLLECTION_CHARACTER_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT
    cc.id AS collection_character_id,
    cc.collection_id,
    ch.id AS character_id,
    COALESCE(NULLIF(btrim(cc.name), ''), ch.name) AS name,
    COALESCE(cc.image_url, ch.image_url) AS image_url
    INTO v_character
    FROM public.collection_characters cc
    JOIN public.characters ch
      ON ch.id = cc.character_id
     AND ch.collection_id = cc.collection_id
    JOIN public.collections c
      ON c.id = cc.collection_id
     AND c.is_active IS TRUE
     AND c.status::text = 'active'
   WHERE cc.id = p_character_id;

  IF NOT FOUND OR v_character.character_id IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.character_choices
   WHERE order_id = v_order_id
     AND user_id = v_user_id
   LIMIT 1
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status::text IN ('approved', 'locked') THEN
      RAISE EXCEPTION 'CHOICE_CANNOT_BE_MODIFIED' USING ERRCODE = '22023';
    END IF;

    IF v_existing.deadline IS NULL THEN
      RAISE EXCEPTION 'CHOICE_DEADLINE_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    IF v_existing.deadline < now() THEN
      RAISE EXCEPTION 'CHOICE_DEADLINE_EXPIRED' USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_existing.change_count, 0) >= 3 THEN
      RAISE EXCEPTION 'CHOICE_CHANGE_LIMIT_REACHED' USING ERRCODE = '22023';
    END IF;

    IF v_character.collection_id IS DISTINCT FROM v_existing.collection_id THEN
      RAISE EXCEPTION 'CHARACTER_NOT_IN_ORDER_COLLECTION' USING ERRCODE = '22023';
    END IF;

    UPDATE public.character_choices
       SET character_id = v_character.character_id,
           character_name = v_character.name,
           character_image_url = v_character.image_url,
           status = 'submitted'::public.choice_status,
           submitted_at = now(),
           change_count = COALESCE(change_count, 0) + 1,
           previous_choice_id = v_existing.id,
           updated_at = now()
     WHERE id = v_existing.id
       AND user_id = v_user_id
     RETURNING * INTO v_choice;
  ELSE
    SELECT order_type, collection_id, choice_deadline
      INTO v_order
      FROM public.production_queue
     WHERE order_id::text = v_order_id
       AND user_id = v_user_id
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ORDER_NOT_FOUND_IN_PRODUCTION_QUEUE' USING ERRCODE = 'P0002';
    END IF;

    IF v_order.order_type NOT IN ('subscription_delivery', 'standalone_purchase') THEN
      RAISE EXCEPTION 'INVALID_ORDER_TYPE_FOR_CHARACTER_CHOICE' USING ERRCODE = '22023';
    END IF;

    IF v_order.collection_id IS NULL THEN
      RAISE EXCEPTION 'ORDER_COLLECTION_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    IF v_character.collection_id IS DISTINCT FROM v_order.collection_id THEN
      RAISE EXCEPTION 'CHARACTER_NOT_IN_ORDER_COLLECTION' USING ERRCODE = '22023';
    END IF;

    v_deadline := v_order.choice_deadline;
    IF v_deadline IS NULL THEN
      RAISE EXCEPTION 'CHOICE_DEADLINE_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    IF v_deadline < now() THEN
      RAISE EXCEPTION 'CHOICE_DEADLINE_EXPIRED' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.character_choices (
      order_id,
      order_type,
      user_id,
      collection_id,
      character_id,
      character_name,
      character_image_url,
      status,
      submitted_at,
      deadline
    )
    VALUES (
      v_order_id,
      v_order.order_type,
      v_user_id,
      v_order.collection_id,
      v_character.character_id,
      v_character.name,
      v_character.image_url,
      'submitted'::public.choice_status,
      now(),
      v_deadline
    )
    RETURNING * INTO v_choice;
  END IF;

  UPDATE public.production_queue
     SET choice_status = v_choice.status::text,
         choice_made_at = v_choice.submitted_at,
         updated_at = now()
   WHERE order_id::text = v_choice.order_id::text
     AND user_id = v_user_id;

  RETURN to_jsonb(v_choice);
END;
$$;

CREATE OR REPLACE FUNCTION private_api.customer_change_character_choice(
  p_choice_id uuid,
  p_character_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := public.delivery_cycle_validate_text(p_reason, 'change reason', 500);
  v_existing public.character_choices%ROWTYPE;
  v_choice public.character_choices%ROWTYPE;
  v_character record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_choice_id IS NULL OR p_character_id IS NULL THEN
    RAISE EXCEPTION 'CHOICE_AND_COLLECTION_CHARACTER_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.character_choices
   WHERE id = p_choice_id
     AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHOICE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.status::text IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'CHOICE_CANNOT_BE_MODIFIED' USING ERRCODE = '22023';
  END IF;

  IF v_existing.deadline IS NULL THEN
    RAISE EXCEPTION 'CHOICE_DEADLINE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF v_existing.deadline < now() THEN
    RAISE EXCEPTION 'CHOICE_DEADLINE_EXPIRED' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_existing.change_count, 0) >= 3 THEN
    RAISE EXCEPTION 'CHOICE_CHANGE_LIMIT_REACHED' USING ERRCODE = '22023';
  END IF;

  SELECT
    cc.collection_id,
    ch.id AS character_id,
    COALESCE(NULLIF(btrim(cc.name), ''), ch.name) AS name,
    COALESCE(cc.image_url, ch.image_url) AS image_url
    INTO v_character
    FROM public.collection_characters cc
    JOIN public.characters ch
      ON ch.id = cc.character_id
     AND ch.collection_id = cc.collection_id
    JOIN public.collections c
      ON c.id = cc.collection_id
     AND c.is_active IS TRUE
     AND c.status::text = 'active'
   WHERE cc.id = p_character_id;

  IF NOT FOUND OR v_character.character_id IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  IF v_character.collection_id IS DISTINCT FROM v_existing.collection_id THEN
    RAISE EXCEPTION 'CHARACTER_NOT_IN_ORDER_COLLECTION' USING ERRCODE = '22023';
  END IF;

  UPDATE public.character_choices
     SET character_id = v_character.character_id,
         character_name = v_character.name,
         character_image_url = v_character.image_url,
         change_reason = v_reason,
         change_count = COALESCE(change_count, 0) + 1,
         status = 'submitted'::public.choice_status,
         submitted_at = now(),
         updated_at = now()
   WHERE id = p_choice_id
     AND user_id = v_user_id
   RETURNING * INTO v_choice;

  UPDATE public.production_queue
     SET choice_status = v_choice.status::text,
         choice_made_at = v_choice.submitted_at,
         updated_at = now()
   WHERE order_id::text = v_choice.order_id::text
     AND user_id = v_user_id;

  RETURN to_jsonb(v_choice);
END;
$$;

COMMENT ON FUNCTION private_api.customer_submit_character_choice(text, uuid) IS
  'Current-user character choice. Input UUID is collection_characters.id; persisted character_id is the canonical characters.id. A configured deadline is mandatory.';
COMMENT ON FUNCTION private_api.customer_change_character_choice(uuid, uuid, text) IS
  'Current-user character-choice change with ownership, collection integrity, active parent collection, and mandatory persisted deadline.';

NOTIFY pgrst, 'reload schema';

COMMIT;
