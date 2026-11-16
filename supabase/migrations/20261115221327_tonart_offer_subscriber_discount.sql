-- Keep the proposed subscriber benefit configurable per eligible offer.
-- 500 basis points is the documented 5% proposal; the existing commerce gate
-- remains authoritative and is not changed here.
BEGIN;

ALTER TABLE public.tonart_commercial_offers
  ADD COLUMN IF NOT EXISTS subscriber_discount_basis_points integer NOT NULL DEFAULT 500;

ALTER TABLE public.tonart_commercial_offers
  ADD CONSTRAINT tonart_commercial_offers_subscriber_discount_bp_valid
    CHECK (subscriber_discount_basis_points BETWEEN 0 AND 10000) NOT VALID,
  ADD CONSTRAINT tonart_commercial_offers_subscriber_discount_eligible_valid
    CHECK (
      subscriber_discount_eligible IS FALSE
      OR subscriber_discount_basis_points > 0
    ) NOT VALID;

ALTER TABLE public.tonart_commercial_offers
  VALIDATE CONSTRAINT tonart_commercial_offers_subscriber_discount_bp_valid,
  VALIDATE CONSTRAINT tonart_commercial_offers_subscriber_discount_eligible_valid;

GRANT SELECT (subscriber_discount_basis_points)
  ON public.tonart_commercial_offers TO anon, authenticated;

CREATE OR REPLACE FUNCTION private_api.tonart_admin_commercial_offers_directory()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'commerce_enabled', lower(COALESCE((
      SELECT setting.value FROM public.system_settings setting
      WHERE setting.key = 'tonart_extra_commerce_enabled'
    ), 'false')) = 'true',
    'rows', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', offer.id,
        'catalog_model_slug', offer.catalog_model_slug,
        'scale', offer.scale,
        'finishing', offer.finishing,
        'contents_description', offer.contents_description,
        'item_price_brl', offer.item_price_brl,
        'shipping_mode', offer.shipping_mode,
        'shipping_amount_brl', offer.shipping_amount_brl,
        'delivery_terms', offer.delivery_terms,
        'coins_eligible', offer.coins_eligible,
        'subscriber_discount_eligible', offer.subscriber_discount_eligible,
        'subscriber_discount_basis_points', offer.subscriber_discount_basis_points,
        'is_active', offer.is_active,
        'updated_at', offer.updated_at
      ) ORDER BY offer.catalog_model_slug, offer.scale, offer.finishing)
      FROM public.tonart_commercial_offers offer
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private_api.admin_save_tonart_commercial_offer(
  p_offer_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'catalog_model_slug', 'scale', 'finishing', 'contents_description',
    'item_price_brl', 'shipping_mode', 'shipping_amount_brl',
    'delivery_terms', 'coins_eligible', 'subscriber_discount_eligible',
    'subscriber_discount_basis_points', 'is_active'
  ];
  v_key text;
  v_slug text;
  v_scale text;
  v_finishing text;
  v_contents text;
  v_item_price numeric(10,2);
  v_shipping_mode text;
  v_shipping_amount numeric(10,2);
  v_delivery_terms text;
  v_coins_eligible boolean;
  v_subscriber_discount_eligible boolean;
  v_subscriber_discount_basis_points integer;
  v_is_active boolean;
  v_result uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Commercial offer payload must be an object' USING ERRCODE = '22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_data) LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Invalid commercial offer field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_slug := NULLIF(btrim(p_data->>'catalog_model_slug'), '');
  v_scale := NULLIF(btrim(p_data->>'scale'), '');
  v_finishing := NULLIF(btrim(p_data->>'finishing'), '');
  v_contents := NULLIF(btrim(p_data->>'contents_description'), '');
  v_item_price := NULLIF(btrim(p_data->>'item_price_brl'), '')::numeric;
  v_shipping_mode := NULLIF(btrim(p_data->>'shipping_mode'), '');
  v_shipping_amount := NULLIF(btrim(p_data->>'shipping_amount_brl'), '')::numeric;
  v_delivery_terms := NULLIF(btrim(p_data->>'delivery_terms'), '');
  v_coins_eligible := COALESCE((p_data->>'coins_eligible')::boolean, false);
  v_subscriber_discount_eligible := COALESCE((p_data->>'subscriber_discount_eligible')::boolean, false);
  IF p_data ? 'subscriber_discount_basis_points' THEN
    v_subscriber_discount_basis_points :=
      NULLIF(btrim(p_data->>'subscriber_discount_basis_points'), '')::integer;
  END IF;
  v_is_active := COALESCE((p_data->>'is_active')::boolean, false);

  IF v_slug IS NULL OR v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
     OR v_scale NOT IN ('1/10', '1/6')
     OR v_finishing NOT IN ('painted', 'unpainted')
     OR v_contents IS NULL OR length(v_contents) > 1000
     OR v_item_price IS NULL OR v_item_price <= 0 OR v_item_price > 99999999.99
     OR v_shipping_mode NOT IN ('fixed', 'quote_required')
     OR (v_shipping_mode = 'fixed' AND (v_shipping_amount IS NULL OR v_shipping_amount < 0 OR v_shipping_amount > 99999999.99))
     OR (v_shipping_mode = 'quote_required' AND v_shipping_amount IS NOT NULL)
     OR v_delivery_terms IS NULL OR length(v_delivery_terms) > 500
     OR (v_subscriber_discount_basis_points IS NOT NULL
         AND v_subscriber_discount_basis_points NOT BETWEEN 0 AND 10000)
     OR (v_subscriber_discount_eligible IS TRUE
         AND v_subscriber_discount_basis_points = 0) THEN
    RAISE EXCEPTION 'Commercial offer terms are invalid' USING ERRCODE = '22023';
  END IF;

  IF v_is_active IS TRUE AND lower(COALESCE((
    SELECT setting.value FROM public.system_settings setting
    WHERE setting.key = 'tonart_extra_commerce_enabled'
  ), 'false')) <> 'true' THEN
    RAISE EXCEPTION 'TONART_EXTRA_COMMERCE_DISABLED' USING ERRCODE = '22023';
  END IF;

  IF p_offer_id IS NULL THEN
    INSERT INTO public.tonart_commercial_offers (
      catalog_model_slug, scale, finishing, contents_description,
      item_price_brl, shipping_mode, shipping_amount_brl, delivery_terms,
      coins_eligible, subscriber_discount_eligible,
      subscriber_discount_basis_points, is_active, updated_by
    ) VALUES (
      v_slug, v_scale, v_finishing, v_contents,
      v_item_price, v_shipping_mode, v_shipping_amount, v_delivery_terms,
      v_coins_eligible, v_subscriber_discount_eligible,
      COALESCE(v_subscriber_discount_basis_points, 500),
      v_is_active, auth.uid()
    ) RETURNING id INTO v_result;
  ELSE
    UPDATE public.tonart_commercial_offers
       SET catalog_model_slug = v_slug,
           scale = v_scale,
           finishing = v_finishing,
           contents_description = v_contents,
           item_price_brl = v_item_price,
           shipping_mode = v_shipping_mode,
           shipping_amount_brl = v_shipping_amount,
           delivery_terms = v_delivery_terms,
           coins_eligible = v_coins_eligible,
           subscriber_discount_eligible = v_subscriber_discount_eligible,
           subscriber_discount_basis_points = COALESCE(
             v_subscriber_discount_basis_points,
             subscriber_discount_basis_points
           ),
           is_active = v_is_active,
           updated_at = clock_timestamp(),
           updated_by = auth.uid()
     WHERE id = p_offer_id
     RETURNING id INTO v_result;
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Commercial offer not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;

-- PostgREST cannot replace a RETURNS TABLE function after its row shape changes.
DROP FUNCTION public.tonart_public_commercial_offers_for_model(text);

CREATE FUNCTION public.tonart_public_commercial_offers_for_model(
  p_catalog_model_slug text
)
RETURNS TABLE (
  id uuid,
  catalog_model_slug text,
  scale text,
  finishing text,
  contents_description text,
  item_price_brl numeric(10,2),
  shipping_mode text,
  shipping_amount_brl numeric(10,2),
  delivery_terms text,
  coins_eligible boolean,
  subscriber_discount_eligible boolean,
  subscriber_discount_basis_points integer,
  is_active boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    offer.id,
    offer.catalog_model_slug,
    offer.scale,
    offer.finishing,
    offer.contents_description,
    offer.item_price_brl,
    offer.shipping_mode,
    offer.shipping_amount_brl,
    offer.delivery_terms,
    offer.coins_eligible,
    offer.subscriber_discount_eligible,
    offer.subscriber_discount_basis_points,
    offer.is_active,
    offer.updated_at
  FROM public.tonart_commercial_offers AS offer
  WHERE p_catalog_model_slug ~ '^[a-z0-9][a-z0-9-]{0,239}$'
    AND offer.catalog_model_slug = p_catalog_model_slug
    AND offer.is_active IS TRUE
    AND lower(COALESCE((
      SELECT setting.value
      FROM public.system_settings AS setting
      WHERE setting.key = 'tonart_extra_commerce_enabled'
    ), 'false')) = 'true'
  ORDER BY offer.scale, offer.finishing;
$function$;

REVOKE ALL ON FUNCTION public.tonart_public_commercial_offers_for_model(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tonart_public_commercial_offers_for_model(text)
  TO anon, authenticated;

COMMENT ON COLUMN public.tonart_commercial_offers.subscriber_discount_basis_points IS
  'Configurable subscriber discount, in basis points; 500 is the inactive-by-default 5% proposal.';

COMMENT ON FUNCTION public.tonart_public_commercial_offers_for_model(text) IS
  'Returns configured sale terms and the per-offer subscriber discount while the existing extra-commerce gate is open; RLS remains authoritative.';

NOTIFY pgrst, 'reload schema';
COMMIT;
