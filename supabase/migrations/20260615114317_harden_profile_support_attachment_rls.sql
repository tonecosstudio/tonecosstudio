-- Harden customer visibility for support attachments.
-- Customers can only read attachments from visible, non-internal messages in their own conversations.

DROP POLICY IF EXISTS "support_attachments_select_own" ON public.support_attachments;

CREATE POLICY "support_attachments_select_own"
  ON public.support_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.support_messages sm
        JOIN public.support_conversations sc ON sc.id = sm.conversation_id
       WHERE sm.id = support_attachments.message_id
         AND sc.user_id = auth.uid()
         AND sm.is_internal = false
         AND sm.deleted_at IS NULL
    )
  );

NOTIFY pgrst, 'reload schema';
