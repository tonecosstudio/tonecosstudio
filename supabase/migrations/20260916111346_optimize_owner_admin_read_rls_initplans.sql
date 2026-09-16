-- Initialize auth context once per statement for owner/admin SELECT policies.
-- Access semantics remain unchanged.

DROP POLICY IF EXISTS user_characters_select_owner_admin ON public.user_characters;
CREATE POLICY user_characters_select_owner_admin ON public.user_characters
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS user_collections_select_owner_admin ON public.user_collections;
CREATE POLICY user_collections_select_owner_admin ON public.user_collections
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS subscription_collections_select_own_or_admin ON public.subscription_collections;
CREATE POLICY subscription_collections_select_own_or_admin ON public.subscription_collections
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions subscription
      WHERE subscription.id = subscription_collections.subscription_id
        AND subscription.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS public_collection_select_owner_admin ON public.public_collection;
CREATE POLICY public_collection_select_owner_admin ON public.public_collection
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
    )
  );

DROP POLICY IF EXISTS order_status_history_select_admin ON public.order_status_history;
CREATE POLICY order_status_history_select_admin ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS payment_verification_audit_logs_select_admin ON public.payment_verification_audit_logs;
CREATE POLICY payment_verification_audit_logs_select_admin ON public.payment_verification_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );

DROP POLICY IF EXISTS chat_group_messages_select_member_or_admin ON public.chat_group_messages;
CREATE POLICY chat_group_messages_select_member_or_admin ON public.chat_group_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.chat_group_members member
      WHERE member.group_id = chat_group_messages.group_id
        AND member.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_group_attachments_select_member_or_admin ON public.chat_group_attachments;
CREATE POLICY chat_group_attachments_select_member_or_admin ON public.chat_group_attachments
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.chat_group_messages msg
      JOIN public.chat_group_members member ON member.group_id = msg.group_id
      WHERE msg.id = chat_group_attachments.message_id
        AND member.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS email_notifications_select_own_or_admin ON public.email_notifications;
CREATE POLICY email_notifications_select_own_or_admin ON public.email_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS email_delivery_logs_select_admin_or_own ON public.email_delivery_logs;
CREATE POLICY email_delivery_logs_select_admin_or_own ON public.email_delivery_logs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can view all security incidents" ON public.security_incidents;
CREATE POLICY "Admins can view all security incidents" ON public.security_incidents
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Only admins can view webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Only admins can view webhook events" ON public.stripe_webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));
