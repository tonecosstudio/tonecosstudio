BEGIN;

ALTER POLICY "Admins can view all security incidents"
  ON public.security_incidents
  USING (public.has_role(auth.uid(), 'admin'));

ALTER POLICY "Users can view own payment intents"
  ON public.stripe_payment_intents
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_customers AS customer
      WHERE customer.stripe_customer_id = stripe_payment_intents.customer_id
        AND customer.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER POLICY "Users can view own refunds"
  ON public.stripe_refunds
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_payment_intents AS payment_intent
      JOIN public.stripe_customers AS customer
        ON customer.stripe_customer_id = payment_intent.customer_id
      WHERE payment_intent.stripe_payment_intent_id = stripe_refunds.payment_intent_id
        AND customer.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER POLICY "Users can view own subscriptions"
  ON public.stripe_subscriptions
  USING (
    EXISTS (
      SELECT 1
      FROM public.stripe_customers AS customer
      WHERE customer.stripe_customer_id = stripe_subscriptions.customer_id
        AND customer.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER POLICY "Only admins can view webhook events"
  ON public.stripe_webhook_events
  USING (public.has_role(auth.uid(), 'admin'));

DROP FUNCTION public.is_admin();

NOTIFY pgrst, 'reload schema';

COMMIT;
