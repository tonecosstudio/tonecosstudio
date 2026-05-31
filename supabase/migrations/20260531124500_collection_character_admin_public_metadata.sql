-- Persists public detail metadata from the collection admin.

ALTER TABLE public.collection_characters
  ADD COLUMN IF NOT EXISTS display_order integer NULL,
  ADD COLUMN IF NOT EXISTS franchise text NULL,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.admin_validate_collection_character(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collection_id uuid;
  v_name text;
  v_description text;
  v_image_url text;
  v_image_urls text[];
  v_franchise text;
  v_product_line text;
  v_theme_category text;
  v_stock_quantity integer;
  v_display_order integer;
  v_release_order integer;
  v_release_month integer;
  v_release_date date;
  v_status text;
  v_unlock_override boolean;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Character payload must be an object' USING ERRCODE = '22023';
  END IF;

  v_collection_id := (p_payload->>'collection_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.collections WHERE id = v_collection_id) THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;

  v_name := public.admin_validate_collection_text(p_payload->>'name', 'character name', 160);
  v_description := public.admin_validate_collection_text(p_payload->>'description', 'character description', 2000, false);
  v_image_url := public.admin_validate_public_image_url(p_payload->>'image_url', false);
  v_franchise := public.admin_validate_collection_text(p_payload->>'franchise', 'franchise', 160, false);
  v_product_line := public.admin_validate_collection_text(p_payload->>'product_line', 'product line', 120, false);
  v_theme_category := public.admin_validate_collection_text(p_payload->>'theme_category', 'theme category', 120, false);

  IF p_payload ? 'image_urls' THEN
    v_image_urls := public.admin_validate_public_image_url_array(p_payload->'image_urls');
  END IF;

  IF v_image_url IS NULL AND COALESCE(array_length(v_image_urls, 1), 0) > 0 THEN
    v_image_url := v_image_urls[1];
  END IF;

  v_stock_quantity := COALESCE(NULLIF(p_payload->>'stock_quantity', '')::integer, 0);
  IF v_stock_quantity < 0 OR v_stock_quantity > 1000000 THEN
    RAISE EXCEPTION 'Invalid stock quantity' USING ERRCODE = '22023';
  END IF;

  v_release_order := COALESCE((p_payload->>'release_order')::integer, 0);
  IF v_release_order < 1 OR v_release_order > 10000 THEN
    RAISE EXCEPTION 'Invalid release order' USING ERRCODE = '22023';
  END IF;

  v_display_order := COALESCE(NULLIF(p_payload->>'display_order', '')::integer, v_release_order);
  IF v_display_order < 1 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'Invalid display order' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(p_payload->>'release_month', '') IS NOT NULL THEN
    v_release_month := (p_payload->>'release_month')::integer;
    IF v_release_month < 1 OR v_release_month > 12 THEN
      RAISE EXCEPTION 'Invalid release month' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NULLIF(p_payload->>'release_date', '') IS NOT NULL THEN
    v_release_date := (p_payload->>'release_date')::date;
  END IF;

  v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'upcoming');
  IF v_status NOT IN ('upcoming', 'revealed', 'released', 'available', 'archived') THEN
    RAISE EXCEPTION 'Invalid character status' USING ERRCODE = '22023';
  END IF;

  v_unlock_override := COALESCE((p_payload->>'unlock_override')::boolean, false);

  RETURN jsonb_build_object(
    'collection_id', v_collection_id,
    'name', v_name,
    'description', v_description,
    'image_url', v_image_url,
    'image_urls', to_jsonb(v_image_urls),
    'franchise', v_franchise,
    'product_line', v_product_line,
    'theme_category', v_theme_category,
    'stock_quantity', v_stock_quantity,
    'display_order', v_display_order,
    'release_order', v_release_order,
    'release_month', v_release_month,
    'release_date', v_release_date,
    'status', v_status,
    'unlock_override', v_unlock_override
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_insert_collection_characters(p_characters jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_validated jsonb;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_characters IS NULL OR jsonb_typeof(p_characters) <> 'array' THEN
    RAISE EXCEPTION 'Characters payload must be an array' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_characters)
  LOOP
    v_validated := public.admin_validate_collection_character(v_item);

    INSERT INTO public.collection_characters (
      collection_id,
      name,
      description,
      image_url,
      image_urls,
      franchise,
      product_line,
      theme_category,
      stock_quantity,
      display_order,
      release_order,
      release_month,
      release_date,
      status,
      unlock_override,
      updated_at
    )
    VALUES (
      (v_validated->>'collection_id')::uuid,
      v_validated->>'name',
      v_validated->>'description',
      v_validated->>'image_url',
      public.admin_validate_public_image_url_array(v_validated->'image_urls'),
      v_validated->>'franchise',
      v_validated->>'product_line',
      v_validated->>'theme_category',
      (v_validated->>'stock_quantity')::integer,
      (v_validated->>'display_order')::integer,
      (v_validated->>'release_order')::integer,
      NULLIF(v_validated->>'release_month', '')::integer,
      NULLIF(v_validated->>'release_date', '')::date,
      v_validated->>'status',
      COALESCE((v_validated->>'unlock_override')::boolean, false),
      now()
    );

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No characters supplied' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('inserted', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_insert_collection_character(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_validated jsonb;
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  v_validated := public.admin_validate_collection_character(p_payload);

  INSERT INTO public.collection_characters (
    collection_id,
    name,
    description,
    image_url,
    image_urls,
    franchise,
    product_line,
    theme_category,
    stock_quantity,
    display_order,
    release_order,
    release_month,
    release_date,
    status,
    unlock_override,
    updated_at
  )
  VALUES (
    (v_validated->>'collection_id')::uuid,
    v_validated->>'name',
    v_validated->>'description',
    v_validated->>'image_url',
    public.admin_validate_public_image_url_array(v_validated->'image_urls'),
    v_validated->>'franchise',
    v_validated->>'product_line',
    v_validated->>'theme_category',
    (v_validated->>'stock_quantity')::integer,
    (v_validated->>'display_order')::integer,
    (v_validated->>'release_order')::integer,
    NULLIF(v_validated->>'release_month', '')::integer,
    NULLIF(v_validated->>'release_date', '')::date,
    v_validated->>'status',
    COALESCE((v_validated->>'unlock_override')::boolean, false),
    now()
  )
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_collection_character(
  p_character_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_description text;
  v_image_url text;
  v_image_urls text[];
  v_franchise text;
  v_product_line text;
  v_theme_category text;
  v_stock_quantity integer;
  v_display_order integer;
  v_release_order integer;
  v_release_month integer;
  v_release_date date;
  v_status text;
  v_unlock_override boolean;
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Character payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_payload ? 'name' THEN
    v_name := public.admin_validate_collection_text(p_payload->>'name', 'character name', 160);
  END IF;

  IF p_payload ? 'description' THEN
    v_description := public.admin_validate_collection_text(p_payload->>'description', 'character description', 2000, false);
  END IF;

  IF p_payload ? 'image_url' THEN
    v_image_url := public.admin_validate_public_image_url(p_payload->>'image_url', false);
  END IF;

  IF p_payload ? 'image_urls' THEN
    v_image_urls := public.admin_validate_public_image_url_array(p_payload->'image_urls');
  END IF;

  IF p_payload ? 'franchise' THEN
    v_franchise := public.admin_validate_collection_text(p_payload->>'franchise', 'franchise', 160, false);
  END IF;

  IF p_payload ? 'product_line' THEN
    v_product_line := public.admin_validate_collection_text(p_payload->>'product_line', 'product line', 120, false);
  END IF;

  IF p_payload ? 'theme_category' THEN
    v_theme_category := public.admin_validate_collection_text(p_payload->>'theme_category', 'theme category', 120, false);
  END IF;

  IF p_payload ? 'stock_quantity' THEN
    v_stock_quantity := COALESCE(NULLIF(p_payload->>'stock_quantity', '')::integer, 0);
    IF v_stock_quantity < 0 OR v_stock_quantity > 1000000 THEN
      RAISE EXCEPTION 'Invalid stock quantity' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'display_order' THEN
    IF NULLIF(p_payload->>'display_order', '') IS NOT NULL THEN
      v_display_order := (p_payload->>'display_order')::integer;
      IF v_display_order < 1 OR v_display_order > 10000 THEN
        RAISE EXCEPTION 'Invalid display order' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  IF p_payload ? 'release_order' THEN
    v_release_order := (p_payload->>'release_order')::integer;
    IF v_release_order < 1 OR v_release_order > 10000 THEN
      RAISE EXCEPTION 'Invalid release order' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'release_month' THEN
    IF NULLIF(p_payload->>'release_month', '') IS NOT NULL THEN
      v_release_month := (p_payload->>'release_month')::integer;
      IF v_release_month < 1 OR v_release_month > 12 THEN
        RAISE EXCEPTION 'Invalid release month' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  IF p_payload ? 'release_date' THEN
    IF NULLIF(p_payload->>'release_date', '') IS NOT NULL THEN
      v_release_date := (p_payload->>'release_date')::date;
    END IF;
  END IF;

  IF p_payload ? 'status' THEN
    v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'upcoming');
    IF v_status NOT IN ('upcoming', 'revealed', 'released', 'available', 'archived') THEN
      RAISE EXCEPTION 'Invalid character status' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'unlock_override' THEN
    v_unlock_override := COALESCE((p_payload->>'unlock_override')::boolean, false);
  END IF;

  UPDATE public.collection_characters
  SET
    name = CASE WHEN p_payload ? 'name' THEN v_name ELSE name END,
    description = CASE WHEN p_payload ? 'description' THEN v_description ELSE description END,
    image_url = CASE WHEN p_payload ? 'image_url' THEN v_image_url ELSE image_url END,
    image_urls = CASE WHEN p_payload ? 'image_urls' THEN v_image_urls ELSE image_urls END,
    franchise = CASE WHEN p_payload ? 'franchise' THEN v_franchise ELSE franchise END,
    product_line = CASE WHEN p_payload ? 'product_line' THEN v_product_line ELSE product_line END,
    theme_category = CASE WHEN p_payload ? 'theme_category' THEN v_theme_category ELSE theme_category END,
    stock_quantity = CASE WHEN p_payload ? 'stock_quantity' THEN v_stock_quantity ELSE stock_quantity END,
    display_order = CASE WHEN p_payload ? 'display_order' THEN v_display_order ELSE display_order END,
    release_order = CASE WHEN p_payload ? 'release_order' THEN v_release_order ELSE release_order END,
    release_month = CASE WHEN p_payload ? 'release_month' THEN v_release_month ELSE release_month END,
    release_date = CASE WHEN p_payload ? 'release_date' THEN v_release_date ELSE release_date END,
    status = CASE WHEN p_payload ? 'status' THEN v_status ELSE status END,
    unlock_override = CASE WHEN p_payload ? 'unlock_override' THEN v_unlock_override ELSE unlock_override END,
    updated_at = now()
  WHERE id = p_character_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_insert_collection_characters(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_collection_character(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection_character(uuid, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
