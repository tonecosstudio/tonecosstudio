BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_production_limit()
RETURNS TABLE(
  prod_month integer,
  prod_year integer,
  prod_global_limit integer,
  prod_units_sold integer,
  prod_available integer,
  prod_is_closed boolean,
  prod_percentage_sold numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH current_period AS (
    SELECT
      EXTRACT(MONTH FROM CURRENT_DATE)::integer AS month,
      EXTRACT(YEAR FROM CURRENT_DATE)::integer AS year
  ),
  configured_limit AS (
    SELECT COALESCE(
      (
        SELECT value::integer
        FROM public.system_settings
        WHERE key = 'monthly_production_limit'
      ),
      100
    ) AS value
  )
  SELECT
    period.month,
    period.year,
    COALESCE(production.global_limit, configured.value),
    COALESCE(production.units_sold, 0),
    GREATEST(
      COALESCE(production.global_limit, configured.value)
        - COALESCE(production.units_sold, 0),
      0
    ),
    COALESCE(production.is_closed, false),
    CASE
      WHEN COALESCE(production.global_limit, configured.value) > 0 THEN
        ROUND(
          COALESCE(production.units_sold, 0)::numeric
            / COALESCE(production.global_limit, configured.value)::numeric
            * 100,
          2
        )
      ELSE 0::numeric
    END
  FROM current_period AS period
  CROSS JOIN configured_limit AS configured
  LEFT JOIN public.monthly_production AS production
    ON production.month = period.month
   AND production.year = period.year;
$function$;

COMMENT ON FUNCTION public.get_current_production_limit() IS
  'Returns the current monthly production capacity without mutating production state.';

NOTIFY pgrst, 'reload schema';

COMMIT;
