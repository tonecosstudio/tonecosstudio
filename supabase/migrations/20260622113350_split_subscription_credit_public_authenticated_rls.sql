-- Split public catalog reads from authenticated reads for subscription-credit tables.
-- This preserves the existing visibility rules while making each access boundary explicit.

DROP POLICY IF EXISTS "subscription_credit_plans_select_safe"
  ON public.subscription_credit_plans;
DROP POLICY IF EXISTS "subscription_credit_characters_select_safe"
  ON public.subscription_credit_characters;
DROP POLICY IF EXISTS "subscription_credit_cycles_select_safe"
  ON public.subscription_credit_production_cycles;

CREATE POLICY "subscription_credit_plans_select_public_active"
  ON public.subscription_credit_plans
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "subscription_credit_plans_select_authenticated"
  ON public.subscription_credit_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "subscription_credit_characters_select_public_active"
  ON public.subscription_credit_characters
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "subscription_credit_characters_select_authenticated"
  ON public.subscription_credit_characters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "subscription_credit_cycles_select_public_available"
  ON public.subscription_credit_production_cycles
  FOR SELECT
  TO anon
  USING (status IN ('open', 'full'));

CREATE POLICY "subscription_credit_cycles_select_authenticated"
  ON public.subscription_credit_production_cycles
  FOR SELECT
  TO authenticated
  USING (true);
