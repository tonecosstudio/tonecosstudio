-- Support mutations and admin notification settings changes are routed through
-- authenticated RPC/Edge gateways. Keep only the browser reads required by UI.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_notification_settings FROM authenticated;
GRANT SELECT ON TABLE public.admin_notification_settings TO authenticated;

DROP POLICY IF EXISTS admin_notification_settings_insert_own ON public.admin_notification_settings;
DROP POLICY IF EXISTS admin_notification_settings_update_own ON public.admin_notification_settings;
DROP POLICY IF EXISTS admin_notification_settings_select_admin ON public.admin_notification_settings;
DROP POLICY IF EXISTS admin_notification_settings_select_own ON public.admin_notification_settings;
CREATE POLICY admin_notification_settings_select_access
  ON public.admin_notification_settings
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    )
  );

-- Direct browser writes are already revoked from support_messages. Remove dead
-- policies so a future accidental table grant cannot silently re-open DML.
DROP POLICY IF EXISTS support_messages_insert_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_delete_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_update_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_update_own ON public.support_messages;

DROP POLICY IF EXISTS support_messages_select_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;
CREATE POLICY support_messages_select_access
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
      )
      OR (
        COALESCE(is_internal, false) = false
        AND EXISTS (
          SELECT 1
          FROM public.support_conversations
          WHERE support_conversations.id = support_messages.conversation_id
            AND support_conversations.user_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS support_attachments_select_admin ON public.support_attachments;
DROP POLICY IF EXISTS support_attachments_select_own ON public.support_attachments;
CREATE POLICY support_attachments_select_access
  ON public.support_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
    OR EXISTS (
      SELECT 1
      FROM public.support_messages sm
      JOIN public.support_conversations sc ON sc.id = sm.conversation_id
      WHERE sm.id = support_attachments.message_id
        AND sc.user_id = (SELECT auth.uid())
        AND COALESCE(sm.is_internal, false) = false
    )
  );
