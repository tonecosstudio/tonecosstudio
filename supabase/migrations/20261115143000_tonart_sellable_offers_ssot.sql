-- Commercial offers reference the canonical catalog by slug. Product identity
-- and media remain owned by the Cloudflare Worker; this table stores sale terms.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tonart_commercial_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_model_slug text NOT NULL,
  scale text NOT NULL,
  finishing text NOT NULL,
  contents_description text NOT NULL,
  item_price_brl numeric(10,2) NOT NULL,
  shipping_mode text NOT NULL DEFAULT 'quote_required',
  shipping_amount_brl numeric(10,2),
  delivery_terms text NOT NULL,
  coins_eligible boolean NOT NULL DEFAULT false,
  subscriber_discount_eligible boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT tonart_commercial_offers_slug_valid
    CHECK (catalog_model_slug ~ '^[a-z0-9][a-z0-9-]{0,239}$'),
  CONSTRAINT tonart_commercial_offers_scale_valid
    CHECK (scale IN ('1/10', '1/6')),
  CONSTRAINT tonart_commercial_offers_finishing_valid
    CHECK (finishing IN ('painted', 'unpainted')),
  CONSTRAINT tonart_commercial_offers_contents_valid
    CHECK (length(btrim(contents_description)) BETWEEN 1 AND 1000),
  CONSTRAINT tonart_commercial_offers_item_price_valid
    CHECK (item_price_brl > 0),
  CONSTRAINT tonart_commercial_offers_shipping_valid
    CHECK (
      (shipping_mode = 'quote_required' AND shipping_amount_brl IS NULL)
      OR (shipping_mode = 'fixed' AND shipping_amount_brl IS NOT NULL AND shipping_amount_brl >= 0)
    ),
  CONSTRAINT tonart_commercial_offers_shipping_mode_valid
    CHECK (shipping_mode IN ('fixed', 'quote_required')),
  CONSTRAINT tonart_commercial_offers_delivery_terms_valid
    CHECK (length(btrim(delivery_terms)) BETWEEN 1 AND 500),
  CONSTRAINT tonart_commercial_offers_model_variant_unique
    UNIQUE (catalog_model_slug, scale, finishing)
);

CREATE INDEX IF NOT EXISTS tonart_commercial_offers_active_slug_idx
  ON public.tonart_commercial_offers(catalog_model_slug)
  WHERE is_active IS TRUE;

ALTER TABLE public.tonart_commercial_offers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tonart_commercial_offers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tonart_commercial_offers TO anon, authenticated;

DROP POLICY IF EXISTS tonart_commercial_offers_public_read ON public.tonart_commercial_offers;
CREATE POLICY tonart_commercial_offers_public_read
  ON public.tonart_commercial_offers
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active IS TRUE
    AND lower(COALESCE((
      SELECT setting.value FROM public.system_settings setting
      WHERE setting.key = 'tonart_extra_commerce_enabled'
    ), 'false')) = 'true'
  );

INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'tonart_extra_commerce_enabled',
  'false',
  'Gate de segurança para ofertas e checkout de produtos extras TONART.',
  clock_timestamp()
)
ON CONFLICT (key) DO NOTHING;

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
        'is_active', offer.is_active,
        'updated_at', offer.updated_at
      ) ORDER BY offer.catalog_model_slug, offer.scale, offer.finishing)
      FROM public.tonart_commercial_offers offer
    ), '[]'::jsonb)
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.tonart_admin_commercial_offers_directory()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.tonart_admin_commercial_offers_directory()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tonart_admin_commercial_offers_directory()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.tonart_admin_commercial_offers_directory();
$function$;
REVOKE ALL ON FUNCTION public.tonart_admin_commercial_offers_directory()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tonart_admin_commercial_offers_directory()
  TO authenticated, service_role;

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
    'delivery_terms', 'coins_eligible', 'subscriber_discount_eligible', 'is_active'
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
  v_is_active := COALESCE((p_data->>'is_active')::boolean, false);

  IF v_slug IS NULL OR v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
     OR v_scale NOT IN ('1/10', '1/6')
     OR v_finishing NOT IN ('painted', 'unpainted')
     OR v_contents IS NULL OR length(v_contents) > 1000
     OR v_item_price IS NULL OR v_item_price <= 0 OR v_item_price > 99999999.99
     OR v_shipping_mode NOT IN ('fixed', 'quote_required')
     OR (v_shipping_mode = 'fixed' AND (v_shipping_amount IS NULL OR v_shipping_amount < 0 OR v_shipping_amount > 99999999.99))
     OR (v_shipping_mode = 'quote_required' AND v_shipping_amount IS NOT NULL)
     OR v_delivery_terms IS NULL OR length(v_delivery_terms) > 500 THEN
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
      coins_eligible, subscriber_discount_eligible, is_active, updated_by
    ) VALUES (
      v_slug, v_scale, v_finishing, v_contents,
      v_item_price, v_shipping_mode, v_shipping_amount, v_delivery_terms,
      v_coins_eligible, v_subscriber_discount_eligible, v_is_active, auth.uid()
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
REVOKE ALL ON FUNCTION private_api.admin_save_tonart_commercial_offer(uuid,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_save_tonart_commercial_offer(uuid,jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_save_tonart_commercial_offer(
  p_offer_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_save_tonart_commercial_offer(p_offer_id, p_data);
$function$;
REVOKE ALL ON FUNCTION public.admin_save_tonart_commercial_offer(uuid,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_tonart_commercial_offer(uuid,jsonb)
  TO authenticated, service_role;

COMMENT ON TABLE public.tonart_commercial_offers IS
  'TONART sale terms keyed by a canonical Cloudflare catalog model slug; contains no mirrored catalog identity or media.';
COMMENT ON COLUMN public.tonart_commercial_offers.coins_eligible IS
  'Coins may cover eligible item subtotal only; shipping remains in BRL.';
COMMENT ON COLUMN public.tonart_commercial_offers.subscriber_discount_eligible IS
  'The documented subscriber discount may apply to this offer when the customer has an active eligible contract.';

NOTIFY pgrst, 'reload schema';
COMMIT;
