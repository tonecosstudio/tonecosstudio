-- Admin character choice RPCs.

ALTER TABLE public.character_choices
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collection_name text,
  ADD COLUMN IF NOT EXISTS character_image_url text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminders_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_choice_id uuid REFERENCES public.character_choices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS change_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.production_queue
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS choice_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS choice_made_at timestamptz,
  ADD COLUMN IF NOT EXISTS choice_status text;

CREATE INDEX IF NOT EXISTS idx_character_choices_order ON public.character_choices(order_id, order_type);
CREATE INDEX IF NOT EXISTS idx_production_queue_order ON public.production_queue(order_id, order_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'character_choices_order_type_valid'
      AND conrelid = 'public.character_choices'::regclass
  ) THEN
    ALTER TABLE public.character_choices
      ADD CONSTRAINT character_choices_order_type_valid
      CHECK (order_type IS NULL OR order_type IN ('subscription_delivery', 'standalone_purchase')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_queue_order_type_valid'
      AND conrelid = 'public.production_queue'::regclass
  ) THEN
    ALTER TABLE public.production_queue
      ADD CONSTRAINT production_queue_order_type_valid
      CHECK (order_type IS NULL OR order_type IN ('subscription_delivery', 'standalone_purchase')) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_validate_choice_note(
  p_value text,
  p_label text,
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
  v_control_check text;
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  v_control_check := translate(v_value, E'\n\r\t', '');

  IF length(v_value) > p_max_length OR v_control_check ~ '[[:cntrl:]]' OR v_value ~ '[<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_sync_production_queue_choice(p_choice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_choice public.character_choices%ROWTYPE;
BEGIN
  SELECT *
  INTO v_choice
  FROM public.character_choices
  WHERE id = p_choice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character choice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_choice.order_id IS NULL OR v_choice.order_type IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.production_queue
  SET choice_status = v_choice.status::text,
      choice_deadline = CASE WHEN v_choice.status::text = 'approved' THEN NULL ELSE v_choice.deadline END,
      choice_made_at = CASE
        WHEN v_choice.status::text = 'approved' THEN COALESCE(v_choice.submitted_at, v_choice.approved_at, now())
        ELSE choice_made_at
      END,
      character_id = CASE WHEN v_choice.status::text = 'approved' THEN v_choice.character_id ELSE character_id END,
      character_name = CASE WHEN v_choice.status::text = 'approved' THEN v_choice.character_name ELSE character_name END,
      updated_at = now()
  WHERE order_id::text = v_choice.order_id::text
    AND order_type = v_choice.order_type;
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

  IF v_choice.status::text NOT IN ('pending', 'rejected') THEN
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

  IF v_choice.status::text NOT IN ('pending', 'approved') THEN
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

CREATE OR REPLACE FUNCTION public.admin_extend_character_choice_deadline(
  p_choice_id uuid,
  p_new_deadline timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_choice public.character_choices%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_new_deadline IS NULL OR p_new_deadline <= now() THEN
    RAISE EXCEPTION 'Deadline must be in the future' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_choice
  FROM public.character_choices
  WHERE id = p_choice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character choice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_choice.status::text = 'approved' THEN
    RAISE EXCEPTION 'Approved choices do not have an active deadline' USING ERRCODE = '22023';
  END IF;

  UPDATE public.character_choices
  SET deadline = p_new_deadline,
      updated_at = now()
  WHERE id = p_choice_id;

  PERFORM public.admin_sync_production_queue_choice(p_choice_id);

  RETURN p_choice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_choice_note(text, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_sync_production_queue_choice(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_character_choice(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_character_choice(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_extend_character_choice_deadline(uuid, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_approve_character_choice(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_character_choice(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_extend_character_choice_deadline(uuid, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_approve_character_choice(uuid) IS
  'Admin-only character choice approval with production queue sync.';
COMMENT ON FUNCTION public.admin_reject_character_choice(uuid, text) IS
  'Admin-only character choice rejection with production queue sync.';
COMMENT ON FUNCTION public.admin_extend_character_choice_deadline(uuid, timestamptz) IS
  'Admin-only character choice deadline extension with production queue sync.';

NOTIFY pgrst, 'reload schema';
