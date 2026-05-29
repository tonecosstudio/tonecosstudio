-- Atomic publication from the Drive import queue into the public models table.
-- Keeps curation write rules at the database boundary.

CREATE OR REPLACE FUNCTION public.admin_publish_catalog_import_item(
  p_queue_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.catalog_import_items%ROWTYPE;
  v_name text := NULLIF(btrim(COALESCE(p_payload->>'name', '')), '');
  v_description text := NULLIF(btrim(COALESCE(p_payload->>'description', '')), '');
  v_character_name text := NULLIF(btrim(COALESCE(p_payload->>'character_name', '')), '');
  v_variant_name text := NULLIF(btrim(COALESCE(p_payload->>'variant_name', '')), '');
  v_variant_type text := COALESCE(NULLIF(btrim(COALESCE(p_payload->>'variant_type', '')), ''), 'default');
  v_source_title text := NULLIF(btrim(COALESCE(p_payload->>'source_title', '')), '');
  v_source_type text := COALESCE(NULLIF(btrim(COALESCE(p_payload->>'source_type', p_payload->>'media_type', '')), ''), 'other');
  v_franchise text := NULLIF(btrim(COALESCE(p_payload->>'franchise', '')), '');
  v_category text := NULLIF(btrim(COALESCE(p_payload->>'category', '')), '');
  v_subcategory text := NULLIF(btrim(COALESCE(p_payload->>'subcategory', '')), '');
  v_visibility text := COALESCE(NULLIF(btrim(COALESCE(p_payload->>'catalog_visibility', '')), ''), 'hidden');
  v_collection_id uuid := NULLIF(p_payload->>'collection_id', '')::uuid;
  v_price_mode text := COALESCE(NULLIF(btrim(COALESCE(p_payload->>'price_mode', '')), ''), 'consultation');
  v_price_standalone_override integer := NULLIF(p_payload->>'price_standalone_override', '')::integer;
  v_price_coins_override integer := NULLIF(p_payload->>'price_coins_override', '')::integer;
  v_tags text[] := '{}'::text[];
  v_model_id uuid;
BEGIN
  PERFORM public.assert_admin_catalog_access();

  SELECT *
    INTO v_item
    FROM public.catalog_import_items
   WHERE id = p_queue_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import item not found' USING ERRCODE = '22023';
  END IF;

  IF v_item.status = 'published' AND v_item.published_model_id IS NOT NULL THEN
    RETURN v_item.published_model_id;
  END IF;

  IF v_name IS NULL OR length(v_name) > 160 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid model name' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NOT NULL AND (length(v_description) > 2000 OR v_description ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid description' USING ERRCODE = '22023';
  END IF;

  IF v_variant_type NOT IN ('default', 'form', 'costume', 'pose', 'scale', 'edition', 'variant', 'other') THEN
    RAISE EXCEPTION 'Invalid variant type' USING ERRCODE = '22023';
  END IF;

  IF v_source_type NOT IN ('anime', 'manga', 'movie', 'series', 'game', 'comic', 'tokusatsu', 'original', 'other') THEN
    RAISE EXCEPTION 'Invalid source type' USING ERRCODE = '22023';
  END IF;

  IF v_visibility NOT IN ('general', 'collection', 'both', 'hidden') THEN
    RAISE EXCEPTION 'Invalid catalog visibility' USING ERRCODE = '22023';
  END IF;

  IF v_price_mode NOT IN ('consultation', 'category', 'fixed') THEN
    RAISE EXCEPTION 'Invalid price mode' USING ERRCODE = '22023';
  END IF;

  IF v_price_standalone_override IS NOT NULL AND v_price_standalone_override < 0 THEN
    RAISE EXCEPTION 'Invalid standalone price' USING ERRCODE = '22023';
  END IF;

  IF v_price_coins_override IS NOT NULL AND v_price_coins_override < 0 THEN
    RAISE EXCEPTION 'Invalid coin price' USING ERRCODE = '22023';
  END IF;

  IF v_visibility IN ('collection', 'both') THEN
    IF v_collection_id IS NULL THEN
      RAISE EXCEPTION 'Collection is required for collection visibility' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.collections WHERE id = v_collection_id) THEN
      RAISE EXCEPTION 'Collection not found' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF jsonb_typeof(p_payload->'tags') = 'array' THEN
    SELECT COALESCE(array_agg(tag), '{}'::text[])
      INTO v_tags
      FROM (
        SELECT lower(btrim(tag_value.value)) AS tag
          FROM jsonb_array_elements_text(p_payload->'tags') AS tag_value(value)
         WHERE NULLIF(btrim(tag_value.value), '') IS NOT NULL
           AND tag_value.value !~ '<[^>]*>'
         LIMIT 20
      ) normalized_tags;
  END IF;

  v_source_title := COALESCE(v_source_title, v_franchise, v_item.source_title, v_item.source_folder_name);
  v_franchise := COALESCE(v_franchise, v_source_title);
  v_character_name := COALESCE(v_character_name, v_name);

  INSERT INTO public.models (
    name,
    description,
    franchise,
    category,
    subcategory,
    tags,
    image_bucket,
    image_path,
    thumbnail_url,
    file_url,
    is_active,
    character_name,
    variant_name,
    variant_type,
    source_title,
    source_type,
    catalog_visibility,
    collection_id,
    source_drive_file_id,
    source_drive_folder_id,
    source_drive_path,
    curation_status,
    price_mode,
    price_standalone_override,
    price_coins_override
  )
  VALUES (
    v_name,
    v_description,
    v_franchise,
    v_category,
    v_subcategory,
    v_tags,
    COALESCE(v_item.storage_bucket, 'models'),
    v_item.storage_path,
    v_item.thumbnail_url,
    v_item.source_file_url,
    v_visibility <> 'hidden',
    v_character_name,
    v_variant_name,
    v_variant_type,
    v_source_title,
    v_source_type,
    v_visibility,
    v_collection_id,
    v_item.source_file_id,
    v_item.source_folder_id,
    v_item.source_drive_path,
    'approved',
    v_price_mode,
    v_price_standalone_override,
    v_price_coins_override
  )
  RETURNING id INTO v_model_id;

  UPDATE public.catalog_import_items
     SET status = 'published',
         published_model_id = v_model_id,
         published_at = now(),
         reviewed_at = COALESCE(reviewed_at, now()),
         updated_at = now()
   WHERE id = p_queue_id;

  RETURN v_model_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_catalog_import_item(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_catalog_import_item(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_publish_catalog_import_item(uuid, jsonb) IS
  'Publishes one reviewed Drive import queue item into models atomically, including taxonomy, visibility, and price metadata.';

NOTIFY pgrst, 'reload schema';
