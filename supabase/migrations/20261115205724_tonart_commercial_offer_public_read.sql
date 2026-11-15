-- Public product pages read only active offer terms while the existing
-- commerce gate is open. The gate remains false until separately authorized.
BEGIN;

-- Keep internal audit columns private while retaining the RLS-protected
-- public directory used by the existing catalog product pages.
REVOKE ALL ON public.tonart_commercial_offers FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  catalog_model_slug,
  scale,
  finishing,
  contents_description,
  item_price_brl,
  shipping_mode,
  shipping_amount_brl,
  delivery_terms,
  coins_eligible,
  subscriber_discount_eligible,
  is_active,
  updated_at
)
ON public.tonart_commercial_offers TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.tonart_public_commercial_offers_for_model(
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

COMMENT ON FUNCTION public.tonart_public_commercial_offers_for_model(text) IS
  'Returns only the configured active sale terms for one canonical model slug while TONART extra commerce is enabled; RLS remains authoritative.';

NOTIFY pgrst, 'reload schema';
COMMIT;
