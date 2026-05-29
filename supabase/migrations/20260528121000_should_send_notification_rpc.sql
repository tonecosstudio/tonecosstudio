-- Authoritative notification opt-out check.

CREATE OR REPLACE FUNCTION public.should_send_notification(
  user_id uuid,
  notification_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_preferences jsonb;
  v_preference_key text;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS DISTINCT FROM user_id
     AND auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to inspect notification preferences' USING ERRCODE = '42501';
  END IF;

  v_preference_key := CASE notification_type
    WHEN 'stage_update' THEN 'production_stage_updates'
    WHEN 'item_shipped' THEN 'item_shipped'
    WHEN 'item_delivered' THEN 'item_delivered'
    WHEN 'marketing' THEN 'marketing_emails'
    ELSE NULL
  END;

  IF v_preference_key IS NULL THEN
    RETURN true;
  END IF;

  SELECT COALESCE(
           notification_preferences,
           jsonb_build_object(
             'production_stage_updates', true,
             'item_shipped', true,
             'item_delivered', true,
             'marketing_emails', true
           )
         )
    INTO v_preferences
    FROM public.profiles
   WHERE id = user_id;

  IF v_preferences IS NULL THEN
    RETURN true;
  END IF;

  RETURN COALESCE((v_preferences->>v_preference_key)::boolean, true);
END;
$$;

REVOKE ALL ON FUNCTION public.should_send_notification(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.should_send_notification(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.should_send_notification(uuid, text) IS
  'Authoritative server-side opt-out check for non-critical customer notifications.';

NOTIFY pgrst, 'reload schema';
