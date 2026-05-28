-- Centralize email notification event writes behind a service-role RPC.

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NULL,
  message_id uuid NULL,
  recipient_user_id uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz NULL,
  error_message text NULL,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notifications
  ADD COLUMN IF NOT EXISTS conversation_id uuid NULL,
  ADD COLUMN IF NOT EXISTS message_id uuid NULL,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS error_message text NULL,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.email_notifications
   SET status = COALESCE(NULLIF(btrim(status), ''), 'pending'),
       retry_count = COALESCE(retry_count, 0),
       created_at = COALESCE(created_at, now())
 WHERE status IS NULL
    OR btrim(status) = ''
    OR retry_count IS NULL
    OR created_at IS NULL;

ALTER TABLE public.email_notifications
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN retry_count SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_notifications_status_check'
       AND conrelid = 'public.email_notifications'::regclass
  ) THEN
    ALTER TABLE public.email_notifications
      ADD CONSTRAINT email_notifications_status_check
      CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_notifications_retry_count_check'
       AND conrelid = 'public.email_notifications'::regclass
  ) THEN
    ALTER TABLE public.email_notifications
      ADD CONSTRAINT email_notifications_retry_count_check
      CHECK (retry_count >= 0)
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_user_id
  ON public.email_notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_conversation_id
  ON public.email_notifications (conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at
  ON public.email_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status
  ON public.email_notifications (status);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_notifications_select_own_or_admin ON public.email_notifications;
DROP POLICY IF EXISTS email_notifications_service_role_all ON public.email_notifications;

CREATE POLICY email_notifications_select_own_or_admin
  ON public.email_notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY email_notifications_service_role_all
  ON public.email_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.email_notifications FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.email_notifications FROM authenticated;
GRANT SELECT ON public.email_notifications TO authenticated;
GRANT ALL ON public.email_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.record_email_notification_event(
  p_conversation_id uuid,
  p_message_id uuid,
  p_recipient_user_id uuid,
  p_status text,
  p_sent_at timestamptz DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_retry_count integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := public.customer_mutation_validate_text(p_status, 'status', 40, true);
  v_error_message text := public.customer_mutation_validate_text(p_error_message, 'error_message', 1000, false);
  v_retry_count integer := COALESCE(p_retry_count, 0);
  v_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;

  IF p_recipient_user_id IS NULL THEN
    RAISE EXCEPTION 'recipient_user_id is required' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN ('pending', 'sent', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'Invalid email notification status' USING ERRCODE = '22023';
  END IF;

  IF v_retry_count < 0 OR v_retry_count > 20 THEN
    RAISE EXCEPTION 'retry_count is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.email_notifications (
    conversation_id,
    message_id,
    recipient_user_id,
    status,
    sent_at,
    error_message,
    retry_count
  )
  VALUES (
    p_conversation_id,
    p_message_id,
    p_recipient_user_id,
    v_status,
    p_sent_at,
    v_error_message,
    v_retry_count
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_email_notification_event(uuid, uuid, uuid, text, timestamptz, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_notification_event(uuid, uuid, uuid, text, timestamptz, text, integer) TO service_role;

COMMENT ON FUNCTION public.record_email_notification_event(uuid, uuid, uuid, text, timestamptz, text, integer) IS
  'Service-role only validated email notification event insert.';

NOTIFY pgrst, 'reload schema';
