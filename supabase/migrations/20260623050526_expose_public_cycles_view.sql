-- Public cycle status is needed for purchase availability checks, but the
-- internal cycles table contains alert contacts and operational metadata.

CREATE OR REPLACE VIEW public.public_cycles
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  year,
  month,
  cycle_number,
  status,
  sales_start_date,
  sales_end_date,
  open_start,
  open_end,
  cutoff_date,
  reveal_date,
  shipping_date,
  capacity,
  used_capacity,
  capacity_current,
  capacity_max
FROM public.cycles;

REVOKE ALL ON public.public_cycles FROM PUBLIC;
GRANT SELECT ON public.public_cycles TO anon, authenticated;

REVOKE SELECT ON public.cycles FROM anon;

GRANT SELECT (
  id,
  year,
  month,
  cycle_number,
  status,
  sales_start_date,
  sales_end_date,
  open_start,
  open_end,
  cutoff_date,
  reveal_date,
  shipping_date,
  capacity,
  used_capacity,
  capacity_current,
  capacity_max
) ON public.cycles TO anon;
