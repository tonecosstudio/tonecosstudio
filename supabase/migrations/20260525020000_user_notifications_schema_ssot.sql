-- Align user_notifications with the notification center contract used by
-- customer pages, admin payment flows, and Edge Functions.

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS related_id UUID,
  ADD COLUMN IF NOT EXISTS related_type TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_notifications_priority_check'
      AND conrelid = 'public.user_notifications'::regclass
  ) THEN
    ALTER TABLE public.user_notifications
      ADD CONSTRAINT user_notifications_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_notifications_action_url_safe'
      AND conrelid = 'public.user_notifications'::regclass
  ) THEN
    ALTER TABLE public.user_notifications
      ADD CONSTRAINT user_notifications_action_url_safe
      CHECK (
        action_url IS NULL
        OR (
          action_url LIKE '/%'
          AND action_url NOT LIKE '//%'
          AND action_url !~* '^[[:space:]]*javascript:'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_notifications_related
  ON public.user_notifications(related_id, related_type);

CREATE INDEX IF NOT EXISTS idx_user_notifications_priority
  ON public.user_notifications(priority);

CREATE OR REPLACE FUNCTION public.mark_user_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.user_notifications
  SET
    is_read = true,
    read_at = COALESCE(read_at, NOW())
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM public.mark_user_notification_read(notification_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.mark_all_user_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.user_notifications
  SET
    is_read = true,
    read_at = COALESCE(read_at, NOW())
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  PERFORM public.mark_all_user_notifications_read();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.mark_user_notification_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_user_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_as_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_user_notification_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_user_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated, service_role;

COMMENT ON COLUMN public.user_notifications.priority IS 'Priority: low, medium, high, urgent';
COMMENT ON COLUMN public.user_notifications.action_url IS 'Safe in-app action path for notification clicks';
COMMENT ON COLUMN public.user_notifications.related_id IS 'Optional related entity id';
COMMENT ON COLUMN public.user_notifications.related_type IS 'Optional related entity type';
COMMENT ON COLUMN public.user_notifications.metadata IS 'Additional notification metadata';

NOTIFY pgrst, 'reload schema';
