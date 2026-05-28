-- Harden notification action URLs so stored click targets cannot become open redirects or script URLs.

CREATE OR REPLACE FUNCTION public.is_safe_in_app_path(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    p_path IS NULL
    OR (
      char_length(p_path) <= 2048
      AND left(p_path, 1) = '/'
      AND left(p_path, 2) <> '//'
      AND p_path !~ '[[:cntrl:]]'
    );
$$;

UPDATE public.admin_notifications
SET action_url = NULL
WHERE action_url IS NOT NULL
  AND NOT public.is_safe_in_app_path(action_url);

ALTER TABLE public.admin_notifications
  DROP CONSTRAINT IF EXISTS admin_notifications_action_url_safe;

ALTER TABLE public.admin_notifications
  ADD CONSTRAINT admin_notifications_action_url_safe
  CHECK (public.is_safe_in_app_path(action_url));

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type TEXT DEFAULT 'info',
  p_title TEXT DEFAULT 'Notificacao',
  p_message TEXT DEFAULT '',
  p_priority TEXT DEFAULT 'medium',
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_recipient_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_user RECORD;
  v_action_url TEXT := NULLIF(btrim(p_action_url), '');
BEGIN
  IF NOT public.is_safe_in_app_path(v_action_url) THEN
    RAISE EXCEPTION 'Unsafe notification action URL';
  END IF;

  IF p_recipient_user_id IS NOT NULL THEN
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      v_action_url,
      p_related_id,
      p_related_type,
      p_metadata,
      p_recipient_user_id
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  FOR v_admin_user IN
    SELECT id
    FROM public.profiles
    WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      v_action_url,
      p_related_id,
      p_related_type,
      p_metadata,
      v_admin_user.id
    )
    RETURNING id INTO v_notification_id;
  END LOOP;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.is_safe_in_app_path(TEXT) IS 'Validates internal app paths used as notification action URLs';
