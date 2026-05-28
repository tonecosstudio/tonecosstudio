-- Admin production stage completion and transition log RPCs.

ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS stage_order integer,
  ADD COLUMN IF NOT EXISTS estimated_duration integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_duration numeric,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_production_stages_queue_order
  ON public.production_stages(production_queue_id, stage_order);

CREATE TABLE IF NOT EXISTS public.stage_transition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_queue_id uuid NOT NULL REFERENCES public.production_queue(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text,
  is_override boolean NOT NULL DEFAULT false,
  justification text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_transition_logs
  ADD COLUMN IF NOT EXISTS production_queue_id uuid REFERENCES public.production_queue(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS from_stage text,
  ADD COLUMN IF NOT EXISTS to_stage text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS justification text,
  ADD COLUMN IF NOT EXISTS timestamp timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_queue_id
  ON public.stage_transition_logs(production_queue_id);
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_timestamp
  ON public.stage_transition_logs(timestamp DESC);

ALTER TABLE public.stage_transition_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stage_transition_logs FROM anon;
GRANT SELECT, INSERT ON TABLE public.stage_transition_logs TO authenticated;

DROP POLICY IF EXISTS "stage_transition_logs_select_own_or_admin" ON public.stage_transition_logs;
CREATE POLICY "stage_transition_logs_select_own_or_admin"
  ON public.stage_transition_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = stage_transition_logs.production_queue_id
        AND pq.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "stage_transition_logs_admin_insert" ON public.stage_transition_logs;
CREATE POLICY "stage_transition_logs_admin_insert"
  ON public.stage_transition_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_validate_stage_photo_urls(p_photos text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photos text[] := COALESCE(p_photos, ARRAY[]::text[]);
  v_photo text;
  v_result text[] := ARRAY[]::text[];
BEGIN
  IF array_length(v_photos, 1) > 25 THEN
    RAISE EXCEPTION 'Too many stage photos' USING ERRCODE = '22023';
  END IF;

  FOREACH v_photo IN ARRAY v_photos LOOP
    v_result := array_append(v_result, public.admin_validate_photo_url(v_photo));
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_stage_json(p_row public.production_stages)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'production_queue_id', p_row.production_queue_id,
    'stage_name', p_row.stage_name,
    'stage_order', p_row.stage_order,
    'status', p_row.status,
    'started_at', p_row.started_at,
    'completed_at', p_row.completed_at,
    'estimated_duration', p_row.estimated_duration,
    'actual_duration', p_row.actual_duration,
    'assigned_to', p_row.assigned_to,
    'assigned_to_name', p_row.assigned_to_name,
    'assigned_at', p_row.assigned_at,
    'notes', p_row.notes,
    'photos', p_row.photos,
    'is_blocked', p_row.is_blocked,
    'block_reason', p_row.block_reason,
    'blocked_at', p_row.blocked_at,
    'unblocked_at', p_row.unblocked_at,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_insert_stage_transition_log(
  p_production_queue_id uuid,
  p_from_stage text,
  p_to_stage text,
  p_is_override boolean DEFAULT false,
  p_justification text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_to_stage text := public.admin_validate_production_stage(p_to_stage);
  v_from_stage text := NULLIF(btrim(COALESCE(p_from_stage, '')), '');
  v_justification text := public.admin_validate_production_note(p_justification, COALESCE(p_is_override, false));
  v_user_name text;
  v_log_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_from_stage IS NOT NULL
    AND (length(v_from_stage) > 80 OR v_from_stage ~ '[[:cntrl:]<>]') THEN
    RAISE EXCEPTION 'Invalid previous stage' USING ERRCODE = '22023';
  END IF;

  IF p_production_queue_id IS NULL THEN
    RAISE EXCEPTION 'Production queue item is required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(full_name, email, 'Admin')
  INTO v_user_name
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.stage_transition_logs (
    production_queue_id,
    from_stage,
    to_stage,
    user_id,
    user_name,
    is_override,
    justification,
    timestamp
  )
  VALUES (
    p_production_queue_id,
    v_from_stage,
    v_to_stage,
    auth.uid(),
    COALESCE(v_user_name, 'Admin'),
    COALESCE(p_is_override, false),
    v_justification,
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_production_stage(
  p_stage_id uuid,
  p_notes text DEFAULT NULL,
  p_photos text[] DEFAULT ARRAY[]::text[],
  p_is_override boolean DEFAULT false,
  p_justification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage public.production_stages%ROWTYPE;
  v_updated_stage public.production_stages%ROWTYPE;
  v_notes text := public.admin_validate_production_note(p_notes, false);
  v_justification text := public.admin_validate_production_note(p_justification, COALESCE(p_is_override, false));
  v_photos text[] := public.admin_validate_stage_photo_urls(p_photos);
  v_previous_stage text;
  v_next_stage text;
  v_incomplete_count integer;
  v_now timestamptz := now();
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_stage
  FROM public.production_stages
  WHERE id = p_stage_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production stage not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_stage.status = 'completed' THEN
    RAISE EXCEPTION 'Production stage is already completed' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_stage.is_blocked, false) = true THEN
    RAISE EXCEPTION 'Production stage is blocked' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_is_override, false) = false AND v_stage.stage_order IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_incomplete_count
    FROM public.production_stages ps
    WHERE ps.production_queue_id = v_stage.production_queue_id
      AND ps.stage_order < v_stage.stage_order
      AND ps.status <> 'completed';

    IF v_incomplete_count > 0 THEN
      RAISE EXCEPTION 'Previous production stages must be completed first' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT ps.stage_name
  INTO v_previous_stage
  FROM public.production_stages ps
  WHERE ps.production_queue_id = v_stage.production_queue_id
    AND ps.stage_order < v_stage.stage_order
  ORDER BY ps.stage_order DESC
  LIMIT 1;

  SELECT ps.stage_name
  INTO v_next_stage
  FROM public.production_stages ps
  WHERE ps.production_queue_id = v_stage.production_queue_id
    AND ps.stage_order > v_stage.stage_order
  ORDER BY ps.stage_order ASC
  LIMIT 1;

  UPDATE public.production_stages
  SET status = 'completed',
      started_at = COALESCE(started_at, v_now),
      completed_at = v_now,
      notes = COALESCE(v_notes, notes),
      photos = CASE WHEN array_length(v_photos, 1) IS NULL THEN photos ELSE v_photos END,
      actual_duration = CASE
        WHEN COALESCE(started_at, v_now) IS NOT NULL
          THEN ROUND((EXTRACT(EPOCH FROM (v_now - COALESCE(started_at, v_now))) / 3600)::numeric, 2)
        ELSE actual_duration
      END,
      updated_at = v_now
  WHERE id = p_stage_id
  RETURNING * INTO v_updated_stage;

  PERFORM public.admin_insert_stage_transition_log(
    v_stage.production_queue_id,
    v_previous_stage,
    v_stage.stage_name,
    COALESCE(p_is_override, false),
    v_justification
  );

  UPDATE public.production_queue
  SET current_stage = COALESCE(v_next_stage, v_stage.stage_name),
      production_status = CASE
        WHEN v_next_stage IS NULL THEN 'completed'
        ELSE public.admin_production_status_for_stage(v_next_stage)
      END,
      production_completed_at = CASE WHEN v_next_stage IS NULL THEN v_now ELSE production_completed_at END,
      updated_at = v_now
  WHERE id = v_stage.production_queue_id;

  RETURN public.admin_stage_json(v_updated_stage);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_log_stage_transition(
  p_production_queue_id uuid,
  p_from_stage text,
  p_to_stage text,
  p_is_override boolean DEFAULT false,
  p_justification text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.admin_insert_stage_transition_log(
    p_production_queue_id,
    p_from_stage,
    p_to_stage,
    p_is_override,
    p_justification
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_stage_photo_urls(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_stage_json(public.production_stages) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_insert_stage_transition_log(uuid, text, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_complete_production_stage(uuid, text, text[], boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_log_stage_transition(uuid, text, text, boolean, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_complete_production_stage(uuid, text, text[], boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_log_stage_transition(uuid, text, text, boolean, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_complete_production_stage(uuid, text, text[], boolean, text) IS
  'Admin-only production stage completion with validation, queue sync, and transition logging.';
COMMENT ON FUNCTION public.admin_log_stage_transition(uuid, text, text, boolean, text) IS
  'Admin-only production stage transition log insert.';

NOTIFY pgrst, 'reload schema';
