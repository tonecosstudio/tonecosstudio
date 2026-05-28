CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL CHECK (length(btrim(job_name)) > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  error_message text,
  execution_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name
  ON public.cron_job_logs (job_name);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at
  ON public.cron_job_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status
  ON public.cron_job_logs (status);

ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cron_job_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cron_job_logs TO authenticated;
GRANT ALL ON public.cron_job_logs TO service_role;

DROP POLICY IF EXISTS cron_job_logs_admin_select ON public.cron_job_logs;
CREATE POLICY cron_job_logs_admin_select
  ON public.cron_job_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS cron_job_logs_service_role_all ON public.cron_job_logs;
CREATE POLICY cron_job_logs_service_role_all
  ON public.cron_job_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.start_cron_job_log(
  p_job_name text,
  p_execution_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  IF p_job_name IS NULL OR length(btrim(p_job_name)) = 0 THEN
    RAISE EXCEPTION 'job_name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cron_job_logs (
    job_name,
    status,
    execution_details
  )
  VALUES (
    btrim(p_job_name),
    'running',
    p_execution_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_cron_job_log(
  p_log_id uuid,
  p_execution_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_log_id IS NULL THEN
    RAISE EXCEPTION 'log_id is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cron_job_logs
     SET status = 'success',
         completed_at = now(),
         error_message = NULL,
         execution_details = p_execution_details
   WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cron job log not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_cron_job_log(
  p_log_id uuid,
  p_error_message text,
  p_execution_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_log_id IS NULL THEN
    RAISE EXCEPTION 'log_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_error_message IS NULL OR length(btrim(p_error_message)) = 0 THEN
    RAISE EXCEPTION 'error_message is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cron_job_logs
     SET status = 'failed',
         completed_at = now(),
         error_message = btrim(p_error_message),
         execution_details = p_execution_details
   WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cron job log not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs(
  p_retention_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'retention_days must be greater than zero' USING ERRCODE = '22023';
  END IF;

  WITH deleted AS (
    DELETE FROM public.cron_job_logs
     WHERE created_at < now() - make_interval(days => p_retention_days)
     RETURNING 1
  )
  SELECT count(*)::integer INTO v_deleted_count
    FROM deleted;

  RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.start_cron_job_log(text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_cron_job_log(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_cron_job_log(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_cron_logs(integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.start_cron_job_log(text, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_cron_job_log(uuid, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_cron_job_log(uuid, text, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_cron_logs(integer)
  TO service_role;

COMMENT ON TABLE public.cron_job_logs IS
  'Audit trail for scheduled Edge Function and database cron executions.';

COMMENT ON FUNCTION public.start_cron_job_log(text, jsonb) IS
  'Creates a running cron job log and returns its id.';

COMMENT ON FUNCTION public.complete_cron_job_log(uuid, jsonb) IS
  'Marks a cron job log as completed successfully.';

COMMENT ON FUNCTION public.fail_cron_job_log(uuid, text, jsonb) IS
  'Marks a cron job log as failed with an error message.';

COMMENT ON FUNCTION public.cleanup_old_cron_logs(integer) IS
  'Deletes cron job logs older than the configured retention window.';
