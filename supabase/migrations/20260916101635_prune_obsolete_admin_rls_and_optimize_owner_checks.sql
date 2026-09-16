-- Browser DML is already revoked for these admin-authoritative tables.
-- Remove legacy FOR ALL policies that now only duplicate SELECT policies.
DROP POLICY IF EXISTS chat_groups_modify_admin ON public.chat_groups;
DROP POLICY IF EXISTS monthly_production_modify_admin ON public.monthly_production;
DROP POLICY IF EXISTS subscription_deliveries_modify_admin ON public.subscription_deliveries;
DROP POLICY IF EXISTS support_conversations_modify_admin ON public.support_conversations;

-- Preserve owner semantics while evaluating auth.uid() once per statement.
DROP POLICY IF EXISTS "Users can view own production items" ON public.production_queue;
CREATE POLICY "Users can view own production items"
  ON public.production_queue
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS subscription_deliveries_select_own ON public.subscription_deliveries;
CREATE POLICY subscription_deliveries_select_own
  ON public.subscription_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.subscriptions
      WHERE subscriptions.id = subscription_deliveries.subscription_id
        AND subscriptions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS support_conversations_select_own ON public.support_conversations;
CREATE POLICY support_conversations_select_own
  ON public.support_conversations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS support_conversations_insert_own ON public.support_conversations;
CREATE POLICY support_conversations_insert_own
  ON public.support_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
