-- Production assignment logging inside the admin assignment RPC.

CREATE TABLE IF NOT EXISTS public.production_assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_queue_id uuid NOT NULL REFERENCES public.production_queue(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name text,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_reassignment boolean NOT NULL DEFAULT false,
  previous_assignee uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_assignee_name text,
  reason text,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_assignment_logs
  ADD COLUMN IF NOT EXISTS production_queue_id uuid REFERENCES public.production_queue(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_reassignment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_assignee uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_assignee_name text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_production_assignment_logs_queue_id
  ON public.production_assignment_logs(production_queue_id);
CREATE INDEX IF NOT EXISTS idx_production_assignment_logs_assigned_to
  ON public.production_assignment_logs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_assignment_logs_assigned_at
  ON public.production_assignment_logs(assigned_at DESC);

ALTER TABLE public.production_assignment_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.production_assignment_logs FROM anon;
GRANT SELECT, INSERT ON TABLE public.production_assignment_logs TO authenticated;

DROP POLICY IF EXISTS "production_assignment_logs_select_admin_or_assignee" ON public.production_assignment_logs;
CREATE POLICY "production_assignment_logs_select_admin_or_assignee"
  ON public.production_assignment_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = production_assignment_logs.production_queue_id
        AND pq.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_assignment_logs_admin_insert" ON public.production_assignment_logs;
CREATE POLICY "production_assignment_logs_admin_insert"
  ON public.production_assignment_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
   WHERE id = p_queue_id
   FOR UPDATE;

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

  INSERT INTO public.production_assignment_logs (
    production_queue_id,
    assigned_to,
    assigned_to_name,
    assigned_by,
    is_reassignment,
    previous_assignee,
    previous_assignee_name,
    reason,
    assigned_at
  )
  VALUES (
    p_queue_id,
    p_user_id,
    v_user_name,
    auth.uid(),
    v_is_reassignment,
    v_current.assigned_to,
    v_current.assigned_to_name,
    v_reason,
    now()
  );

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_production(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_production(uuid, uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_assign_production(uuid, uuid, text) IS
  'Admin-only production assignment update with transactional assignment log.';

NOTIFY pgrst, 'reload schema';
