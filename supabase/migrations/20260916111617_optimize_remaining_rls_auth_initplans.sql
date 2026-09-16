-- Eliminate the remaining per-row auth context evaluation in RLS policies.
-- Operations and authorization semantics are preserved; auth context is
-- initialized once per statement through scalar SELECTs.

DROP POLICY IF EXISTS quotes_insert_own ON public.quotes;
CREATE POLICY quotes_insert_own ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can report own security incidents" ON public.security_incidents;
CREATE POLICY "Users can report own security incidents" ON public.security_incidents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS payment_links_admin_manage ON public.payment_links;
CREATE POLICY payment_links_admin_manage ON public.payment_links
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS quote_payments_admin_manage ON public.quote_payments;
CREATE POLICY quote_payments_admin_manage ON public.quote_payments
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS production_photo_metadata_admin_manage ON public.production_photo_metadata;
CREATE POLICY production_photo_metadata_admin_manage ON public.production_photo_metadata
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS production_assignment_logs_admin_insert ON public.production_assignment_logs;
CREATE POLICY production_assignment_logs_admin_insert ON public.production_assignment_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS catalog_import_items_admin_all ON public.catalog_import_items;
CREATE POLICY catalog_import_items_admin_all ON public.catalog_import_items
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS catalog_import_batches_admin_all ON public.catalog_import_batches;
CREATE POLICY catalog_import_batches_admin_all ON public.catalog_import_batches
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS admin_notifications_delete_admin ON public.admin_notifications;
CREATE POLICY admin_notifications_delete_admin ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );

DROP POLICY IF EXISTS admin_notifications_insert_admin ON public.admin_notifications;
CREATE POLICY admin_notifications_insert_admin ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );

DROP POLICY IF EXISTS admin_notifications_select_own ON public.admin_notifications;
CREATE POLICY admin_notifications_select_own ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_user_id = (SELECT auth.uid())
    OR (
      recipient_user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
      )
    )
  );

DROP POLICY IF EXISTS admin_notifications_update_own ON public.admin_notifications;
CREATE POLICY admin_notifications_update_own ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = (SELECT auth.uid()))
  WITH CHECK (recipient_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bonus_pieces_mutate_admin_service ON public.bonus_pieces;
CREATE POLICY bonus_pieces_mutate_admin_service ON public.bonus_pieces
  FOR ALL TO authenticated
  USING (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS collection_choice_history_insert_service_admin ON public.collection_choice_history;
CREATE POLICY collection_choice_history_insert_service_admin ON public.collection_choice_history
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS payment_verification_audit_logs_insert_service ON public.payment_verification_audit_logs;
CREATE POLICY payment_verification_audit_logs_insert_service ON public.payment_verification_audit_logs
  FOR INSERT TO service_role
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS holidays_mutate_admin_service ON public.holidays;
CREATE POLICY holidays_mutate_admin_service ON public.holidays
  FOR ALL TO authenticated, service_role
  USING (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
