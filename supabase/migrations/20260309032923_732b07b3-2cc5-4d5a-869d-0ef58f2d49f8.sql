-- Rate limiting table for tracking API requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_endpoint_window 
  ON public.rate_limits (key, endpoint, window_start);

-- Auto-cleanup index
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON public.rate_limits (window_start);

-- Enable RLS - only service role can access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM rate_limits
  WHERE key = p_key 
    AND endpoint = p_endpoint 
    AND window_start >= v_window_start;
  
  IF v_current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  INSERT INTO rate_limits (key, endpoint, window_start)
  VALUES (p_key, p_endpoint, now());
  
  -- Probabilistic cleanup (~1% of requests)
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;
  
  RETURN true;
END;
$$;