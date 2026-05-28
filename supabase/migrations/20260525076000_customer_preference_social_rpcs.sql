-- Customer preference/social mutation RPCs.
-- Centralizes browser-side writes for preferences, notifications, likes, and wishlist.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT jsonb_build_object(
    'production_stage_updates', true,
    'item_shipped', true,
    'item_delivered', true,
    'marketing_emails', true
  );

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  welcome_emails boolean NOT NULL DEFAULT true,
  reminder_emails boolean NOT NULL DEFAULT true,
  revelation_emails boolean NOT NULL DEFAULT true,
  shipping_emails boolean NOT NULL DEFAULT true,
  payment_emails boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select_own_or_admin" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select_own_or_admin"
  ON public.notification_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR COALESCE(auth.role(), '') = 'service_role'
  );

DROP POLICY IF EXISTS "notification_preferences_modify_own_or_admin" ON public.notification_preferences;
CREATE POLICY "notification_preferences_modify_own_or_admin"
  ON public.notification_preferences
  FOR ALL
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR COALESCE(auth.role(), '') = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR COALESCE(auth.role(), '') = 'service_role'
  );

CREATE OR REPLACE FUNCTION public.validate_email_notification_preferences(p_preferences jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'welcome_emails',
    'reminder_emails',
    'revelation_emails',
    'shipping_emails',
    'payment_emails'
  ];
  v_key text;
  v_value jsonb;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF p_preferences IS NULL THEN
    RETURN jsonb_build_object(
      'welcome_emails', true,
      'reminder_emails', true,
      'revelation_emails', true,
      'shipping_emails', true,
      'payment_emails', true
    );
  END IF;

  IF jsonb_typeof(p_preferences) <> 'object' THEN
    RAISE EXCEPTION 'Notification preferences must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_preferences)
  LOOP
    IF NOT v_key = ANY(v_allowed) THEN
      RAISE EXCEPTION 'Unsupported notification preference: %', v_key USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(v_value) <> 'boolean' THEN
      RAISE EXCEPTION 'Notification preference must be boolean: %', v_key USING ERRCODE = '22023';
    END IF;

    v_result := v_result || jsonb_build_object(v_key, v_value);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_customer_notification_preferences(p_preferences jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'production_stage_updates',
    'item_shipped',
    'item_delivered',
    'marketing_emails'
  ];
  v_key text;
  v_value jsonb;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF p_preferences IS NULL OR jsonb_typeof(p_preferences) <> 'object' THEN
    RAISE EXCEPTION 'Customer notification preferences must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_preferences)
  LOOP
    IF NOT v_key = ANY(v_allowed) THEN
      RAISE EXCEPTION 'Unsupported customer notification preference: %', v_key USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(v_value) <> 'boolean' THEN
      RAISE EXCEPTION 'Customer notification preference must be boolean: %', v_key USING ERRCODE = '22023';
    END IF;

    v_result := v_result || jsonb_build_object(v_key, v_value);
  END LOOP;

  IF v_result = '{}'::jsonb THEN
    RAISE EXCEPTION 'No customer notification preferences supplied' USING ERRCODE = '22023';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_email_notification_preferences(
  p_user_id uuid,
  p_preferences jsonb DEFAULT NULL
)
RETURNS public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_preferences jsonb := public.validate_email_notification_preferences(p_preferences);
  v_result public.notification_preferences%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.has_role(auth.uid(), 'admin')
    AND auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notification_preferences (
    user_id,
    welcome_emails,
    reminder_emails,
    revelation_emails,
    shipping_emails,
    payment_emails,
    updated_at
  )
  VALUES (
    v_user_id,
    COALESCE((v_preferences->>'welcome_emails')::boolean, true),
    COALESCE((v_preferences->>'reminder_emails')::boolean, true),
    COALESCE((v_preferences->>'revelation_emails')::boolean, true),
    COALESCE((v_preferences->>'shipping_emails')::boolean, true),
    COALESCE((v_preferences->>'payment_emails')::boolean, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET welcome_emails = COALESCE((v_preferences->>'welcome_emails')::boolean, notification_preferences.welcome_emails),
        reminder_emails = COALESCE((v_preferences->>'reminder_emails')::boolean, notification_preferences.reminder_emails),
        revelation_emails = COALESCE((v_preferences->>'revelation_emails')::boolean, notification_preferences.revelation_emails),
        shipping_emails = COALESCE((v_preferences->>'shipping_emails')::boolean, notification_preferences.shipping_emails),
        payment_emails = COALESCE((v_preferences->>'payment_emails')::boolean, notification_preferences.payment_emails),
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_notification_preferences(p_preferences jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_default jsonb := jsonb_build_object(
    'production_stage_updates', true,
    'item_shipped', true,
    'item_delivered', true,
    'marketing_emails', true
  );
  v_preferences jsonb := public.validate_customer_notification_preferences(p_preferences);
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.profiles
  SET notification_preferences = v_default || COALESCE(notification_preferences, '{}'::jsonb) || v_preferences,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING notification_preferences INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'medium',
  p_action_url text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_related_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_type text := public.admin_validate_collection_text(p_type, 'Type', 80, true);
  v_title text := public.admin_validate_collection_text(p_title, 'Title', 160, true);
  v_message text := public.admin_validate_collection_text(p_message, 'Message', 1000, false);
  v_priority text := COALESCE(NULLIF(btrim(p_priority), ''), 'medium');
  v_related_type text := public.admin_validate_collection_text(p_related_type, 'Related type', 80, false);
  v_action_url text := NULLIF(btrim(COALESCE(p_action_url, '')), '');
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  PERFORM public.assert_admin_access();

  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid notification priority' USING ERRCODE = '22023';
  END IF;

  IF v_action_url IS NOT NULL AND v_action_url !~ '^/[A-Za-z0-9/_?=&.#%-]*$' THEN
    RAISE EXCEPTION 'Invalid notification action URL' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'Notification metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    priority,
    action_url,
    related_id,
    related_type,
    metadata
  )
  VALUES (
    p_user_id,
    v_type,
    v_title,
    v_message,
    v_priority,
    v_action_url,
    p_related_id,
    v_related_type,
    v_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.like_catalog_model(p_model_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.models WHERE id = p_model_id) THEN
    RAISE EXCEPTION 'Model not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.model_likes (user_id, model_id)
  VALUES (v_user_id, p_model_id)
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.model_likes
    WHERE user_id = v_user_id
      AND model_id = p_model_id;
  END IF;

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_id
    FROM public.model_likes
    WHERE user_id = v_user_id
      AND model_id = p_model_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlike_catalog_model(p_model_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.model_likes
  WHERE user_id = v_user_id
    AND model_id = p_model_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Model like not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wishlist_item(
  p_item_id uuid,
  p_notes text,
  p_priority integer,
  p_notify_when_available boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_notes text := public.admin_validate_collection_text(p_notes, 'Notes', 1000, false);
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_priority < 0 OR p_priority > 5 THEN
    RAISE EXCEPTION 'Invalid wishlist priority' USING ERRCODE = '22023';
  END IF;

  UPDATE public.wishlist
  SET notes = v_notes,
      priority = p_priority,
      notify_when_available = COALESCE(p_notify_when_available, false)
  WHERE id = p_item_id
    AND user_id = v_user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Wishlist item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_wishlist_item(p_item_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.wishlist
  WHERE id = p_item_id
    AND user_id = v_user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Wishlist item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_email_notification_preferences(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_customer_notification_preferences(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_email_notification_preferences(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_customer_notification_preferences(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_user_notification(uuid, text, text, text, text, text, uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.like_catalog_model(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlike_catalog_model(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_wishlist_item(uuid, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_wishlist_item(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_email_notification_preferences(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_customer_notification_preferences(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid, text, text, text, text, text, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.like_catalog_model(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlike_catalog_model(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_wishlist_item(uuid, text, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_wishlist_item(uuid) TO authenticated, service_role;

GRANT SELECT ON TABLE public.notification_preferences TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notification_preferences FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_notifications FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.model_likes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.wishlist FROM anon, authenticated;

COMMENT ON FUNCTION public.upsert_email_notification_preferences(uuid, jsonb) IS
  'Validated upsert for email notification preferences, scoped to current user/admin/service role.';
COMMENT ON FUNCTION public.update_customer_notification_preferences(jsonb) IS
  'Validated current-user profile notification preferences update.';
COMMENT ON FUNCTION public.create_user_notification(uuid, text, text, text, text, text, uuid, text, jsonb) IS
  'Admin-only validated user notification creation.';
COMMENT ON FUNCTION public.like_catalog_model(uuid) IS
  'Current-user catalog model like mutation.';
COMMENT ON FUNCTION public.unlike_catalog_model(uuid) IS
  'Current-user catalog model unlike mutation.';
COMMENT ON FUNCTION public.update_wishlist_item(uuid, text, integer, boolean) IS
  'Current-user wishlist item update.';
COMMENT ON FUNCTION public.delete_wishlist_item(uuid) IS
  'Current-user wishlist item deletion.';

NOTIFY pgrst, 'reload schema';
