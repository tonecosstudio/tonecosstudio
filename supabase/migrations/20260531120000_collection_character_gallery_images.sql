-- Adds optional gallery support for collection character detail pages.

ALTER TABLE public.collection_characters
  ADD COLUMN IF NOT EXISTS image_urls text[] NULL;

CREATE OR REPLACE FUNCTION public.admin_validate_public_image_url_array(p_value jsonb)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_validated text;
  v_urls text[] := ARRAY[]::text[];
BEGIN
  IF p_value IS NULL OR p_value = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_value) <> 'array' THEN
    RAISE EXCEPTION 'image_urls must be an array' USING ERRCODE = '22023';
  END IF;

  FOR v_url IN SELECT value FROM jsonb_array_elements_text(p_value)
  LOOP
    v_validated := public.admin_validate_public_image_url(v_url, false);

    IF v_validated IS NOT NULL AND NOT v_validated = ANY(v_urls) THEN
      v_urls := array_append(v_urls, v_validated);
    END IF;

    IF COALESCE(array_length(v_urls, 1), 0) > 12 THEN
      RAISE EXCEPTION 'Too many character gallery images' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN v_urls;
END;
$$;

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

  IF p_payload ? 'image_urls' THEN
    v_image_urls := public.admin_validate_public_image_url_array(p_payload->'image_urls');
  END IF;

  IF v_image_url IS NULL AND COALESCE(array_length(v_image_urls, 1), 0) > 0 THEN
    v_image_url := v_image_urls[1];
  END IF;

  v_release_order := COALESCE((p_payload->>'release_order')::integer, 0);
  IF v_release_order < 1 OR v_release_order > 10000 THEN
    RAISE EXCEPTION 'Invalid release order' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.admin_validate_public_image_url_array(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_validate_public_image_url_array(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_collection_characters(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_collection_character(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection_character(uuid, jsonb) TO authenticated, service_role;

COMMENT ON COLUMN public.collection_characters.image_urls IS
  'Optional ordered public gallery image URLs. image_url remains the primary image.';

NOTIFY pgrst, 'reload schema';
