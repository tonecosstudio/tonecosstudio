-- Reconcile the pricing tier contract used by the product with the live table.
-- price_full is the BRL SSOT; price_brl mirrors it for legacy compatibility.
-- price_coins is derived from the active coin exchange rate.

ALTER TABLE public.pricing_tiers
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_pricing_tiers_single_default
  ON public.pricing_tiers ((is_default))
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.admin_save_pricing_tier_plan(
  p_tier_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'name', 'display_name', 'price_coins', 'price_brl', 'price_full',
    'price_pix', 'deposit_amount', 'pix_discount_percentage', 'is_active',
    'is_default', 'description', 'base_price', 'display_order'
  ];
  v_key text;
  v_current public.pricing_tiers%ROWTYPE;
  v_result_id uuid;
  v_name text;
  v_display_name text;
  v_description text;
  v_price_full numeric;
  v_price_pix numeric;
  v_price_brl numeric;
  v_price_coins integer;
  v_deposit numeric;
  v_discount numeric;
  v_is_active boolean;
  v_is_default boolean;
  v_display_order integer;
  v_coins_per_real numeric;
  v_expected_coins integer;
  v_has_price_change boolean := false;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Pricing tier payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data)
  LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported pricing tier field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_tier_id IS NOT NULL THEN
    SELECT * INTO v_current
    FROM public.pricing_tiers
    WHERE id = p_tier_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  v_name := CASE
    WHEN p_data ? 'name' THEN public.admin_validate_setting_value(p_data->>'name', 120)
    WHEN p_tier_id IS NOT NULL THEN v_current.name
    ELSE NULL
  END;

  IF v_name IS NULL OR btrim(v_name) = '' THEN
    RAISE EXCEPTION 'Pricing tier name is required' USING ERRCODE = '22023';
  END IF;

  v_display_name := CASE
    WHEN p_data ? 'display_name' THEN public.admin_validate_setting_value(p_data->>'display_name', 120)
    WHEN p_data ? 'name' THEN v_name
    WHEN p_tier_id IS NOT NULL THEN v_current.display_name
    ELSE v_name
  END;

  IF p_data ? 'description' THEN
    v_description := NULLIF(btrim(COALESCE(p_data->>'description', '')), '');
    IF v_description IS NOT NULL AND (length(v_description) > 500 OR v_description ~ '[[:cntrl:]<>]') THEN
      RAISE EXCEPTION 'Invalid pricing tier description' USING ERRCODE = '22023';
    END IF;
  ELSIF p_tier_id IS NOT NULL THEN
    v_description := v_current.description;
  END IF;

  v_price_full := CASE
    WHEN p_data ? 'price_full' THEN NULLIF(p_data->>'price_full', '')::numeric
    WHEN p_data ? 'base_price' THEN NULLIF(p_data->>'base_price', '')::numeric
    WHEN p_data ? 'price_brl' THEN NULLIF(p_data->>'price_brl', '')::numeric
    WHEN p_tier_id IS NOT NULL THEN v_current.price_full
    ELSE NULL
  END;

  IF v_price_full IS NULL OR v_price_full <= 0 OR v_price_full > 1000000 THEN
    RAISE EXCEPTION 'Invalid pricing tier price' USING ERRCODE = '22023';
  END IF;

  IF p_data ? 'price_brl'
     AND NULLIF(p_data->>'price_brl', '')::numeric <> v_price_full THEN
    RAISE EXCEPTION 'Pricing tier price_brl must match price_full' USING ERRCODE = '22023';
  END IF;

  v_price_brl := v_price_full;
  v_has_price_change := p_tier_id IS NULL
    OR v_current.price_full IS DISTINCT FROM v_price_full;

  SELECT cer.coins_per_real
    INTO v_coins_per_real
  FROM public.coin_exchange_rate cer
  WHERE cer.is_active = true
    AND cer.effective_date <= now()
  ORDER BY cer.effective_date DESC, cer.created_at DESC
  LIMIT 1;

  IF v_coins_per_real IS NULL OR v_coins_per_real <= 0 THEN
    RAISE EXCEPTION 'COIN_EXCHANGE_RATE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_expected_coins := GREATEST(1, round(v_price_brl * v_coins_per_real)::integer);

  IF p_data ? 'price_coins' THEN
    v_price_coins := NULLIF(p_data->>'price_coins', '')::integer;
    IF v_price_coins <> v_expected_coins THEN
      RAISE EXCEPTION 'Pricing tier coin price does not match active exchange rate' USING ERRCODE = '22023';
    END IF;
  ELSIF v_has_price_change THEN
    v_price_coins := v_expected_coins;
  ELSE
    v_price_coins := v_current.price_coins;
  END IF;

  v_discount := CASE
    WHEN p_data ? 'pix_discount_percentage' THEN NULLIF(p_data->>'pix_discount_percentage', '')::numeric
    WHEN p_tier_id IS NOT NULL AND v_current.price_full > 0 AND v_current.price_pix IS NOT NULL
      THEN 100 * (1 - (v_current.price_pix / v_current.price_full))
    ELSE 5
  END;

  IF v_discount < 0 OR v_discount >= 100 THEN
    RAISE EXCEPTION 'Invalid PIX discount percentage' USING ERRCODE = '22023';
  END IF;

  IF p_data ? 'price_pix' THEN
    v_price_pix := NULLIF(p_data->>'price_pix', '')::numeric;
  ELSIF p_tier_id IS NULL OR v_has_price_change OR p_data ? 'pix_discount_percentage' THEN
    v_price_pix := round(v_price_full * (1 - v_discount / 100), 2);
  ELSE
    v_price_pix := v_current.price_pix;
  END IF;

  IF v_price_pix IS NULL OR v_price_pix <= 0 OR v_price_pix > v_price_full THEN
    RAISE EXCEPTION 'Invalid pricing tier PIX price' USING ERRCODE = '22023';
  END IF;

  v_deposit := CASE
    WHEN p_data ? 'deposit_amount' THEN NULLIF(p_data->>'deposit_amount', '')::numeric
    WHEN p_tier_id IS NOT NULL THEN COALESCE(v_current.deposit_amount, 0)
    ELSE 0
  END;

  IF v_deposit < 0 OR v_deposit > v_price_full THEN
    RAISE EXCEPTION 'Invalid pricing tier deposit' USING ERRCODE = '22023';
  END IF;

  v_is_active := CASE
    WHEN p_data ? 'is_active' THEN (p_data->>'is_active')::boolean
    WHEN p_tier_id IS NOT NULL THEN COALESCE(v_current.is_active, true)
    ELSE true
  END;

  v_is_default := CASE
    WHEN p_data ? 'is_default' THEN (p_data->>'is_default')::boolean
    WHEN p_tier_id IS NOT NULL THEN COALESCE(v_current.is_default, false)
    ELSE false
  END;

  v_display_order := CASE
    WHEN p_data ? 'display_order' THEN NULLIF(p_data->>'display_order', '')::integer
    WHEN p_tier_id IS NOT NULL THEN COALESCE(v_current.display_order, 0)
    ELSE (SELECT COALESCE(max(display_order), 0) + 1 FROM public.pricing_tiers)
  END;

  IF v_display_order < 0 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'Invalid pricing tier display order' USING ERRCODE = '22023';
  END IF;

  IF v_is_default THEN
    UPDATE public.pricing_tiers
    SET is_default = false,
        updated_at = now()
    WHERE is_default = true
      AND (p_tier_id IS NULL OR id <> p_tier_id);
  END IF;

  IF p_tier_id IS NULL THEN
    INSERT INTO public.pricing_tiers (
      name, display_name, price_coins, price_brl, description, is_active,
      display_order, price_full, price_pix, deposit_amount, is_default
    ) VALUES (
      v_name, v_display_name, v_price_coins, v_price_brl, v_description, v_is_active,
      v_display_order, v_price_full, v_price_pix, v_deposit, v_is_default
    )
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.pricing_tiers
    SET name = v_name,
        display_name = v_display_name,
        price_coins = v_price_coins,
        price_brl = v_price_brl,
        description = v_description,
        is_active = v_is_active,
        display_order = v_display_order,
        price_full = v_price_full,
        price_pix = v_price_pix,
        deposit_amount = v_deposit,
        is_default = v_is_default,
        updated_at = now()
    WHERE id = p_tier_id
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_pricing_tier_plan(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_pricing_tier_plan(uuid, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
