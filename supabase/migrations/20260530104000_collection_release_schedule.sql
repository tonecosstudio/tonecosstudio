-- Collection release schedule metadata.
-- Keeps collection presentation independent from catalog records while supporting
-- date-based reveals and explicit admin unlocks.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS release_cadence text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_release_cadence_valid,
  ADD CONSTRAINT collections_release_cadence_valid
    CHECK (release_cadence IN ('monthly', 'bimonthly', 'custom'));

ALTER TABLE public.collection_characters
  ADD COLUMN IF NOT EXISTS release_date date NULL,
  ADD COLUMN IF NOT EXISTS unlock_override boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_collection_characters_schedule
  ON public.collection_characters (collection_id, release_date, release_order, status, unlock_override);

DROP POLICY IF EXISTS "Anyone can view released collection entries" ON public.collection_characters;
CREATE POLICY "Anyone can view public collection entries"
  ON public.collection_characters FOR SELECT
  USING (
    status <> 'archived'
    AND EXISTS (
      SELECT 1
        FROM public.collections c
       WHERE c.id = collection_characters.collection_id
         AND c.is_active = true
         AND c.status = 'active'
    )
  );

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

COMMENT ON COLUMN public.collections.release_cadence IS
  'Preferred cadence for collection reveals: monthly, bimonthly, or custom.';
COMMENT ON COLUMN public.collection_characters.release_date IS
  'Exact public release date for this collection presentation entry.';
COMMENT ON COLUMN public.collection_characters.unlock_override IS
  'Admin override that unlocks this entry before its release date.';

NOTIFY pgrst, 'reload schema';
