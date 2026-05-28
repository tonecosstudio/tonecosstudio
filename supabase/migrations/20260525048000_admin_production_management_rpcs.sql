-- Admin production management RPCs.
-- Centralizes production queue state mutations and stage block state changes.

CREATE OR REPLACE FUNCTION public.admin_validate_production_stage(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := NULLIF(btrim(COALESCE(p_stage, '')), '');
BEGIN
  IF v_stage NOT IN (
    'awaiting_payment',
    'payment_confirmed',
    'awaiting_choice',
    'model_preparation',
    'printing',
    'post_processing',
    'painting',
    'quality_check',
    'packaging',
    'ready_to_ship',
    'shipped',
    'delivered'
  ) THEN
    RAISE EXCEPTION 'Invalid production stage' USING ERRCODE = '22023';
  END IF;

  RETURN v_stage;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_production_status_for_stage(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := public.admin_validate_production_stage(p_stage);
BEGIN
  IF v_stage IN ('awaiting_choice', 'awaiting_payment') THEN
    RETURN 'awaiting_choice';
  ELSIF v_stage IN ('payment_confirmed', 'model_preparation') THEN
    RETURN 'ready_for_production';
  ELSIF v_stage IN ('printing', 'post_processing', 'painting', 'quality_check', 'packaging', 'ready_to_ship') THEN
    RETURN 'in_production';
  ELSIF v_stage IN ('shipped', 'delivered') THEN
    RETURN 'completed';
  END IF;

  RETURN 'ready_for_production';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_production_note(
  p_note text,
  p_required boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF v_note IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION 'Production note is required' USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_note) > 2000 OR v_note ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid production note' USING ERRCODE = '22023';
  END IF;

  RETURN v_note;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_stage(
  p_queue_id uuid,
  p_stage text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := public.admin_validate_production_stage(p_stage);
  v_status text := public.admin_production_status_for_stage(p_stage);
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.production_queue
  SET current_stage = v_stage,
      production_status = v_status,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_production(
  p_queue_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current record;
  v_profile record;
  v_user_name text;
  v_reason text;
  v_is_reassignment boolean := false;
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT assigned_to, assigned_to_name
    INTO v_current
    FROM public.production_queue
   WHERE id = p_queue_id;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT full_name, email
    INTO v_profile
    FROM public.profiles
   WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Assigned user not found' USING ERRCODE = 'P0002';
  END IF;

  v_user_name := COALESCE(NULLIF(v_profile.full_name, ''), v_profile.email, 'Usuario');
  v_is_reassignment := v_current.assigned_to IS NOT NULL AND v_current.assigned_to <> p_user_id;
  v_reason := public.admin_validate_production_note(
    COALESCE(p_reason, CASE WHEN v_is_reassignment THEN 'Reatribuicao' ELSE 'Atribuicao inicial' END),
    true
  );

  UPDATE public.production_queue
  SET assigned_to = p_user_id,
      assigned_to_name = v_user_name,
      assigned_at = now(),
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_block_production(
  p_queue_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text := public.admin_validate_production_note(p_reason, true);
  v_stage text;
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT current_stage
    INTO v_stage
    FROM public.production_queue
   WHERE id = p_queue_id;

  v_stage := public.admin_validate_production_stage(v_stage);

  UPDATE public.production_stages
  SET is_blocked = true,
      block_reason = v_reason,
      blocked_at = now(),
      status = 'blocked',
      updated_at = now()
  WHERE production_queue_id = p_queue_id
    AND stage_name = v_stage;

  UPDATE public.production_queue
  SET production_status = 'on_hold',
      production_notes = v_reason,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unblock_production(p_queue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text;
  v_stage_started_at timestamptz;
  v_stage_status text;
  v_new_status text;
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT current_stage
    INTO v_stage
    FROM public.production_queue
   WHERE id = p_queue_id;

  v_stage := public.admin_validate_production_stage(v_stage);

  SELECT started_at
    INTO v_stage_started_at
    FROM public.production_stages
   WHERE production_queue_id = p_queue_id
     AND stage_name = v_stage;

  v_stage_status := CASE WHEN v_stage_started_at IS NOT NULL THEN 'in_progress' ELSE 'pending' END;
  v_new_status := public.admin_production_status_for_stage(v_stage);

  UPDATE public.production_stages
  SET is_blocked = false,
      block_reason = NULL,
      unblocked_at = now(),
      status = v_stage_status,
      updated_at = now()
  WHERE production_queue_id = p_queue_id
    AND stage_name = v_stage;

  UPDATE public.production_queue
  SET production_status = v_new_status,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_schedule(
  p_queue_id uuid,
  p_scheduled_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.production_queue
  SET scheduled_production_date = p_scheduled_date,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_notes(
  p_queue_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notes text := public.admin_validate_production_note(p_notes, false);
  v_row public.production_queue%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.production_queue
  SET production_notes = v_notes,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_estimated_completion(
  p_queue_id uuid,
  p_estimated_completion timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.production_queue
  SET estimated_completion_date = p_estimated_completion,
      updated_at = now()
  WHERE id = p_queue_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Production queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_stage_notes(
  p_queue_id uuid,
  p_stage text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := public.admin_validate_production_stage(p_stage);
  v_notes text := public.admin_validate_production_note(p_notes, false);
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.production_stages
  SET notes = v_notes,
      updated_at = now()
  WHERE production_queue_id = p_queue_id
    AND stage_name = v_stage
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Production stage not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_production_stage(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_production_status_for_stage(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_production_note(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_stage(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_production(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_block_production(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unblock_production(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_schedule(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_notes(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_estimated_completion(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_production_stage_notes(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_production_stage(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_production(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_block_production(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unblock_production(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_schedule(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_notes(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_estimated_completion(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_production_stage_notes(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_update_production_stage(uuid, text) IS
  'Admin-only validated production stage transition.';
COMMENT ON FUNCTION public.admin_assign_production(uuid, uuid, text) IS
  'Admin-only production assignment update.';
COMMENT ON FUNCTION public.admin_block_production(uuid, text) IS
  'Admin-only production block operation across queue and current stage.';
COMMENT ON FUNCTION public.admin_unblock_production(uuid) IS
  'Admin-only production unblock operation across queue and current stage.';
COMMENT ON FUNCTION public.admin_update_production_schedule(uuid, date) IS
  'Admin-only production schedule update.';
COMMENT ON FUNCTION public.admin_update_production_notes(uuid, text) IS
  'Admin-only production note update.';
COMMENT ON FUNCTION public.admin_update_production_estimated_completion(uuid, timestamptz) IS
  'Admin-only estimated completion update.';
COMMENT ON FUNCTION public.admin_update_production_stage_notes(uuid, text, text) IS
  'Admin-only production stage notes update.';

NOTIFY pgrst, 'reload schema';
