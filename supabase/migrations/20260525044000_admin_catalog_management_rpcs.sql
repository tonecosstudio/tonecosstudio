-- Admin catalog management RPCs
-- Moves catalog write validation into the database boundary.

CREATE OR REPLACE FUNCTION public.assert_admin_catalog_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_catalog_character(
  p_character_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'released',
  p_price_category_id uuid DEFAULT NULL,
  p_theme_category text DEFAULT NULL,
  p_product_line text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_is_catalog boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_description text := NULLIF(btrim(COALESCE(p_description, '')), '');
  v_theme_category text := NULLIF(btrim(COALESCE(p_theme_category, '')), '');
  v_product_line text := NULLIF(btrim(COALESCE(p_product_line, '')), '');
  v_image_url text := NULLIF(btrim(COALESCE(p_image_url, '')), '');
  v_status text := COALESCE(NULLIF(btrim(p_status), ''), 'released');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_catalog_access();

  IF v_name IS NULL OR length(v_name) > 120 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid character name' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NOT NULL AND (length(v_description) > 1000 OR v_description ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid character description' USING ERRCODE = '22023';
  END IF;

  IF v_theme_category IS NOT NULL AND (length(v_theme_category) > 80 OR v_theme_category ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid theme category' USING ERRCODE = '22023';
  END IF;

  IF v_product_line IS NOT NULL AND (length(v_product_line) > 80 OR v_product_line ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid product line' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN ('released', 'coming_soon', 'upcoming', 'revealed') THEN
    RAISE EXCEPTION 'Invalid character status' USING ERRCODE = '22023';
  END IF;

  IF v_image_url IS NOT NULL AND v_image_url !~* '^https://[^[:space:]<>"'']+$' THEN
    RAISE EXCEPTION 'Invalid image URL' USING ERRCODE = '22023';
  END IF;

  IF p_price_category_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.price_categories WHERE id = p_price_category_id) THEN
    RAISE EXCEPTION 'Price category not found' USING ERRCODE = '22023';
  END IF;

  IF p_character_id IS NULL THEN
    INSERT INTO public.collection_characters (
      name,
      description,
      status,
      price_category_id,
      theme_category,
      product_line,
      image_url,
      is_catalog
    )
    VALUES (
      v_name,
      v_description,
      v_status,
      p_price_category_id,
      v_theme_category,
      v_product_line,
      v_image_url,
      COALESCE(p_is_catalog, true)
    )
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.collection_characters
    SET
      name = v_name,
      description = v_description,
      status = v_status,
      price_category_id = p_price_category_id,
      theme_category = v_theme_category,
      product_line = v_product_line,
      image_url = v_image_url,
      is_catalog = COALESCE(p_is_catalog, true)
    WHERE id = p_character_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Catalog character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_catalog_character(p_character_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_catalog_access();

  DELETE FROM public.collection_characters
  WHERE id = p_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalog character not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_price_category(
  p_category_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_price_coins integer DEFAULT 0,
  p_coin_value_in_cents integer DEFAULT 0,
  p_price_standalone integer DEFAULT 0,
  p_display_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_display_name text := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_description text := NULLIF(btrim(COALESCE(p_description, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_catalog_access();

  IF v_name IS NULL OR length(v_name) > 80 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category name' USING ERRCODE = '22023';
  END IF;

  IF v_display_name IS NULL OR length(v_display_name) > 120 OR v_display_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category display name' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NOT NULL AND (length(v_description) > 500 OR v_description ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid category description' USING ERRCODE = '22023';
  END IF;

  IF p_price_coins < 0 OR p_coin_value_in_cents < 0 OR p_price_standalone < 0 OR p_display_order < 0 THEN
    RAISE EXCEPTION 'Invalid category numeric value' USING ERRCODE = '22023';
  END IF;

  IF p_category_id IS NULL THEN
    INSERT INTO public.price_categories (
      name,
      display_name,
      description,
      price_coins,
      coin_value_in_cents,
      price_standalone,
      display_order,
      is_active
    )
    VALUES (
      v_name,
      v_display_name,
      v_description,
      p_price_coins,
      p_coin_value_in_cents,
      p_price_standalone,
      p_display_order,
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.price_categories
    SET
      name = v_name,
      display_name = v_display_name,
      description = v_description,
      price_coins = p_price_coins,
      coin_value_in_cents = p_coin_value_in_cents,
      price_standalone = p_price_standalone,
      display_order = p_display_order,
      is_active = COALESCE(p_is_active, true)
    WHERE id = p_category_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Price category not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_price_category(p_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_catalog_access();

  IF EXISTS (
    SELECT 1
    FROM public.collection_characters
    WHERE price_category_id = p_category_id
  ) THEN
    RAISE EXCEPTION 'Price category has linked characters' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.price_categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Price category not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_admin_catalog_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_catalog_character(uuid, text, text, text, uuid, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_catalog_character(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_price_category(uuid, text, text, text, integer, integer, integer, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_price_category(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assert_admin_catalog_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_catalog_character(uuid, text, text, text, uuid, text, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_catalog_character(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_price_category(uuid, text, text, text, integer, integer, integer, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_price_category(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_upsert_catalog_character(uuid, text, text, text, uuid, text, text, text, boolean) IS
  'Admin-only validated catalog character create/update RPC.';
COMMENT ON FUNCTION public.admin_delete_catalog_character(uuid) IS
  'Admin-only catalog character delete RPC.';
COMMENT ON FUNCTION public.admin_upsert_price_category(uuid, text, text, text, integer, integer, integer, integer, boolean) IS
  'Admin-only validated price category create/update RPC.';
COMMENT ON FUNCTION public.admin_delete_price_category(uuid) IS
  'Admin-only price category delete RPC with linked character guard.';

NOTIFY pgrst, 'reload schema';
