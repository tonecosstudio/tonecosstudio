-- Harden Stripe RLS policies before production.
-- Previous policies allowed any authenticated user to read all Stripe payment,
-- subscription and refund records. These policies scope reads to the owning
-- Stripe customer, while admins keep operational visibility.

DROP POLICY IF EXISTS "Authenticated users can view payment intents" ON stripe_payment_intents;
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can view refunds" ON stripe_refunds;
DROP POLICY IF EXISTS "Only admins can view webhook events" ON stripe_webhook_events;

CREATE POLICY "Users can view own payment intents"
  ON stripe_payment_intents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM stripe_customers sc
      WHERE sc.stripe_customer_id = stripe_payment_intents.customer_id
        AND sc.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can view own subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM stripe_customers sc
      WHERE sc.stripe_customer_id = stripe_subscriptions.customer_id
        AND sc.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can view own refunds"
  ON stripe_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM stripe_payment_intents spi
      JOIN stripe_customers sc
        ON sc.stripe_customer_id = spi.customer_id
      WHERE spi.stripe_payment_intent_id = stripe_refunds.payment_intent_id
        AND sc.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Only admins can view webhook events"
  ON stripe_webhook_events FOR SELECT
  USING (public.is_admin());
