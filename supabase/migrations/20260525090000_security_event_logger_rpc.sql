-- Service-role security event logging RPC.

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  user_id uuid NULL,
  ip_address text NULL,
  endpoint text NULL,
  details jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS ip_address text NULL,
  ADD COLUMN IF NOT EXISTS endpoint text NULL,
  ADD COLUMN IF NOT EXISTS details jsonb NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.security_events
   SET severity = COALESCE(NULLIF(btrim(severity), ''), 'info'),
       details = COALESCE(details, '{}'::jsonb),
       created_at = COALESCE(created_at, now())
 WHERE severity IS NULL
    OR btrim(severity) = ''
    OR details IS NULL
    OR created_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'security_events_severity_check'
       AND conrelid = 'public.security_events'::regclass
  ) THEN
    ALTER TABLE public.security_events
      ADD CONSTRAINT security_events_severity_check
      CHECK (severity IN ('info', 'warn', 'critical'))
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type
  ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity
  ON public.security_events (severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id
  ON public.security_events (user_id);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_events_select_admin ON public.security_events;
DROP POLICY IF EXISTS security_events_service_role_all ON public.security_events;

CREATE POLICY security_events_select_admin
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY security_events_service_role_all
  ON public.security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.security_events FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.security_events FROM authenticated;
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

CREATE OR REPLACE FUNCTION public.record_security_event(
  p_event_type text,
  p_severity text,
  p_source text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_type text := public.customer_mutation_validate_text(p_event_type, 'event_type', 80, true);
  v_severity text := COALESCE(public.customer_mutation_validate_text(p_severity, 'severity', 20, false), 'info');
  v_source text := public.customer_mutation_validate_text(p_source, 'source', 80, true);
  v_ip_address text := public.customer_mutation_validate_text(p_ip_address, 'ip_address', 80, false);
  v_endpoint text := public.customer_mutation_validate_text(p_endpoint, 'endpoint', 500, false);
  v_details jsonb := COALESCE(p_details, '{}'::jsonb);
  v_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;

  IF v_event_type NOT IN (
    'auth_attempt',
    'auth_failure',
    'permission_denied',
    'rate_limit_exceeded',
    'webhook_verification_failed',
    'admin_action',
    'ai_usage_spike',
    'suspicious_input',
    'file_upload_blocked'
  ) THEN
    RAISE EXCEPTION 'event_type is invalid' USING ERRCODE = '22023';
  END IF;

  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity is invalid' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_details) <> 'object' THEN
    RAISE EXCEPTION 'details must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.security_events (
    event_type,
    severity,
    source,
    user_id,
    ip_address,
    endpoint,
    details
  )
  VALUES (
    v_event_type,
    v_severity,
    v_source,
    p_user_id,
    v_ip_address,
    v_endpoint,
    v_details
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_event(text, text, text, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_event(text, text, text, uuid, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.record_security_event(text, text, text, uuid, text, text, jsonb) IS
  'Service-role only validated security event insert.';

NOTIFY pgrst, 'reload schema';
