-- Monthly production counters are operational data. Public availability should
-- be exposed through bounded RPCs, not through direct anonymous table reads.

REVOKE SELECT ON public.monthly_production FROM anon;

DROP POLICY IF EXISTS monthly_production_select_all
  ON public.monthly_production;

CREATE POLICY monthly_production_select_authenticated
  ON public.monthly_production
  FOR SELECT
  TO authenticated
  USING (true);
