CREATE OR REPLACE FUNCTION public.admin_get_collections_for_bulk_assign()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_default_price_text text;
  v_default_price numeric;
  v_result jsonb;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT ss.value
    INTO v_default_price_text
  FROM public.system_settings ss
  WHERE ss.key = 'default_price_full'
  LIMIT 1;

  IF v_default_price_text IS NULL OR btrim(v_default_price_text) = '' THEN
    RAISE EXCEPTION 'Default full price setting is not configured';
  END IF;

  BEGIN
    v_default_price := v_default_price_text::numeric;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Default full price setting is invalid';
  END;

  IF v_default_price < 0 THEN
    RAISE EXCEPTION 'Default full price setting is invalid';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'price_full', COALESCE(pt.price_full, v_default_price),
        'tier_id', cta.tier_id,
        'tier_name', pt.name
      )
      ORDER BY c.name, c.id
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.collections c
  LEFT JOIN public.collection_tier_assignments cta
    ON cta.collection_id = c.id
  LEFT JOIN public.pricing_tiers pt
    ON pt.id = cta.tier_id
  WHERE c.is_active = true;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_collections_for_bulk_assign() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_collections_for_bulk_assign() FROM anon;
REVOKE ALL ON FUNCTION public.admin_get_collections_for_bulk_assign() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_collections_for_bulk_assign() TO service_role;

NOTIFY pgrst, 'reload schema';
