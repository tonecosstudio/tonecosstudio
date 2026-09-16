-- Initialize auth context once per statement for domain owner/admin read policies.
-- Access semantics remain unchanged.

DROP POLICY IF EXISTS subscription_credit_order_items_select_owner_admin ON public.subscription_credit_order_items;
CREATE POLICY subscription_credit_order_items_select_owner_admin ON public.subscription_credit_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.subscription_credit_orders sco
      WHERE sco.id = subscription_credit_order_items.order_id
        AND (
          sco.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS subscription_credit_subscriptions_select_owner_admin ON public.subscription_credit_subscriptions;
CREATE POLICY subscription_credit_subscriptions_select_owner_admin ON public.subscription_credit_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS subscription_credit_user_credits_select_owner_admin ON public.subscription_credit_user_credits;
CREATE POLICY subscription_credit_user_credits_select_owner_admin ON public.subscription_credit_user_credits
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS subscription_credit_transactions_select_owner_admin ON public.subscription_credit_transactions;
CREATE POLICY subscription_credit_transactions_select_owner_admin ON public.subscription_credit_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS subscription_credit_orders_select_owner_admin ON public.subscription_credit_orders;
CREATE POLICY subscription_credit_orders_select_owner_admin ON public.subscription_credit_orders
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS quotes_select_own ON public.quotes;
CREATE POLICY quotes_select_own ON public.quotes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS quote_payments_select_own_or_admin ON public.quote_payments;
CREATE POLICY quote_payments_select_own_or_admin ON public.quote_payments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_payments.quote_id
        AND q.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS production_stages_select_own_or_admin ON public.production_stages;
CREATE POLICY production_stages_select_own_or_admin ON public.production_stages
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = production_stages.production_queue_id
        AND pq.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS production_photo_metadata_select_visible ON public.production_photo_metadata;
CREATE POLICY production_photo_metadata_select_visible ON public.production_photo_metadata
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR (
      customer_visible = true
      AND EXISTS (
        SELECT 1
        FROM public.production_stages ps
        JOIN public.production_queue pq ON pq.id = ps.production_queue_id
        WHERE ps.id = production_photo_metadata.production_stage_id
          AND pq.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS stage_transition_logs_select_own_or_admin ON public.stage_transition_logs;
CREATE POLICY stage_transition_logs_select_own_or_admin ON public.stage_transition_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = stage_transition_logs.production_queue_id
        AND pq.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS production_assignment_logs_select_admin_or_assignee ON public.production_assignment_logs;
CREATE POLICY production_assignment_logs_select_admin_or_assignee ON public.production_assignment_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = production_assignment_logs.production_queue_id
        AND pq.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS payment_info_requests_select_admin_or_owner ON public.payment_info_requests;
CREATE POLICY payment_info_requests_select_admin_or_owner ON public.payment_info_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.manual_payments mp
      WHERE mp.id = payment_info_requests.payment_id
        AND mp.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS bonus_pieces_select_owner_admin ON public.bonus_pieces;
CREATE POLICY bonus_pieces_select_owner_admin ON public.bonus_pieces
  FOR SELECT TO authenticated
  USING (
    COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.id = bonus_pieces.subscription_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS collection_choice_history_select_owner_admin ON public.collection_choice_history;
CREATE POLICY collection_choice_history_select_owner_admin ON public.collection_choice_history
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR COALESCE((SELECT auth.role()), '') = 'service_role'
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
