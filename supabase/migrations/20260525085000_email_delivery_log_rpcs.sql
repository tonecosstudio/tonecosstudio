-- Centralize email delivery log writes behind validated RPCs.

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  recipient_email text NOT NULL,
  email_type text NOT NULL DEFAULT 'other',
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'edge-function',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text NULL,
  retry_count integer NOT NULL DEFAULT 0,
  provider_message_id text NULL,
  sent_at timestamptz NULL,
  opened_at timestamptz NULL,
  clicked_at timestamptz NULL,
  bounced_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_delivery_logs
  ADD COLUMN IF NOT EXISTS user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS email_type text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'edge-function',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message text NULL,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_message_id text NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.email_delivery_logs
   SET email_type = COALESCE(NULLIF(btrim(email_type), ''), 'other'),
       status = COALESCE(NULLIF(btrim(status), ''), 'pending'),
       provider = COALESCE(NULLIF(btrim(provider), ''), 'edge-function'),
       metadata = COALESCE(metadata, '{}'::jsonb),
       retry_count = COALESCE(retry_count, 0),
       created_at = COALESCE(created_at, now()),
       updated_at = COALESCE(updated_at, now())
 WHERE email_type IS NULL
    OR btrim(email_type) = ''
    OR status IS NULL
    OR btrim(status) = ''
    OR provider IS NULL
    OR btrim(provider) = ''
    OR metadata IS NULL
    OR retry_count IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL;

ALTER TABLE public.email_delivery_logs
  ALTER COLUMN email_type SET DEFAULT 'other',
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN provider SET DEFAULT 'edge-function',
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN retry_count SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_delivery_logs_status_check'
       AND conrelid = 'public.email_delivery_logs'::regclass
  ) THEN
    ALTER TABLE public.email_delivery_logs
      ADD CONSTRAINT email_delivery_logs_status_check
      CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_delivery_logs_retry_count_check'
       AND conrelid = 'public.email_delivery_logs'::regclass
  ) THEN
    ALTER TABLE public.email_delivery_logs
      ADD CONSTRAINT email_delivery_logs_retry_count_check
      CHECK (retry_count >= 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_delivery_logs_metadata_object_check'
       AND conrelid = 'public.email_delivery_logs'::regclass
  ) THEN
    ALTER TABLE public.email_delivery_logs
      ADD CONSTRAINT email_delivery_logs_metadata_object_check
      CHECK (jsonb_typeof(metadata) = 'object')
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_user_id
  ON public.email_delivery_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at
  ON public.email_delivery_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status
  ON public.email_delivery_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_recipient_email
  ON public.email_delivery_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_provider_message_id
  ON public.email_delivery_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_delivery_logs_select_admin_or_own ON public.email_delivery_logs;
DROP POLICY IF EXISTS email_delivery_logs_service_role_all ON public.email_delivery_logs;

CREATE POLICY email_delivery_logs_select_admin_or_own
  ON public.email_delivery_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY email_delivery_logs_service_role_all
  ON public.email_delivery_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.email_delivery_logs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.email_delivery_logs FROM authenticated;
GRANT SELECT ON public.email_delivery_logs TO authenticated;
GRANT ALL ON public.email_delivery_logs TO service_role;

CREATE OR REPLACE FUNCTION public.email_log_validate_text(
  p_value text,
  p_field text,
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
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field USING ERRCODE = '22023';
    END IF;
    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length THEN
    RAISE EXCEPTION '% exceeds maximum length', p_field USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.email_log_validate_timestamp(
  p_value text,
  p_field text
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_value::timestamptz;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '% must be a valid timestamp', p_field USING ERRCODE = '22007';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_email_delivery_log(
  p_user_id uuid,
  p_recipient_email text,
  p_email_type text,
  p_subject text,
  p_status text,
  p_provider text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_auth_role text := COALESCE(auth.role(), '');
  v_is_service_role boolean := COALESCE(auth.role(), '') = 'service_role';
  v_is_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'), false)
    OR COALESCE(public.has_role(auth.uid(), 'super_admin'), false);
  v_effective_user_id uuid := p_user_id;
  v_recipient_email text;
  v_email_type text;
  v_subject text;
  v_status text;
  v_provider text;
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_log_id uuid;
BEGIN
  IF NOT v_is_service_role AND v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF v_auth_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  IF v_effective_user_id IS NULL AND NOT v_is_service_role THEN
    v_effective_user_id := v_auth_uid;
  END IF;

  IF NOT v_is_service_role
     AND NOT v_is_admin
     AND v_effective_user_id IS DISTINCT FROM v_auth_uid THEN
    RAISE EXCEPTION 'Cannot create email logs for another user' USING ERRCODE = '42501';
  END IF;

  v_recipient_email := lower(public.email_log_validate_text(p_recipient_email, 'recipient_email', 320, true));
  IF v_recipient_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'recipient_email is invalid' USING ERRCODE = '22023';
  END IF;

  v_email_type := public.email_log_validate_text(p_email_type, 'email_type', 80, true);
  v_subject := public.email_log_validate_text(p_subject, 'subject', 300, true);
  v_status := public.email_log_validate_text(p_status, 'status', 40, true);
  v_provider := public.email_log_validate_text(p_provider, 'provider', 80, true);

  IF v_status NOT IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked') THEN
    RAISE EXCEPTION 'Invalid email log status' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.email_delivery_logs (
    user_id,
    recipient_email,
    email_type,
    subject,
    status,
    provider,
    metadata
  )
  VALUES (
    v_effective_user_id,
    v_recipient_email,
    v_email_type,
    v_subject,
    v_status,
    v_provider,
    v_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_delivery_log(
  p_log_id uuid,
  p_updates jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_auth_role text := COALESCE(auth.role(), '');
  v_is_service_role boolean := COALESCE(auth.role(), '') = 'service_role';
  v_is_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'), false)
    OR COALESCE(public.has_role(auth.uid(), 'super_admin'), false);
  v_key text;
  v_value text;
  v_log public.email_delivery_logs%ROWTYPE;
  v_updated_id uuid;
BEGIN
  IF p_log_id IS NULL THEN
    RAISE EXCEPTION 'log id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_service_role AND v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF v_auth_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Email log update payload must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_log
    FROM public.email_delivery_logs
   WHERE id = p_log_id;

  IF v_log.id IS NULL THEN
    RAISE EXCEPTION 'Email delivery log not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_service_role
     AND NOT v_is_admin
     AND v_log.user_id IS DISTINCT FROM v_auth_uid THEN
    RAISE EXCEPTION 'Cannot update email logs for another user' USING ERRCODE = '42501';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each_text(p_updates)
  LOOP
    IF v_key = 'status' THEN
      IF v_value NOT IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked') THEN
        RAISE EXCEPTION 'Invalid email log status' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('sent_at', 'opened_at', 'clicked_at', 'bounced_at') THEN
      PERFORM public.email_log_validate_timestamp(v_value, v_key);
    ELSIF v_key = 'error_message' THEN
      PERFORM public.email_log_validate_text(v_value, 'error_message', 1000, false);
    ELSIF v_key = 'provider_message_id' THEN
      PERFORM public.email_log_validate_text(v_value, 'provider_message_id', 255, false);
    ELSIF v_key = 'retry_count' THEN
      IF v_value !~ '^[0-9]+$' OR v_value::integer > 20 THEN
        RAISE EXCEPTION 'retry_count is invalid' USING ERRCODE = '22023';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported email log field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  UPDATE public.email_delivery_logs
     SET status = CASE WHEN p_updates ? 'status' THEN p_updates->>'status' ELSE status END,
         sent_at = CASE WHEN p_updates ? 'sent_at'
           THEN public.email_log_validate_timestamp(p_updates->>'sent_at', 'sent_at')
           ELSE sent_at
         END,
         opened_at = CASE WHEN p_updates ? 'opened_at'
           THEN public.email_log_validate_timestamp(p_updates->>'opened_at', 'opened_at')
           ELSE opened_at
         END,
         clicked_at = CASE WHEN p_updates ? 'clicked_at'
           THEN public.email_log_validate_timestamp(p_updates->>'clicked_at', 'clicked_at')
           ELSE clicked_at
         END,
         bounced_at = CASE WHEN p_updates ? 'bounced_at'
           THEN public.email_log_validate_timestamp(p_updates->>'bounced_at', 'bounced_at')
           ELSE bounced_at
         END,
         error_message = CASE WHEN p_updates ? 'error_message'
           THEN public.email_log_validate_text(p_updates->>'error_message', 'error_message', 1000, false)
           ELSE error_message
         END,
         retry_count = CASE WHEN p_updates ? 'retry_count'
           THEN (p_updates->>'retry_count')::integer
           ELSE retry_count
         END,
         provider_message_id = CASE WHEN p_updates ? 'provider_message_id'
           THEN public.email_log_validate_text(p_updates->>'provider_message_id', 'provider_message_id', 255, false)
           ELSE provider_message_id
         END,
         updated_at = now()
   WHERE id = p_log_id
  RETURNING id INTO v_updated_id;

  RETURN v_updated_id;
END;
$$;

REVOKE ALL ON FUNCTION public.email_log_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_log_validate_timestamp(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_email_delivery_log(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_email_delivery_log(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb) IS
  'Validated email delivery log creation. Blocks direct client table writes.';
COMMENT ON FUNCTION public.update_email_delivery_log(uuid, jsonb) IS
  'Validated email delivery log update for the log owner, admins, or service role.';

NOTIFY pgrst, 'reload schema';
