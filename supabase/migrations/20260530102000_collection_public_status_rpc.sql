-- Keep collection publication state explicit in admin RPCs.
-- Public collection reads require both is_active=true and status='active'.

CREATE OR REPLACE FUNCTION public.admin_validate_collection_status(
  p_value text,
  p_default public.collection_status DEFAULT 'draft'::public.collection_status
)
RETURNS public.collection_status
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    RETURN p_default;
  END IF;

  IF v_value NOT IN ('draft', 'active', 'inactive', 'archived') THEN
    RAISE EXCEPTION 'Invalid collection status' USING ERRCODE = '22023';
  END IF;

  RETURN v_value::public.collection_status;
END;
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
  v_status public.collection_status;
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
  v_status := public.admin_validate_collection_status(
    p_payload->>'status',
    CASE WHEN v_is_active THEN 'active'::public.collection_status ELSE 'inactive'::public.collection_status END
  );

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
    status,
    updated_at
  )
  VALUES (
    v_name,
    v_slug,
    v_description,
    v_cover_image_url,
    v_rotation_type,
    v_is_active,
    v_status,
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
  v_status public.collection_status;
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

  IF p_payload ? 'status' THEN
    v_status := public.admin_validate_collection_status(p_payload->>'status');
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
    status = CASE
      WHEN p_payload ? 'status' THEN v_status
      WHEN p_payload ? 'is_active' AND v_is_active THEN 'active'::public.collection_status
      WHEN p_payload ? 'is_active' AND NOT v_is_active THEN 'inactive'::public.collection_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_collection_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_collection_status(text, public.collection_status) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_collection(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_collection(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_collection(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_collection(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_validate_collection_status(text, public.collection_status) IS
  'Validates collection public lifecycle status for admin collection mutation RPCs.';

NOTIFY pgrst, 'reload schema';
