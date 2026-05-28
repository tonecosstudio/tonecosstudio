-- Admin quick replies and notification settings RPCs.

CREATE OR REPLACE FUNCTION public.admin_validate_plain_text(
  p_value text,
  p_label text,
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
      RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_quick_reply(
  p_id uuid,
  p_category text,
  p_title text,
  p_message text,
  p_display_order integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_category text := public.admin_validate_plain_text(p_category, 'quick reply category', 80);
  v_title text := public.admin_validate_plain_text(p_title, 'quick reply title', 160);
  v_message text := public.admin_validate_plain_text(p_message, 'quick reply message', 4000);
  v_display_order integer := COALESCE(p_display_order, 0);
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_display_order < 0 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'Invalid quick reply order' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quick_replies (category, title, message, display_order, updated_at)
    VALUES (v_category, v_title, v_message, v_display_order, now())
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.quick_replies
    SET category = v_category,
        title = v_title,
        message = v_message,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quick reply not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_quick_reply(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.quick_replies
  WHERE id = p_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quick reply not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_quick_reply_active(
  p_id uuid,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.quick_replies
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quick reply not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_quick_replies(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_display_order integer;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'Quick reply order payload must be an array' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates)
  LOOP
    v_id := (v_item->>'id')::uuid;
    v_display_order := (v_item->>'display_order')::integer;

    IF v_display_order < 0 OR v_display_order > 10000 THEN
      RAISE EXCEPTION 'Invalid quick reply order' USING ERRCODE = '22023';
    END IF;

    UPDATE public.quick_replies
    SET display_order = v_display_order,
        updated_at = now()
    WHERE id = v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quick reply not found' USING ERRCODE = 'P0002';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_notification(p_notification_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.admin_notifications
  WHERE id = p_notification_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_or_create_notification_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.admin_notification_settings%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_row
    FROM public.admin_notification_settings
   WHERE user_id = v_user_id;

  IF v_row.user_id IS NULL THEN
    INSERT INTO public.admin_notification_settings (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_notification_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value text;
  v_allowed boolean;
  v_row public.admin_notification_settings%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Notification settings payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each_text(p_updates)
  LOOP
    v_allowed := v_key IN (
      'new_quote_enabled',
      'payment_received_enabled',
      'support_ticket_enabled',
      'subscription_canceled_enabled',
      'low_stock_enabled',
      'system_error_enabled',
      'new_user_enabled',
      'preorder_completed_enabled',
      'production_ready_enabled',
      'message_received_enabled',
      'sound_enabled',
      'email_enabled',
      'push_enabled'
    );

    IF v_allowed AND v_value NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'Invalid boolean setting' USING ERRCODE = '22023';
    END IF;

    IF NOT v_allowed AND v_key = 'sound_volume' THEN
      IF v_value !~ '^[0-9]+(\.[0-9]+)?$' OR v_value::numeric < 0 OR v_value::numeric > 1 THEN
        RAISE EXCEPTION 'Invalid sound volume' USING ERRCODE = '22023';
      END IF;
      v_allowed := true;
    END IF;

    IF NOT v_allowed AND v_key = 'email_frequency' THEN
      IF v_value NOT IN ('instant', 'daily', 'weekly', 'never') THEN
        RAISE EXCEPTION 'Invalid email frequency' USING ERRCODE = '22023';
      END IF;
      v_allowed := true;
    END IF;

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Unsupported notification setting: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  INSERT INTO public.admin_notification_settings (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.admin_notification_settings
  SET
    new_quote_enabled = COALESCE((p_updates->>'new_quote_enabled')::boolean, new_quote_enabled),
    payment_received_enabled = COALESCE((p_updates->>'payment_received_enabled')::boolean, payment_received_enabled),
    support_ticket_enabled = COALESCE((p_updates->>'support_ticket_enabled')::boolean, support_ticket_enabled),
    subscription_canceled_enabled = COALESCE((p_updates->>'subscription_canceled_enabled')::boolean, subscription_canceled_enabled),
    low_stock_enabled = COALESCE((p_updates->>'low_stock_enabled')::boolean, low_stock_enabled),
    system_error_enabled = COALESCE((p_updates->>'system_error_enabled')::boolean, system_error_enabled),
    new_user_enabled = COALESCE((p_updates->>'new_user_enabled')::boolean, new_user_enabled),
    preorder_completed_enabled = COALESCE((p_updates->>'preorder_completed_enabled')::boolean, preorder_completed_enabled),
    production_ready_enabled = COALESCE((p_updates->>'production_ready_enabled')::boolean, production_ready_enabled),
    message_received_enabled = COALESCE((p_updates->>'message_received_enabled')::boolean, message_received_enabled),
    sound_enabled = COALESCE((p_updates->>'sound_enabled')::boolean, sound_enabled),
    email_enabled = COALESCE((p_updates->>'email_enabled')::boolean, email_enabled),
    push_enabled = COALESCE((p_updates->>'push_enabled')::boolean, push_enabled),
    sound_volume = COALESCE((p_updates->>'sound_volume')::numeric, sound_volume),
    email_frequency = COALESCE(p_updates->>'email_frequency', email_frequency),
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_plain_text(text, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_quick_reply(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_quick_reply_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reorder_quick_replies(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_notification(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_or_create_notification_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_notification_settings(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_quick_reply(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_quick_reply_active(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_quick_replies(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_notification(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_notification_settings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_notification_settings(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, integer) IS
  'Admin-only validated quick reply create/update.';
COMMENT ON FUNCTION public.admin_delete_quick_reply(uuid) IS
  'Admin-only quick reply deletion.';
COMMENT ON FUNCTION public.admin_set_quick_reply_active(uuid, boolean) IS
  'Admin-only quick reply active flag update.';
COMMENT ON FUNCTION public.admin_reorder_quick_replies(jsonb) IS
  'Admin-only atomic quick reply reorder.';
COMMENT ON FUNCTION public.admin_delete_notification(uuid) IS
  'Admin-only admin notification deletion.';
COMMENT ON FUNCTION public.admin_get_or_create_notification_settings() IS
  'Admin-only notification settings fetch/create for current admin.';
COMMENT ON FUNCTION public.admin_update_notification_settings(jsonb) IS
  'Admin-only validated notification settings update for current admin.';

NOTIFY pgrst, 'reload schema';
