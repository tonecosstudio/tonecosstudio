-- Backend rate-limit state for Edge Functions.
-- This is service-role only: browser roles must not be able to burn or inspect buckets.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_request_count_positive CHECK (request_count > 0),
  CONSTRAINT rate_limits_key_endpoint_window_unique UNIQUE (key, endpoint, window_start)
);

ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS request_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS window_start timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.rate_limits
   SET request_count = COALESCE(NULLIF(request_count, 0), 1),
       window_start = COALESCE(window_start, now()),
       created_at = COALESCE(created_at, now())
 WHERE request_count IS NULL
    OR request_count < 1
    OR window_start IS NULL
    OR created_at IS NULL;

ALTER TABLE public.rate_limits
  ALTER COLUMN key SET NOT NULL,
  ALTER COLUMN endpoint SET NOT NULL,
  ALTER COLUMN request_count SET NOT NULL,
  ALTER COLUMN request_count SET DEFAULT 1,
  ALTER COLUMN window_start SET NOT NULL,
  ALTER COLUMN window_start SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'rate_limits_request_count_positive'
       AND conrelid = 'public.rate_limits'::regclass
  ) THEN
    ALTER TABLE public.rate_limits
      ADD CONSTRAINT rate_limits_request_count_positive
      CHECK (request_count > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'rate_limits_key_endpoint_window_unique'
       AND conrelid = 'public.rate_limits'::regclass
  ) THEN
    ALTER TABLE public.rate_limits
      ADD CONSTRAINT rate_limits_key_endpoint_window_unique
      UNIQUE (key, endpoint, window_start);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_endpoint
  ON public.rate_limits (key, endpoint);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_limits_service_role_all ON public.rate_limits;

CREATE POLICY rate_limits_service_role_all
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text := btrim(COALESCE(p_key, ''));
  v_endpoint text := btrim(COALESCE(p_endpoint, ''));
  v_window_seconds integer := COALESCE(p_window_seconds, 60);
  v_window_start timestamptz;
  v_request_count integer;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;

  IF v_key = '' THEN
    RAISE EXCEPTION 'rate limit key is required' USING ERRCODE = '22023';
  END IF;

  IF v_endpoint = '' THEN
    RAISE EXCEPTION 'rate limit endpoint is required' USING ERRCODE = '22023';
  END IF;

  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'rate limit max requests must be positive' USING ERRCODE = '22023';
  END IF;

  IF v_window_seconds < 1 THEN
    RAISE EXCEPTION 'rate limit window seconds must be positive' USING ERRCODE = '22023';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO public.rate_limits (key, endpoint, request_count, window_start)
  VALUES (v_key, v_endpoint, 1, v_window_start)
  ON CONFLICT (key, endpoint, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1
  RETURNING request_count INTO v_request_count;

  DELETE FROM public.rate_limits
   WHERE window_start < clock_timestamp() - interval '24 hours';

  RETURN v_request_count <= p_max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

COMMENT ON TABLE public.rate_limits IS
  'Service-role only Edge Function rate-limit buckets.';
COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS
  'Service-role only atomic rate-limit increment/check for Edge Functions.';

NOTIFY pgrst, 'reload schema';
