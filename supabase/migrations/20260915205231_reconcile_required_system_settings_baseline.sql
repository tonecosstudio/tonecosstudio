BEGIN;

INSERT INTO public.system_settings (key, value, updated_at)
VALUES
  ('default_price_full', '150.00', now()),
  ('default_price_pix', '142.50', now()),
  ('default_deposit_amount', '30', now()),
  ('pix_discount_percentage', '5', now()),
  ('max_installments_no_interest', '3', now()),
  ('max_installments_with_interest', '12', now()),
  ('monthly_production_limit', '50', now()),
  ('production_days_min', '15', now()),
  ('production_days_max', '20', now()),
  ('shipping_business_days', '5', now()),
  ('sales_duration_days', '30', now()),
  ('delivery_interval_days', '90', now()),
  ('character_choice_days', '7', now()),
  ('balance_payment_days', '5', now()),
  ('exchange_deadline_days', '7', now()),
  ('days_to_next_delivery', '90', now())
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  v_missing text[];
  v_full numeric;
  v_pix numeric;
  v_deposit numeric;
  v_prod_min integer;
  v_prod_max integer;
BEGIN
  SELECT array_agg(required.key ORDER BY required.key)
    INTO v_missing
    FROM (
      VALUES
        ('default_price_full'),
        ('default_price_pix'),
        ('default_deposit_amount'),
        ('pix_discount_percentage'),
        ('max_installments_no_interest'),
        ('max_installments_with_interest'),
        ('monthly_production_limit'),
        ('production_days_min'),
        ('production_days_max'),
        ('shipping_business_days'),
        ('sales_duration_days'),
        ('delivery_interval_days'),
        ('character_choice_days'),
        ('balance_payment_days'),
        ('exchange_deadline_days'),
        ('days_to_next_delivery')
    ) AS required(key)
    LEFT JOIN public.system_settings settings ON settings.key = required.key
   WHERE settings.key IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Required system settings still missing after reconciliation: %', array_to_string(v_missing, ', ');
  END IF;

  SELECT value::numeric
    INTO v_full
    FROM public.system_settings
   WHERE key = 'default_price_full'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_pix
    FROM public.system_settings
   WHERE key = 'default_price_pix'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_deposit
    FROM public.system_settings
   WHERE key = 'default_deposit_amount'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::integer
    INTO v_prod_min
    FROM public.system_settings
   WHERE key = 'production_days_min'
     AND value ~ '^[0-9]+$';

  SELECT value::integer
    INTO v_prod_max
    FROM public.system_settings
   WHERE key = 'production_days_max'
     AND value ~ '^[0-9]+$';

  IF v_full IS NULL OR v_full <= 0 THEN
    RAISE EXCEPTION 'Invalid default_price_full';
  END IF;

  IF v_pix IS NULL OR v_pix <= 0 OR v_pix > v_full THEN
    RAISE EXCEPTION 'Invalid default_price_pix';
  END IF;

  IF v_deposit IS NULL OR v_deposit < 0 OR v_deposit > LEAST(v_full, v_pix) THEN
    RAISE EXCEPTION 'Invalid default_deposit_amount';
  END IF;

  IF v_prod_min IS NULL OR v_prod_max IS NULL OR v_prod_min < 1 OR v_prod_max < v_prod_min THEN
    RAISE EXCEPTION 'Invalid production day range';
  END IF;
END
$$;

COMMIT;
