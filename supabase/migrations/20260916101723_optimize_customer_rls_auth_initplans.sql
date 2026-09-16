-- Preserve customer-facing RLS semantics while evaluating auth.uid() once per statement.

DROP POLICY IF EXISTS "Users can create own choices" ON public.character_choices;
CREATE POLICY "Users can create own choices"
  ON public.character_choices FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own choices" ON public.character_choices;
CREATE POLICY "Users can view own choices"
  ON public.character_choices FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own pending choices" ON public.character_choices;
CREATE POLICY "Users can update own pending choices"
  ON public.character_choices FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = user_id) AND (status = 'pending'::choice_status))
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.coin_transactions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own coins" ON public.user_coins;
CREATE POLICY "Users can view own coins"
  ON public.user_coins FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS wishlist_delete_own ON public.wishlist;
CREATE POLICY wishlist_delete_own
  ON public.wishlist FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS wishlist_insert_own ON public.wishlist;
CREATE POLICY wishlist_insert_own
  ON public.wishlist FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS wishlist_select_own ON public.wishlist;
CREATE POLICY wishlist_select_own
  ON public.wishlist FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS wishlist_update_own ON public.wishlist;
CREATE POLICY wishlist_update_own
  ON public.wishlist FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own stripe customer data" ON public.stripe_customers;
CREATE POLICY "Users can view their own stripe customer data"
  ON public.stripe_customers FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own payment intents" ON public.stripe_payment_intents;
CREATE POLICY "Users can view own payment intents"
  ON public.stripe_payment_intents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_customers customer
      WHERE customer.stripe_customer_id = stripe_payment_intents.customer_id
        AND customer.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.stripe_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.stripe_subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_customers customer
      WHERE customer.stripe_customer_id = stripe_subscriptions.customer_id
        AND customer.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

DROP POLICY IF EXISTS "Users can view own refunds" ON public.stripe_refunds;
CREATE POLICY "Users can view own refunds"
  ON public.stripe_refunds FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_payment_intents payment_intent
      JOIN public.stripe_customers customer
        ON customer.stripe_customer_id = payment_intent.customer_id
      WHERE payment_intent.stripe_payment_intent_id = stripe_refunds.payment_intent_id
        AND customer.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );
