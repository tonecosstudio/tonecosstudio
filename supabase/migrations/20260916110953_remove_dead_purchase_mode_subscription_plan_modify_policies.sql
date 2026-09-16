-- Browser roles already have SELECT-only grants on these configuration tables.
-- Admin mutations are routed through service-role-backed admin RPCs, so the
-- legacy FOR ALL policies only duplicate SELECT evaluation and add RLS cost.

DROP POLICY IF EXISTS purchase_modes_modify_admin
  ON public.purchase_modes;

DROP POLICY IF EXISTS subscription_plans_modify_admin
  ON public.subscription_plans;
