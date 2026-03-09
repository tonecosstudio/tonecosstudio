
-- Security events table for centralized security logging
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  user_id uuid NULL,
  ip_address text NULL,
  endpoint text NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for querying by type and time
CREATE INDEX idx_security_events_type_created ON public.security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events (severity, created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role / edge functions can insert (no user-level insert)
CREATE POLICY "Service can insert security events"
  ON public.security_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Auto-cleanup: delete events older than 90 days (via function)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.security_events WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
