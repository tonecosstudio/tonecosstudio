-- TONART private, evidence-backed editorial profiles for canonical characters.
-- Extends the existing identity record; it does not add a second character catalog
-- or publish anything to the public Worker projection.
BEGIN;

ALTER TABLE public.catalog_character_identities
  ADD COLUMN editorial_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN editorial_profile_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN editorial_profile_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN editorial_profile_reviewed_at timestamptz,
  ADD COLUMN editorial_profile_reviewed_by uuid,
  ADD COLUMN editorial_profile_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT catalog_character_editorial_profile_object
    CHECK (jsonb_typeof(editorial_profile) = 'object'),
  ADD CONSTRAINT catalog_character_editorial_profile_status
    CHECK (editorial_profile_status IN ('draft', 'reviewed')),
  ADD CONSTRAINT catalog_character_editorial_profile_revision
    CHECK (editorial_profile_revision >= 0),
  ADD CONSTRAINT catalog_character_editorial_profile_history
    CHECK (jsonb_typeof(editorial_profile_history) = 'array'
      AND jsonb_array_length(editorial_profile_history) <= 25),
  ADD CONSTRAINT catalog_character_editorial_profile_review_state
    CHECK (
      (editorial_profile_status = 'draft'
        AND editorial_profile_reviewed_at IS NULL
        AND editorial_profile_reviewed_by IS NULL)
      OR
      (editorial_profile_status = 'reviewed'
        AND editorial_profile_reviewed_at IS NOT NULL
        AND editorial_profile_reviewed_by IS NOT NULL)
    );

CREATE UNIQUE INDEX catalog_character_editorial_profile_slug_unique
  ON public.catalog_character_identities ((editorial_profile ->> 'slug'))
  WHERE editorial_profile_status = 'reviewed'
    AND editorial_profile ->> 'slug' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_validate_catalog_character_editorial_sources(
  p_sources jsonb,
  p_label text,
  p_required boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_sources$
DECLARE
  v_sources jsonb := COALESCE(p_sources, '[]'::jsonb);
  v_source jsonb;
  v_result jsonb := '[]'::jsonb;
  v_title text;
  v_url text;
  v_kind text;
  v_host text;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF jsonb_typeof(v_sources) <> 'array'
     OR jsonb_array_length(v_sources) > 10
     OR (p_required AND jsonb_array_length(v_sources) = 0) THEN
    RAISE EXCEPTION 'Invalid evidence sources for %', p_label USING ERRCODE = '22023';
  END IF;

  FOR v_source IN SELECT value FROM jsonb_array_elements(v_sources)
  LOOP
    IF jsonb_typeof(v_source) <> 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(v_source) AS keys(key)
         WHERE key NOT IN ('title', 'url', 'kind')
       )
       OR jsonb_typeof(v_source -> 'title') <> 'string'
       OR jsonb_typeof(v_source -> 'url') <> 'string'
       OR jsonb_typeof(v_source -> 'kind') <> 'string' THEN
      RAISE EXCEPTION 'Invalid evidence source for %', p_label USING ERRCODE = '22023';
    END IF;

    v_title := public.admin_validate_catalog_curation_text(
      v_source ->> 'title', 'evidence title', 200
    );
    v_url := public.admin_validate_catalog_curation_text(
      v_source ->> 'url', 'evidence URL', 2048
    );
    v_kind := public.admin_validate_catalog_curation_text(
      v_source ->> 'kind', 'evidence kind', 32
    );
    v_host := regexp_replace(
      lower(substring(v_url FROM '^https://([^/?#]+)')), ':[0-9]+$', ''
    );
    IF v_url !~ '^https://[^[:space:]<>]+$'
       OR v_host IS NULL
       OR v_host = ''
       OR v_host LIKE '%@%'
       OR v_host IN ('localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]')
       OR right(v_host, 10) = '.localhost'
       OR v_kind NOT IN (
         'official', 'publisher', 'licensor', 'institution', 'reputable_reference', 'other'
       ) THEN
      RAISE EXCEPTION 'Invalid evidence URL or kind for %', p_label USING ERRCODE = '22023';
    END IF;
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'title', v_title, 'url', v_url, 'kind', v_kind
    ));
  END LOOP;
  RETURN v_result;
END;
$character_sources$;

CREATE OR REPLACE FUNCTION public.admin_validate_catalog_character_editorial_profile(
  p_profile jsonb,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_profile$
DECLARE
  v_profile jsonb := COALESCE(p_profile, '{}'::jsonb);
  v_alias jsonb;
  v_characteristic jsonb;
  v_aliases jsonb := '[]'::jsonb;
  v_characteristics jsonb := '[]'::jsonb;
  v_alias_name text;
  v_characteristic_name text;
  v_slug text;
  v_biography text;
  v_age text;
  v_origin text;
  v_name_sources jsonb;
  v_franchise_sources jsonb;
  v_biography_sources jsonb;
  v_age_sources jsonb;
  v_origin_sources jsonb;
  v_reviewed boolean := p_status = 'reviewed';
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF jsonb_typeof(v_profile) <> 'object'
     OR p_status IS NULL
     OR p_status NOT IN ('draft', 'reviewed')
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(v_profile) AS keys(key)
       WHERE key NOT IN (
         'slug', 'aliases', 'biography', 'biographySources', 'ageContext',
         'ageSources', 'originWork', 'originWorkSources', 'characteristics',
         'nameSources', 'franchiseSources'
       )
     ) THEN
    RAISE EXCEPTION 'Invalid character editorial profile' USING ERRCODE = '22023';
  END IF;

  IF v_profile ? 'slug' AND jsonb_typeof(v_profile -> 'slug') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Invalid character slug' USING ERRCODE = '22023';
  END IF;
  v_slug := lower(public.admin_validate_catalog_curation_text(
    v_profile ->> 'slug', 'character slug', 120, false
  ));
  IF v_slug IS NOT NULL AND v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid character slug' USING ERRCODE = '22023';
  END IF;

  IF v_profile ? 'biography' AND jsonb_typeof(v_profile -> 'biography') <> 'string' THEN
    RAISE EXCEPTION 'Invalid character biography' USING ERRCODE = '22023';
  END IF;
  v_biography := public.admin_validate_catalog_curation_text(
    v_profile ->> 'biography', 'character biography', 6000, false
  );
  IF v_profile ? 'ageContext'
     AND jsonb_typeof(v_profile -> 'ageContext') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Invalid character age context' USING ERRCODE = '22023';
  END IF;
  v_age := public.admin_validate_catalog_curation_text(
    v_profile ->> 'ageContext', 'character age context', 500, false
  );
  IF v_profile ? 'originWork' AND jsonb_typeof(v_profile -> 'originWork') <> 'string' THEN
    RAISE EXCEPTION 'Invalid character origin work' USING ERRCODE = '22023';
  END IF;
  v_origin := public.admin_validate_catalog_curation_text(
    v_profile ->> 'originWork', 'character origin work', 240, v_reviewed
  );

  v_name_sources := public.admin_validate_catalog_character_editorial_sources(
    v_profile -> 'nameSources', 'character name', v_reviewed
  );
  v_franchise_sources := public.admin_validate_catalog_character_editorial_sources(
    v_profile -> 'franchiseSources', 'character franchise', v_reviewed
  );
  v_biography_sources := public.admin_validate_catalog_character_editorial_sources(
    v_profile -> 'biographySources', 'character biography',
    v_reviewed AND NULLIF(btrim(v_biography), '') IS NOT NULL
  );
  IF NULLIF(btrim(v_biography), '') IS NULL
     AND jsonb_array_length(v_biography_sources) > 0 THEN
    RAISE EXCEPTION 'Biography sources cannot be published without a biography'
      USING ERRCODE = '22023';
  END IF;
  v_age_sources := public.admin_validate_catalog_character_editorial_sources(
    v_profile -> 'ageSources', 'character age', v_reviewed AND v_age IS NOT NULL
  );
  v_origin_sources := public.admin_validate_catalog_character_editorial_sources(
    v_profile -> 'originWorkSources', 'character origin work', v_reviewed
  );

  IF jsonb_typeof(COALESCE(v_profile -> 'aliases', '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(v_profile -> 'aliases', '[]'::jsonb)) > 30
     OR jsonb_typeof(COALESCE(v_profile -> 'characteristics', '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(v_profile -> 'characteristics', '[]'::jsonb)) > 30 THEN
    RAISE EXCEPTION 'Invalid character aliases or characteristics' USING ERRCODE = '22023';
  END IF;

  FOR v_alias IN SELECT value FROM jsonb_array_elements(COALESCE(v_profile -> 'aliases', '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_alias) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_alias) AS keys(key)
         WHERE key NOT IN ('name', 'sources'))
       OR jsonb_typeof(v_alias -> 'name') <> 'string' THEN
      RAISE EXCEPTION 'Invalid character alias' USING ERRCODE = '22023';
    END IF;
    v_alias_name := public.admin_validate_catalog_curation_text(
      v_alias ->> 'name', 'character alias', 160
    );
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_aliases) AS prior(value)
      WHERE lower(prior.value ->> 'name') = lower(v_alias_name)) THEN
      RAISE EXCEPTION 'Duplicate character alias' USING ERRCODE = '22023';
    END IF;
    v_aliases := v_aliases || jsonb_build_array(jsonb_build_object(
      'name', v_alias_name,
      'sources', public.admin_validate_catalog_character_editorial_sources(
        v_alias -> 'sources', 'character alias', v_reviewed
      )
    ));
  END LOOP;

  FOR v_characteristic IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_profile -> 'characteristics', '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_characteristic) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_characteristic) AS keys(key)
         WHERE key NOT IN ('name', 'sources'))
       OR jsonb_typeof(v_characteristic -> 'name') <> 'string' THEN
      RAISE EXCEPTION 'Invalid character characteristic' USING ERRCODE = '22023';
    END IF;
    v_characteristic_name := public.admin_validate_catalog_curation_text(
      v_characteristic ->> 'name', 'character characteristic', 240
    );
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_characteristics) AS prior(value)
      WHERE lower(prior.value ->> 'name') = lower(v_characteristic_name)) THEN
      RAISE EXCEPTION 'Duplicate character characteristic' USING ERRCODE = '22023';
    END IF;
    v_characteristics := v_characteristics || jsonb_build_array(jsonb_build_object(
      'name', v_characteristic_name,
      'sources', public.admin_validate_catalog_character_editorial_sources(
        v_characteristic -> 'sources', 'character characteristic', v_reviewed
      )
    ));
  END LOOP;

  IF v_reviewed AND v_slug IS NULL THEN
    RAISE EXCEPTION 'Reviewed character profile requires a stable slug' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object(
    'slug', v_slug,
    'aliases', v_aliases,
    'biography', COALESCE(v_biography, ''),
    'biographySources', v_biography_sources,
    'ageContext', v_age,
    'ageSources', v_age_sources,
    'originWork', COALESCE(v_origin, ''),
    'originWorkSources', v_origin_sources,
    'characteristics', v_characteristics,
    'nameSources', v_name_sources,
    'franchiseSources', v_franchise_sources
  );
END;
$character_profile$;

CREATE OR REPLACE FUNCTION public.admin_get_catalog_character_editorial_profile(
  p_identity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_profile_get$
DECLARE
  v_identity public.catalog_character_identities%ROWTYPE;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  SELECT * INTO v_identity
  FROM public.catalog_character_identities
  WHERE id = p_identity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character identity not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'identityId', v_identity.id,
    'name', v_identity.character_name,
    'franchise', v_identity.franchise,
    'profile', v_identity.editorial_profile,
    'status', v_identity.editorial_profile_status,
    'revision', v_identity.editorial_profile_revision,
    'reviewedAt', v_identity.editorial_profile_reviewed_at,
    'reviewedBy', v_identity.editorial_profile_reviewed_by,
    'history', v_identity.editorial_profile_history
  );
END;
$character_profile_get$;

CREATE OR REPLACE FUNCTION public.admin_save_catalog_character_editorial_profile(
  p_identity_id uuid,
  p_profile jsonb,
  p_status text,
  p_expected_revision integer,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_profile_save$
DECLARE
  v_identity public.catalog_character_identities%ROWTYPE;
  v_profile jsonb;
  v_reviewed_at timestamptz;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF p_identity_id IS NULL OR p_status IS NULL
     OR p_status NOT IN ('draft', 'reviewed')
     OR p_expected_revision IS NULL OR p_expected_revision < 0
     OR (p_status = 'reviewed' AND p_reviewer_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid character profile review request' USING ERRCODE = '22023';
  END IF;
  v_profile := public.admin_validate_catalog_character_editorial_profile(p_profile, p_status);

  SELECT * INTO v_identity
  FROM public.catalog_character_identities
  WHERE id = p_identity_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character identity not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_identity.editorial_profile_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Character editorial profile changed; reload before saving'
      USING ERRCODE = '40001';
  END IF;

  IF p_status = 'reviewed' AND EXISTS (
    SELECT 1 FROM public.catalog_character_identities ci
    WHERE ci.id <> p_identity_id
      AND ci.editorial_profile_status = 'reviewed'
      AND ci.editorial_profile ->> 'slug' = v_profile ->> 'slug'
  ) THEN
    RAISE EXCEPTION 'Reviewed character slug already exists' USING ERRCODE = '23505';
  END IF;

  v_reviewed_at := CASE WHEN p_status = 'reviewed' THEN now() ELSE NULL END;
  UPDATE public.catalog_character_identities
  SET editorial_profile_history = CASE WHEN editorial_profile_revision = 0
        THEN editorial_profile_history
        ELSE (
          SELECT COALESCE(jsonb_agg(recent.value ORDER BY recent.ordinality), '[]'::jsonb)
          FROM (
            SELECT history.value, history.ordinality
            FROM jsonb_array_elements(editorial_profile_history || jsonb_build_array(jsonb_build_object(
              'revision', editorial_profile_revision,
              'status', editorial_profile_status,
              'profile', editorial_profile,
              'reviewedAt', editorial_profile_reviewed_at,
              'reviewedBy', editorial_profile_reviewed_by,
              'savedAt', now()
            ))) WITH ORDINALITY AS history(value, ordinality)
            ORDER BY history.ordinality DESC
            LIMIT 25
          ) recent
        )
      END,
      editorial_profile = v_profile,
      editorial_profile_status = p_status,
      editorial_profile_revision = editorial_profile_revision + 1,
      editorial_profile_reviewed_at = v_reviewed_at,
      editorial_profile_reviewed_by = CASE WHEN p_status = 'reviewed' THEN p_reviewer_id ELSE NULL END,
      updated_at = now()
  WHERE id = p_identity_id
  RETURNING * INTO v_identity;

  RETURN jsonb_build_object(
    'identityId', v_identity.id,
    'name', v_identity.character_name,
    'franchise', v_identity.franchise,
    'profile', v_identity.editorial_profile,
    'status', v_identity.editorial_profile_status,
    'revision', v_identity.editorial_profile_revision,
    'reviewedAt', v_identity.editorial_profile_reviewed_at,
    'reviewedBy', v_identity.editorial_profile_reviewed_by
  );
END;
$character_profile_save$;

REVOKE ALL ON FUNCTION public.admin_validate_catalog_character_editorial_sources(jsonb, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_validate_catalog_character_editorial_profile(jsonb, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_catalog_character_editorial_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_catalog_character_editorial_profile(uuid, jsonb, text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_validate_catalog_character_editorial_sources(jsonb, text, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_validate_catalog_character_editorial_profile(jsonb, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_catalog_character_editorial_profile(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_catalog_character_editorial_profile(uuid, jsonb, text, integer, uuid)
  TO service_role;

COMMENT ON COLUMN public.catalog_character_identities.editorial_profile IS
  'Private source-backed character facts and stable route slug. Reviewed here does not publish; public availability requires the separately approved Worker projection.';
COMMENT ON COLUMN public.catalog_character_identities.editorial_profile_history IS
  'Last 25 private editorial profile revisions, retained on the canonical character identity.';

NOTIFY pgrst, 'reload schema';
COMMIT;
