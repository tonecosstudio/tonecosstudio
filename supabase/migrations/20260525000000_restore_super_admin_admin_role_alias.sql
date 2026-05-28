-- Keep admin access checks aligned across RLS, RPCs, Edge Functions, and UI guards.
-- A super_admin must satisfy admin checks everywhere, while explicit super_admin
-- checks remain restricted to that role only.
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
      AND (
        role = _role::public.user_role
        OR (_role = 'admin' AND role = 'super_admin')
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS
  'Checks a user role. admin checks include super_admin; super_admin checks require super_admin.';

DROP POLICY IF EXISTS "Admins can view all security incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "System can insert security incidents" ON public.security_incidents;

GRANT SELECT, INSERT ON TABLE public.security_incidents TO authenticated;

CREATE POLICY "Admins can view all security incidents"
  ON public.security_incidents
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can report own security incidents"
  ON public.security_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER VIEW public.user_roles SET (security_invoker = true);
REVOKE ALL ON TABLE public.user_roles FROM anon;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

ALTER VIEW public.notifications SET (security_invoker = true);
REVOKE ALL ON TABLE public.notifications FROM anon;
GRANT SELECT ON TABLE public.notifications TO authenticated;

CREATE OR REPLACE VIEW public.collections_financial_summary AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.description,
  c.image_url,
  c.is_active,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT cc.id) AS total_characters,
  COUNT(DISTINCT CASE WHEN cc.is_catalog THEN cc.id END) AS catalog_characters,
  COUNT(DISTINCT s.id) AS total_subscriptions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_subscriptions,
  COALESCE(SUM(CASE WHEN s.status = 'active' THEN sp.price END), 0) AS subscription_revenue,
  COUNT(DISTINCT sp_purchases.id) AS total_standalone_purchases,
  COALESCE(SUM(sp_purchases.amount), 0) AS standalone_revenue,
  COUNT(DISTINCT mp.id) AS total_manual_payments,
  COALESCE(SUM(CASE WHEN mp.status IN ('paid', 'approved') THEN mp.amount END), 0) AS manual_payments_revenue,
  COUNT(DISTINCT q.id) AS total_quotes,
  COUNT(DISTINCT CASE WHEN q.status = 'approved' THEN q.id END) AS approved_quotes,
  COALESCE(SUM(CASE WHEN q.status = 'approved' THEN q.total_amount END), 0) AS quotes_revenue,
  COALESCE(SUM(CASE WHEN s.status = 'active' THEN sp.price END), 0) +
  COALESCE(SUM(sp_purchases.amount), 0) +
  COALESCE(SUM(CASE WHEN mp.status IN ('paid', 'approved') THEN mp.amount END), 0) +
  COALESCE(SUM(CASE WHEN q.status = 'approved' THEN q.total_amount END), 0) AS total_revenue
FROM public.collections c
LEFT JOIN public.collection_characters cc ON c.id = cc.collection_id
LEFT JOIN public.subscriptions s ON c.id = s.collection_id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN public.standalone_purchases sp_purchases ON c.id = sp_purchases.collection_id
LEFT JOIN public.manual_payments mp ON (
  mp.subscription_id = s.id OR
  mp.quote_id IN (SELECT id FROM public.quotes WHERE id = mp.quote_id)
)
LEFT JOIN public.quotes q ON q.id = mp.quote_id
WHERE public.current_user_role() IN ('admin', 'super_admin')
GROUP BY
  c.id,
  c.name,
  c.slug,
  c.description,
  c.image_url,
  c.is_active,
  c.created_at,
  c.updated_at
ORDER BY c.name ASC;

ALTER VIEW public.collections_financial_summary SET (security_invoker = true);
REVOKE ALL ON TABLE public.collections_financial_summary FROM anon;
GRANT SELECT ON TABLE public.collections_financial_summary TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.order_migrations') IS NOT NULL THEN
    ALTER TABLE public.order_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.order_migrations FROM anon;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.order_migrations TO authenticated;

    DROP POLICY IF EXISTS "order_migrations_select_own_or_admin" ON public.order_migrations;
    DROP POLICY IF EXISTS "order_migrations_insert_own" ON public.order_migrations;
    DROP POLICY IF EXISTS "order_migrations_update_admin" ON public.order_migrations;

    CREATE POLICY "order_migrations_select_own_or_admin"
      ON public.order_migrations
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR public.current_user_role() IN ('admin', 'super_admin')
      );

    CREATE POLICY "order_migrations_insert_own"
      ON public.order_migrations
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "order_migrations_update_admin"
      ON public.order_migrations
      FOR UPDATE
      TO authenticated
      USING (public.current_user_role() IN ('admin', 'super_admin'))
      WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mark_user_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.user_notifications
  SET is_read = true
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
  SET is_read = true
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

CREATE OR REPLACE FUNCTION public.delete_user_notification(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.user_notifications
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.mark_user_notification_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_user_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_as_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_notification(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_user_notification_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_user_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_notification(UUID) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regclass('public.production_stages') IS NOT NULL THEN
    ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.production_stages FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.production_stages TO authenticated;

    DROP POLICY IF EXISTS "production_stages_select_own_or_admin" ON public.production_stages;
    DROP POLICY IF EXISTS "production_stages_manage_admin" ON public.production_stages;

    CREATE POLICY "production_stages_select_own_or_admin"
      ON public.production_stages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.production_queue pq
          WHERE pq.id = production_stages.production_queue_id
            AND (
              pq.user_id = auth.uid()
              OR public.current_user_role() IN ('admin', 'super_admin')
            )
        )
      );

    CREATE POLICY "production_stages_manage_admin"
      ON public.production_stages
      FOR ALL
      TO authenticated
      USING (public.current_user_role() IN ('admin', 'super_admin'))
      WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));
  END IF;
END $$;
