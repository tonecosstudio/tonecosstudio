-- Customer character choice mutation RPCs.

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.choice_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['submitted', 'locked'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.choice_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.choice_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.character_choices
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS character_image_url text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS reminders_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_choice_id uuid REFERENCES public.character_choices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS change_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.production_queue
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS choice_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS choice_made_at timestamptz,
  ADD COLUMN IF NOT EXISTS choice_status text;

CREATE INDEX IF NOT EXISTS idx_character_choices_order_user
  ON public.character_choices(order_id, user_id);
CREATE INDEX IF NOT EXISTS idx_production_queue_order_user
  ON public.production_queue(order_id, user_id);

CREATE OR REPLACE FUNCTION public.customer_submit_character_choice(
  p_order_id text,
  p_character_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    RAISE EXCEPTION 'User is not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_character_id IS NULL THEN
    RAISE EXCEPTION 'Character id is required' USING ERRCODE = '22023';
  END IF;

  SELECT cc.id, cc.collection_id, cc.name, cc.image_url
    INTO v_character
    FROM public.collection_characters cc
   WHERE cc.id = p_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
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
      RAISE EXCEPTION 'Choice cannot be modified' USING ERRCODE = '22023';
    END IF;

    IF v_existing.deadline < now() THEN
      RAISE EXCEPTION 'Choice deadline expired' USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_existing.change_count, 0) >= 3 THEN
      RAISE EXCEPTION 'Choice change limit reached' USING ERRCODE = '22023';
    END IF;

    IF v_character.collection_id IS DISTINCT FROM v_existing.collection_id THEN
      RAISE EXCEPTION 'Character does not belong to this order collection' USING ERRCODE = '22023';
    END IF;

    UPDATE public.character_choices
       SET character_id = p_character_id,
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
      RAISE EXCEPTION 'Order not found in production queue' USING ERRCODE = 'P0002';
    END IF;

    IF v_order.order_type NOT IN ('subscription_delivery', 'standalone_purchase') THEN
      RAISE EXCEPTION 'Order type is invalid for character choice' USING ERRCODE = '22023';
    END IF;

    IF v_character.collection_id IS DISTINCT FROM v_order.collection_id THEN
      RAISE EXCEPTION 'Character does not belong to this order collection' USING ERRCODE = '22023';
    END IF;

    v_deadline := COALESCE(v_order.choice_deadline, now() + interval '7 days');

    IF v_deadline < now() THEN
      RAISE EXCEPTION 'Choice deadline expired' USING ERRCODE = '22023';
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
      p_character_id,
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

CREATE OR REPLACE FUNCTION public.customer_change_character_choice(
  p_choice_id uuid,
  p_character_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := public.delivery_cycle_validate_text(p_reason, 'change reason', 500);
  v_existing public.character_choices%ROWTYPE;
  v_choice public.character_choices%ROWTYPE;
  v_character record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_choice_id IS NULL OR p_character_id IS NULL THEN
    RAISE EXCEPTION 'Choice and character are required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.character_choices
   WHERE id = p_choice_id
     AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Choice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.status::text IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'Choice cannot be modified' USING ERRCODE = '22023';
  END IF;

  IF v_existing.deadline < now() THEN
    RAISE EXCEPTION 'Choice deadline expired' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_existing.change_count, 0) >= 3 THEN
    RAISE EXCEPTION 'Choice change limit reached' USING ERRCODE = '22023';
  END IF;

  SELECT cc.id, cc.collection_id, cc.name, cc.image_url
    INTO v_character
    FROM public.collection_characters cc
   WHERE cc.id = p_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_character.collection_id IS DISTINCT FROM v_existing.collection_id THEN
    RAISE EXCEPTION 'Character does not belong to this order collection' USING ERRCODE = '22023';
  END IF;

  UPDATE public.character_choices
     SET character_id = p_character_id,
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

CREATE OR REPLACE FUNCTION public.admin_approve_character_choice(p_choice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_choice public.character_choices%ROWTYPE;
  v_reviewer_name text;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_choice
  FROM public.character_choices
  WHERE id = p_choice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character choice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_choice.status::text NOT IN ('pending', 'submitted', 'rejected') THEN
    RAISE EXCEPTION 'Character choice cannot be approved from this status' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(full_name, email, 'Admin')
  INTO v_reviewer_name
  FROM public.profiles
  WHERE id = auth.uid();

  UPDATE public.character_choices
  SET status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      approved_by_name = COALESCE(v_reviewer_name, 'Admin'),
      rejected_at = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = p_choice_id;

  PERFORM public.admin_sync_production_queue_choice(p_choice_id);

  RETURN p_choice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_character_choice(
  p_choice_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_choice public.character_choices%ROWTYPE;
  v_reason text := public.admin_validate_choice_note(p_reason, 'rejection reason', 1000, true);
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_choice
  FROM public.character_choices
  WHERE id = p_choice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character choice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_choice.status::text NOT IN ('pending', 'submitted', 'approved') THEN
    RAISE EXCEPTION 'Character choice cannot be rejected from this status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.character_choices
  SET status = 'rejected',
      rejected_at = now(),
      rejection_reason = v_reason,
      approved_at = NULL,
      approved_by = NULL,
      approved_by_name = NULL,
      updated_at = now()
  WHERE id = p_choice_id;

  PERFORM public.admin_sync_production_queue_choice(p_choice_id);

  RETURN p_choice_id;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.character_choices FROM anon, authenticated;
GRANT SELECT ON public.character_choices TO authenticated;
GRANT ALL ON public.character_choices TO service_role;

REVOKE EXECUTE ON FUNCTION public.customer_submit_character_choice(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.customer_change_character_choice(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_submit_character_choice(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_change_character_choice(uuid, uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.customer_submit_character_choice(text, uuid) IS
  'Current-user character choice submission with ownership, deadline, collection, and change-limit validation.';
COMMENT ON FUNCTION public.customer_change_character_choice(uuid, uuid, text) IS
  'Current-user character choice change with ownership, deadline, collection, and change-limit validation.';

NOTIFY pgrst, 'reload schema';
