-- Close legacy privilege escalation paths and restrict public reads of sensitive tables.

DROP FUNCTION IF EXISTS public.promote_to_super_admin(TEXT);

CREATE OR REPLACE FUNCTION public.prevent_unsafe_profile_role_change()
RETURNS TRIGGER AS $$
DECLARE
  remaining_admin_count integer;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.role IN ('admin', 'super_admin') AND NEW.role NOT IN ('admin', 'super_admin') THEN
      SELECT count(*)
      INTO remaining_admin_count
      FROM public.profiles
      WHERE id <> OLD.id
        AND role IN ('admin', 'super_admin');

      IF remaining_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last admin';
      END IF;
    END IF;

    IF auth.uid() IS NULL THEN
      IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Authenticated admin required to change profile roles';
    END IF;

    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change profile roles';
    END IF;

    IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
      AND public.current_user_role() <> 'super_admin' THEN
      RAISE EXCEPTION 'Only super admins can change a super admin role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Cannot inspect another user role';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.update_profile_stats(
  profile_id UUID,
  new_pieces_owned INTEGER DEFAULT NULL,
  new_total_spent DECIMAL(10,2) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only trusted backends or admins can update profile stats';
  END IF;

  UPDATE public.profiles
  SET
    pieces_owned = COALESCE(new_pieces_owned, pieces_owned),
    total_spent = COALESCE(new_total_spent, total_spent),
    collector_level = CASE
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 50 THEN 5
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 30 THEN 4
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 15 THEN 3
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 5 THEN 2
      ELSE 1
    END,
    updated_at = NOW()
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  IF profile_id IS DISTINCT FROM auth.uid()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Cannot calculate another user profile completion';
  END IF;

  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = profile_id;

  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;

  completion := completion + 20;

  IF profile_record.full_name IS NOT NULL AND profile_record.full_name <> '' THEN
    completion := completion + 20;
  END IF;

  IF profile_record.display_name IS NOT NULL AND profile_record.display_name <> '' THEN
    completion := completion + 20;
  END IF;

  IF profile_record.pieces_owned > 0 THEN
    completion := completion + 20;
  END IF;

  IF profile_record.total_spent > 0 THEN
    completion := completion + 20;
  END IF;

  UPDATE public.profiles
  SET profile_completion = completion
  WHERE id = profile_id;

  RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
  v_is_trusted BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
  v_is_admin BOOLEAN := public.current_user_role() IN ('admin', 'super_admin');
BEGIN
  IF NOT public.is_safe_in_app_path(v_action_url) THEN
    RAISE EXCEPTION 'Unsafe notification action URL';
  END IF;

  IF char_length(COALESCE(p_title, '')) > 160
    OR char_length(COALESCE(p_message, '')) > 2000 THEN
    RAISE EXCEPTION 'Notification content is too long';
  END IF;

  IF COALESCE(p_priority, '') NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid notification priority';
  END IF;

  IF NOT v_is_trusted AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create admin notifications';
  END IF;

  IF NOT v_is_trusted AND NOT v_is_admin THEN
    IF p_recipient_user_id IS NOT NULL
      OR COALESCE(p_type, '') NOT IN ('payment_created', 'payment_under_review')
      OR p_related_type IS DISTINCT FROM 'payment'
      OR p_related_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.manual_payments mp
        WHERE mp.id = p_related_id
          AND mp.user_id = auth.uid()
      ) THEN
      RAISE EXCEPTION 'Only admins can create this notification';
    END IF;
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

CREATE OR REPLACE FUNCTION public.increment_monthly_sales(quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_limit_value INTEGER;
  v_current_sold INTEGER;
  v_is_closed BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only trusted backends or admins can increment monthly sales';
  END IF;

  IF quantity IS NULL OR quantity < 1 OR quantity > 1000 THEN
    RAISE EXCEPTION 'Invalid monthly sales quantity';
  END IF;

  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  SELECT value::INTEGER INTO v_limit_value
  FROM public.system_settings
  WHERE key = 'monthly_production_limit';

  v_limit_value := COALESCE(v_limit_value, 100);

  INSERT INTO public.monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_limit_value)
  ON CONFLICT (month, year) DO NOTHING;

  SELECT is_closed, units_sold INTO v_is_closed, v_current_sold
  FROM public.monthly_production
  WHERE month = v_current_month
    AND year = v_current_year;

  IF v_is_closed THEN
    RAISE EXCEPTION 'Current month sales are closed';
  END IF;

  IF v_current_sold + quantity > v_limit_value THEN
    RAISE EXCEPTION 'Monthly production limit reached';
  END IF;

  UPDATE public.monthly_production
  SET units_sold = units_sold + quantity,
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;

  IF v_current_sold + quantity >= v_limit_value THEN
    UPDATE public.monthly_production
    SET is_closed = true,
        closed_reason = 'automatic',
        closed_at = NOW(),
        updated_at = NOW()
    WHERE month = v_current_month
      AND year = v_current_year;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_monthly_sales(reason TEXT DEFAULT 'manual')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can close monthly sales';
  END IF;

  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  UPDATE public.monthly_production
  SET is_closed = true,
      closed_reason = left(COALESCE(NULLIF(btrim(reason), ''), 'manual'), 100),
      closed_at = NOW(),
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_monthly_sales()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can reopen monthly sales';
  END IF;

  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  UPDATE public.monthly_production
  SET is_closed = false,
      closed_reason = NULL,
      closed_at = NULL,
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_model_likes_count(model_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.model_likes
  WHERE model_id = model_uuid;
$$;

REVOKE ALL ON TABLE public.admin_payment_methods FROM anon;
GRANT SELECT ON TABLE public.admin_payment_methods TO authenticated;

DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.admin_payment_methods;
CREATE POLICY "Authenticated users can view active payment methods"
  ON public.admin_payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

REVOKE ALL ON TABLE public.model_likes FROM anon;
REVOKE UPDATE ON TABLE public.model_likes FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.model_likes TO authenticated;

DROP POLICY IF EXISTS "model_likes_select_all" ON public.model_likes;
CREATE POLICY "model_likes_select_own_or_admin"
  ON public.model_likes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('admin', 'super_admin')
  );

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_profile_stats(UUID, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_unsafe_profile_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_monthly_sales(INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_monthly_sales(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reopen_monthly_sales() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_profile_stats(UUID, INTEGER, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_monthly_sales(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_monthly_sales(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_monthly_sales() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_model_likes_count(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID) IS
  'Creates admin notifications with auth, action URL validation, content limits, and payment ownership checks.';
