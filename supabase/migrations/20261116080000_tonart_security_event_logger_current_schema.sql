-- Align the existing Edge security logger with TONART's current, single Supabase
-- authority. The historical logger depended on removed public.has_role and
-- customer_mutation_validate_text; do not restore those legacy contracts.
-- This is a service-role-only append operation, not a second audit service.
BEGIN;

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  user_id uuid,
  ip_address text,
  endpoint text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT tonart_security_events_severity_valid
    CHECK (severity IN ('info', 'warn', 'critical')),
  CONSTRAINT tonart_security_events_details_object
    CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id
  ON public.security_events (user_id);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_events_select_admin ON public.security_events;
CREATE POLICY security_events_select_admin
  ON public.security_events
  FOR SELECT TO authenticated
  USING ((SELECT private_api.is_current_admin()));

DROP POLICY IF EXISTS security_events_service_role_all ON public.security_events;
CREATE POLICY security_events_service_role_all
  ON public.security_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.security_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.security_events TO service_role;

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
SECURITY INVOKER
SET search_path = ''
AS $record$
DECLARE
  v_event_type text := btrim(COALESCE(p_event_type, ''));
  v_severity text := btrim(COALESCE(p_severity, 'info'));
  v_source text := btrim(COALESCE(p_source, ''));
  v_ip_address text := NULLIF(btrim(p_ip_address), '');
  v_endpoint text := NULLIF(btrim(p_endpoint), '');
  v_details jsonb := COALESCE(p_details, '{}'::jsonb);
  v_id uuid;
BEGIN
  IF v_event_type NOT IN (
    'auth_attempt', 'auth_failure', 'permission_denied', 'rate_limit_exceeded',
    'webhook_verification_failed', 'admin_action', 'ai_usage_spike',
    'suspicious_input', 'file_upload_blocked'
  ) THEN
    RAISE EXCEPTION 'Invalid security event type' USING ERRCODE = '22023';
  END IF;
  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'Invalid security event severity' USING ERRCODE = '22023';
  END IF;
  IF v_source = '' OR char_length(v_source) > 80
     OR char_length(v_event_type) > 80
     OR (v_ip_address IS NOT NULL AND char_length(v_ip_address) > 80)
     OR (v_endpoint IS NOT NULL AND char_length(v_endpoint) > 500) THEN
    RAISE EXCEPTION 'Invalid security event fields' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_details) <> 'object' THEN
    RAISE EXCEPTION 'Security event details must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.security_events (
    event_type, severity, source, user_id, ip_address, endpoint, details
  ) VALUES (
    v_event_type, v_severity, v_source, p_user_id, v_ip_address, v_endpoint, v_details
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$record$;

REVOKE ALL ON FUNCTION public.record_security_event(
  text, text, text, uuid, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_event(
  text, text, text, uuid, text, text, jsonb
) TO service_role;

COMMENT ON TABLE public.security_events IS
  'Canonical TONART Edge security events; service writes and admin-only read via the existing admin authority.';
COMMENT ON FUNCTION public.record_security_event(
  text, text, text, uuid, text, text, jsonb
) IS
  'Service-role-only validated security event recording, without legacy role or text helpers.';

NOTIFY pgrst, 'reload schema';
COMMIT;
