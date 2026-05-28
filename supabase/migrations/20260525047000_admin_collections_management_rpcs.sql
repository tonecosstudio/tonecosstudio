-- Admin collections management RPCs.
-- Centralizes collection, character, and tier assignment mutations.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS rotation_type text NOT NULL DEFAULT 'fixed';

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_price_custom boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'collections_rotation_type_valid'
      AND conrelid = 'public.collections'::regclass
  ) THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_rotation_type_valid
      CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.collection_tier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id),
  UNIQUE (collection_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_tier_assignments_collection
  ON public.collection_tier_assignments(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_tier_assignments_tier
  ON public.collection_tier_assignments(tier_id);

ALTER TABLE public.collection_tier_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_tier_assignments_select_admin" ON public.collection_tier_assignments;
CREATE POLICY "collection_tier_assignments_select_admin"
  ON public.collection_tier_assignments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role');

DROP POLICY IF EXISTS "collection_tier_assignments_modify_admin" ON public.collection_tier_assignments;
CREATE POLICY "collection_tier_assignments_modify_admin"
  ON public.collection_tier_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role')
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role');

CREATE OR REPLACE FUNCTION public.admin_validate_collection_text(
  p_value text,
  p_label text,
  p_max_length integer,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_public_image_url(
  p_value text,
  p_required boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION 'Image URL is required' USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > 2048
    OR v_value !~ '^https://[^[:space:]<>]+$' THEN
    RAISE EXCEPTION 'Invalid image URL' USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_collection_row_json(p_collection public.collections)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(p_collection)
    || jsonb_build_object('image_url', p_collection.cover_image_url);
$$;

CREATE OR REPLACE FUNCTION public.admin_create_collection(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collection public.collections%ROWTYPE;
  v_name text;
  v_slug text;
  v_description text;
  v_cover_image_url text;
  v_rotation_type text;
  v_tier_id uuid;
  v_is_active boolean;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Collection payload must be an object' USING ERRCODE = '22023';
  END IF;

  v_name := public.admin_validate_collection_text(p_payload->>'name', 'collection name', 160);
  v_slug := lower(public.admin_validate_collection_text(p_payload->>'slug', 'collection slug', 120));
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid collection slug' USING ERRCODE = '22023';
  END IF;

  v_description := public.admin_validate_collection_text(p_payload->>'description', 'collection description', 2000, false);
  v_cover_image_url := public.admin_validate_public_image_url(
    COALESCE(p_payload->>'cover_image_url', p_payload->>'image_url'),
    false
  );
  v_rotation_type := COALESCE(NULLIF(p_payload->>'rotation_type', ''), 'fixed');
  IF v_rotation_type NOT IN ('fixed', 'odd_months', 'even_months') THEN
    RAISE EXCEPTION 'Invalid rotation type' USING ERRCODE = '22023';
  END IF;

  v_is_active := COALESCE((p_payload->>'is_active')::boolean, true);

  IF NULLIF(p_payload->>'tier_id', '') IS NOT NULL THEN
    v_tier_id := (p_payload->>'tier_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.pricing_tiers WHERE id = v_tier_id) THEN
      RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  INSERT INTO public.collections (
    name,
    slug,
    description,
    cover_image_url,
    rotation_type,
    is_active,
    updated_at
  )
  VALUES (
    v_name,
    v_slug,
    v_description,
    v_cover_image_url,
    v_rotation_type,
    v_is_active,
    now()
  )
  RETURNING * INTO v_collection;

  IF v_tier_id IS NOT NULL THEN
    INSERT INTO public.collection_tier_assignments (collection_id, tier_id)
    VALUES (v_collection.id, v_tier_id);
  END IF;

  RETURN public.admin_collection_row_json(v_collection);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_collection(
  p_collection_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_slug text;
  v_description text;
  v_cover_image_url text;
  v_rotation_type text;
  v_is_active boolean;
  v_tier_id uuid;
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Collection payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_payload ? 'name' THEN
    v_name := public.admin_validate_collection_text(p_payload->>'name', 'collection name', 160);
  END IF;

  IF p_payload ? 'slug' THEN
    v_slug := lower(public.admin_validate_collection_text(p_payload->>'slug', 'collection slug', 120));
    IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
      RAISE EXCEPTION 'Invalid collection slug' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'description' THEN
    v_description := public.admin_validate_collection_text(p_payload->>'description', 'collection description', 2000, false);
  END IF;

  IF p_payload ? 'image_url' OR p_payload ? 'cover_image_url' THEN
    v_cover_image_url := public.admin_validate_public_image_url(
      COALESCE(p_payload->>'cover_image_url', p_payload->>'image_url'),
      false
    );
  END IF;

  IF p_payload ? 'rotation_type' THEN
    v_rotation_type := NULLIF(p_payload->>'rotation_type', '');
    IF v_rotation_type NOT IN ('fixed', 'odd_months', 'even_months') THEN
      RAISE EXCEPTION 'Invalid rotation type' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'is_active' THEN
    v_is_active := (p_payload->>'is_active')::boolean;
  END IF;

  IF p_payload ? 'tier_id' THEN
    DELETE FROM public.collection_tier_assignments
    WHERE collection_id = p_collection_id;

    IF NULLIF(p_payload->>'tier_id', '') IS NOT NULL THEN
      v_tier_id := (p_payload->>'tier_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.pricing_tiers WHERE id = v_tier_id) THEN
        RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
      END IF;

      INSERT INTO public.collection_tier_assignments (collection_id, tier_id)
      VALUES (p_collection_id, v_tier_id);
    END IF;
  END IF;

  UPDATE public.collections
  SET
    name = CASE WHEN p_payload ? 'name' THEN v_name ELSE name END,
    slug = CASE WHEN p_payload ? 'slug' THEN v_slug ELSE slug END,
    description = CASE WHEN p_payload ? 'description' THEN v_description ELSE description END,
    cover_image_url = CASE WHEN (p_payload ? 'image_url' OR p_payload ? 'cover_image_url') THEN v_cover_image_url ELSE cover_image_url END,
    rotation_type = CASE WHEN p_payload ? 'rotation_type' THEN v_rotation_type ELSE rotation_type END,
    is_active = CASE WHEN p_payload ? 'is_active' THEN v_is_active ELSE is_active END,
    updated_at = now()
  WHERE id = p_collection_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_collection(p_collection_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collection record;
  v_fixed_count integer;
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT id, is_active, rotation_type
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id;

  IF v_collection.id IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_collection.is_active AND v_collection.rotation_type = 'fixed' THEN
    SELECT count(*) INTO v_fixed_count
      FROM public.collections
     WHERE is_active = true
       AND rotation_type = 'fixed';

    IF v_fixed_count <= 2 THEN
      RAISE EXCEPTION 'At least two active fixed collections are required' USING ERRCODE = '22023';
    END IF;
  END IF;

  DELETE FROM public.collections
  WHERE id = p_collection_id
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
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
  v_release_order integer;
  v_release_month integer;
  v_status text;
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

  v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'upcoming');
  IF v_status NOT IN ('upcoming', 'released', 'available', 'archived') THEN
    RAISE EXCEPTION 'Invalid character status' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'collection_id', v_collection_id,
    'name', v_name,
    'description', v_description,
    'image_url', v_image_url,
    'release_order', v_release_order,
    'release_month', v_release_month,
    'status', v_status
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
      release_order,
      release_month,
      status,
      updated_at
    )
    VALUES (
      (v_validated->>'collection_id')::uuid,
      v_validated->>'name',
      v_validated->>'description',
      v_validated->>'image_url',
      (v_validated->>'release_order')::integer,
      NULLIF(v_validated->>'release_month', '')::integer,
      v_validated->>'status',
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
    release_order,
    release_month,
    status,
    updated_at
  )
  VALUES (
    (v_validated->>'collection_id')::uuid,
    v_validated->>'name',
    v_validated->>'description',
    v_validated->>'image_url',
    (v_validated->>'release_order')::integer,
    NULLIF(v_validated->>'release_month', '')::integer,
    v_validated->>'status',
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
  v_release_order integer;
  v_release_month integer;
  v_status text;
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

  IF p_payload ? 'status' THEN
    v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'upcoming');
    IF v_status NOT IN ('upcoming', 'released', 'available', 'archived') THEN
      RAISE EXCEPTION 'Invalid character status' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.collection_characters
  SET
    name = CASE WHEN p_payload ? 'name' THEN v_name ELSE name END,
    description = CASE WHEN p_payload ? 'description' THEN v_description ELSE description END,
    image_url = CASE WHEN p_payload ? 'image_url' THEN v_image_url ELSE image_url END,
    release_order = CASE WHEN p_payload ? 'release_order' THEN v_release_order ELSE release_order END,
    release_month = CASE WHEN p_payload ? 'release_month' THEN v_release_month ELSE release_month END,
    status = CASE WHEN p_payload ? 'status' THEN v_status ELSE status END,
    updated_at = now()
  WHERE id = p_character_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_collection_character(p_character_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.collection_characters
  WHERE id = p_character_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_pricing_tier(p_tier_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF EXISTS (
    SELECT 1
    FROM public.collection_tier_assignments
    WHERE tier_id = p_tier_id
  ) THEN
    RAISE EXCEPTION 'Pricing tier has assigned collections' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.pricing_tiers
  WHERE id = p_tier_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_collections_to_tier(
  p_tier_id uuid,
  p_collection_ids jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_collection_id uuid;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF NOT EXISTS (SELECT 1 FROM public.pricing_tiers WHERE id = p_tier_id) THEN
    RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_collection_ids IS NULL OR jsonb_typeof(p_collection_ids) <> 'array' THEN
    RAISE EXCEPTION 'Collection IDs payload must be an array' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.collection_tier_assignments
  WHERE tier_id = p_tier_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_collection_ids)
  LOOP
    v_collection_id := (v_item #>> '{}')::uuid;

    IF NOT EXISTS (SELECT 1 FROM public.collections WHERE id = v_collection_id) THEN
      RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.collection_tier_assignments (collection_id, tier_id)
    VALUES (v_collection_id, p_tier_id)
    ON CONFLICT (collection_id) DO UPDATE
      SET tier_id = EXCLUDED.tier_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('assigned', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_collection_text(text, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_public_image_url(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_collection_row_json(public.collections) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_collection(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_collection(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_collection(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_collection_character(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_insert_collection_characters(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_insert_collection_character(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_collection_character(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_collection_character(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_pricing_tier(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_collections_to_tier(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_collection(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_collection(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_collection_characters(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_collection_character(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection_character(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_collection_character(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_pricing_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_collections_to_tier(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_create_collection(jsonb) IS
  'Admin-only validated collection creation, including optional tier assignment.';
COMMENT ON FUNCTION public.admin_update_collection(uuid, jsonb) IS
  'Admin-only validated collection update.';
COMMENT ON FUNCTION public.admin_delete_collection(uuid) IS
  'Admin-only validated collection deletion with fixed rotation guard.';
COMMENT ON FUNCTION public.admin_insert_collection_characters(jsonb) IS
  'Admin-only validated bulk collection character insert.';
COMMENT ON FUNCTION public.admin_insert_collection_character(jsonb) IS
  'Admin-only validated collection character insert.';
COMMENT ON FUNCTION public.admin_update_collection_character(uuid, jsonb) IS
  'Admin-only validated collection character update.';
COMMENT ON FUNCTION public.admin_delete_collection_character(uuid) IS
  'Admin-only validated collection character deletion.';
COMMENT ON FUNCTION public.admin_delete_pricing_tier(uuid) IS
  'Admin-only pricing tier deletion with assignment guard.';
COMMENT ON FUNCTION public.admin_assign_collections_to_tier(uuid, jsonb) IS
  'Admin-only atomic collection tier assignment replacement.';

NOTIFY pgrst, 'reload schema';
