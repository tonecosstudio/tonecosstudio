-- Avoid evaluating auth context once per row on admin-only read policies.
-- Access semantics are unchanged; auth.uid()/auth.role() are initialized once
-- per statement through scalar SELECTs.

DROP POLICY IF EXISTS ai_name_cache_select_admin ON public.ai_name_cache;
CREATE POLICY ai_name_cache_select_admin ON public.ai_name_cache
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS ai_processing_jobs_select_admin ON public.ai_processing_jobs;
CREATE POLICY ai_processing_jobs_select_admin ON public.ai_processing_jobs
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS ai_vision_cache_select_admin ON public.ai_vision_cache;
CREATE POLICY ai_vision_cache_select_admin ON public.ai_vision_cache
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS conversation_reminders_select_admin ON public.conversation_reminders;
CREATE POLICY conversation_reminders_select_admin ON public.conversation_reminders
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS cron_job_logs_admin_select ON public.cron_job_logs;
CREATE POLICY cron_job_logs_admin_select ON public.cron_job_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS message_templates_select_admin ON public.message_templates;
CREATE POLICY message_templates_select_admin ON public.message_templates
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS purchase_mode_history_select_admin ON public.purchase_mode_history;
CREATE POLICY purchase_mode_history_select_admin ON public.purchase_mode_history
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR COALESCE((SELECT auth.role()), '') = 'service_role'
  );

DROP POLICY IF EXISTS quick_replies_select_admin ON public.quick_replies;
CREATE POLICY quick_replies_select_admin ON public.quick_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );

DROP POLICY IF EXISTS scheduled_messages_select_admin ON public.scheduled_messages;
CREATE POLICY scheduled_messages_select_admin ON public.scheduled_messages
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS security_events_select_admin ON public.security_events;
CREATE POLICY security_events_select_admin ON public.security_events
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS wishlist_select_admin ON public.wishlist;
CREATE POLICY wishlist_select_admin ON public.wishlist
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );
