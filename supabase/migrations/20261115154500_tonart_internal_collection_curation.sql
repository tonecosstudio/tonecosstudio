-- TONART internal catalog curation.
-- Reuses public.collections and canonical catalog identifiers without copying D1/R2.
-- Internal curation is private by default and never activates a commercial offer.
BEGIN;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS collection_kind text NOT NULL DEFAULT 'commercial',
  ADD COLUMN IF NOT EXISTS curation_visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_collection_kind_valid,
  ADD CONSTRAINT collections_collection_kind_valid
    CHECK (collection_kind IN ('commercial', 'internal', 'hybrid')) NOT VALID,
  DROP CONSTRAINT IF EXISTS collections_curation_visibility_valid,
  ADD CONSTRAINT collections_curation_visibility_valid
    CHECK (curation_visibility IN ('public', 'private')) NOT VALID,
  DROP CONSTRAINT IF EXISTS collections_internal_private_inactive,
  ADD CONSTRAINT collections_internal_private_inactive
    CHECK (
      collection_kind <> 'internal'
      OR (
        curation_visibility = 'private'
        AND is_active = false
        AND status <> 'active'::public.collection_status
      )
    ) NOT VALID;

CREATE OR REPLACE FUNCTION public.guard_internal_collection_tier_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $guard$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.collections c
     WHERE c.id = NEW.collection_id
       AND c.collection_kind = 'internal'
  ) THEN
    RAISE EXCEPTION 'Internal collection cannot receive commercial pricing tier'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS guard_internal_collection_tier_assignment
  ON public.collection_tier_assignments;

CREATE TRIGGER guard_internal_collection_tier_assignment
BEFORE INSERT OR UPDATE OF collection_id
ON public.collection_tier_assignments
FOR EACH ROW
EXECUTE FUNCTION public.guard_internal_collection_tier_assignment();
CREATE TABLE IF NOT EXISTS public.catalog_character_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL UNIQUE,
  character_name text NOT NULL,
  franchise text NOT NULL,
  evidence_origin text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_character_identity_key_valid
    CHECK (length(identity_key) BETWEEN 3 AND 520 AND identity_key !~ '[[:cntrl:]<>]'),
  CONSTRAINT catalog_character_identity_name_valid
    CHECK (length(character_name) BETWEEN 1 AND 160 AND character_name !~ '[[:cntrl:]<>]'),
  CONSTRAINT catalog_character_identity_franchise_valid
    CHECK (length(franchise) BETWEEN 1 AND 160 AND franchise !~ '[[:cntrl:]<>]'),
  CONSTRAINT catalog_character_identity_origin_valid
    CHECK (length(evidence_origin) BETWEEN 3 AND 240 AND evidence_origin !~ '[[:cntrl:]<>]')
);

CREATE TABLE IF NOT EXISTS public.catalog_curation_model_profiles (
  catalog_model_id text PRIMARY KEY,
  catalog_model_slug text NOT NULL UNIQUE,
  character_identity_id uuid REFERENCES public.catalog_character_identities(id) ON DELETE SET NULL,
  identity_verified boolean NOT NULL DEFAULT false,
  identity_evidence_origin text,
  identity_evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_curation_model_id_valid
    CHECK (length(catalog_model_id) BETWEEN 1 AND 160 AND catalog_model_id !~ '[[:cntrl:]<>[:space:]]'),
  CONSTRAINT catalog_curation_model_slug_valid
    CHECK (catalog_model_slug ~ '^[a-z0-9][a-z0-9-]{0,239}$'),
  CONSTRAINT catalog_curation_verified_identity_valid
    CHECK (
      (identity_verified = false AND character_identity_id IS NULL)
      OR
      (
        identity_verified = true
        AND character_identity_id IS NOT NULL
        AND identity_evidence_origin IS NOT NULL
        AND length(identity_evidence_origin) BETWEEN 3 AND 240
      )
    )
);

CREATE TABLE IF NOT EXISTS public.catalog_curation_tags (
  id uuid PRIMARY KEY,
  dimension text NOT NULL,
  slug text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  definition_origin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_curation_tag_dimension_valid
    CHECK (dimension IN ('theme_genre', 'characteristic', 'narrative_role')),
  CONSTRAINT catalog_curation_tag_slug_valid
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  CONSTRAINT catalog_curation_tag_label_valid
    CHECK (length(label) BETWEEN 1 AND 120 AND label !~ '[[:cntrl:]<>]'),
  CONSTRAINT catalog_curation_tag_status_valid
    CHECK (status IN ('active', 'deprecated')),
  CONSTRAINT catalog_curation_tag_origin_valid
    CHECK (length(definition_origin) BETWEEN 3 AND 240 AND definition_origin !~ '[[:cntrl:]<>]'),
  UNIQUE (dimension, slug)
);

CREATE TABLE IF NOT EXISTS public.catalog_curation_tag_aliases (
  dimension text NOT NULL,
  alias_slug text NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.catalog_curation_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dimension, alias_slug),
  CONSTRAINT catalog_curation_tag_alias_dimension_valid
    CHECK (dimension IN ('theme_genre', 'characteristic', 'narrative_role')),
  CONSTRAINT catalog_curation_tag_alias_slug_valid
    CHECK (alias_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

CREATE OR REPLACE FUNCTION public.guard_catalog_curation_tag_alias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $tagalias$
DECLARE
  v_dimension text;
  v_slug text;
BEGIN
  SELECT t.dimension, t.slug
    INTO v_dimension, v_slug
  FROM public.catalog_curation_tags t
  WHERE t.id = NEW.tag_id;

  IF v_dimension IS NULL THEN
    RAISE EXCEPTION 'Curation tag not found' USING ERRCODE = 'P0002';
  END IF;
  IF NEW.dimension <> v_dimension THEN
    RAISE EXCEPTION 'Curation alias dimension must match tag dimension'
      USING ERRCODE = '22023';
  END IF;
  IF NEW.alias_slug = v_slug OR EXISTS (
    SELECT 1
    FROM public.catalog_curation_tags t
    WHERE t.dimension = NEW.dimension
      AND t.slug = NEW.alias_slug
  ) THEN
    RAISE EXCEPTION 'Curation alias collides with canonical tag slug'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$tagalias$;

DROP TRIGGER IF EXISTS guard_catalog_curation_tag_alias
  ON public.catalog_curation_tag_aliases;

CREATE TRIGGER guard_catalog_curation_tag_alias
BEFORE INSERT OR UPDATE OF dimension, alias_slug, tag_id
ON public.catalog_curation_tag_aliases
FOR EACH ROW
EXECUTE FUNCTION public.guard_catalog_curation_tag_alias();
CREATE OR REPLACE FUNCTION public.guard_catalog_curation_tag_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $tagslug$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.catalog_curation_tag_aliases a
    WHERE a.dimension = NEW.dimension
      AND a.alias_slug = NEW.slug
  ) THEN
    RAISE EXCEPTION 'Canonical curation tag slug collides with existing alias'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$tagslug$;

DROP TRIGGER IF EXISTS guard_catalog_curation_tag_slug
  ON public.catalog_curation_tags;

CREATE TRIGGER guard_catalog_curation_tag_slug
BEFORE INSERT OR UPDATE OF dimension, slug
ON public.catalog_curation_tags
FOR EACH ROW
EXECUTE FUNCTION public.guard_catalog_curation_tag_slug();
CREATE TABLE IF NOT EXISTS public.catalog_collection_curation (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  catalog_model_id text NOT NULL REFERENCES public.catalog_curation_model_profiles(catalog_model_id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'suggested',
  evidence_origin text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, catalog_model_id),
  CONSTRAINT catalog_collection_curation_state_valid
    CHECK (state IN ('suggested', 'approved', 'selected_for_offer', 'discarded')),
  CONSTRAINT catalog_collection_curation_origin_valid
    CHECK (length(evidence_origin) BETWEEN 3 AND 240 AND evidence_origin !~ '[[:cntrl:]<>]')
);

CREATE INDEX IF NOT EXISTS idx_catalog_collection_curation_state
  ON public.catalog_collection_curation(collection_id, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.catalog_curation_model_tags (
  catalog_model_id text NOT NULL REFERENCES public.catalog_curation_model_profiles(catalog_model_id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.catalog_curation_tags(id) ON DELETE RESTRICT,
  review_state text NOT NULL DEFAULT 'suggested',
  evidence_origin text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (catalog_model_id, tag_id),
  CONSTRAINT catalog_curation_model_tag_state_valid
    CHECK (review_state IN ('suggested', 'approved', 'discarded')),
  CONSTRAINT catalog_curation_model_tag_origin_valid
    CHECK (length(evidence_origin) BETWEEN 3 AND 240 AND evidence_origin !~ '[[:cntrl:]<>]')
);

CREATE INDEX IF NOT EXISTS idx_catalog_curation_model_tags_tag
  ON public.catalog_curation_model_tags(tag_id, review_state, updated_at DESC);

-- The first controlled vocabulary is owner-provided. No model is classified here.
INSERT INTO public.catalog_curation_tags (
  id, dimension, slug, label, status, definition_origin
)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'theme_genre',
    'terror',
    'Terror',
    'active',
    'owner_request:2026-11-15'
  ),
  (
    '33333333-3333-4333-8333-333333333301',
    'narrative_role',
    'antagonista',
    'Antagonista',
    'active',
    'owner_request:2026-11-15'
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.catalog_character_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_curation_model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_curation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_curation_tag_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_collection_curation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_curation_model_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_character_identities_admin_read
  ON public.catalog_character_identities FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY catalog_curation_model_profiles_admin_read
  ON public.catalog_curation_model_profiles FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY catalog_curation_tags_admin_read
  ON public.catalog_curation_tags FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY catalog_curation_tag_aliases_admin_read
  ON public.catalog_curation_tag_aliases FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY catalog_collection_curation_admin_read
  ON public.catalog_collection_curation FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY catalog_curation_model_tags_admin_read
  ON public.catalog_curation_model_tags FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_character_identities FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_curation_model_profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_curation_tags FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_curation_tag_aliases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_collection_curation FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.catalog_curation_model_tags FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_validate_catalog_curation_text(
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

CREATE OR REPLACE FUNCTION public.admin_validate_catalog_model_reference(
  p_model_id text,
  p_model_slug text
)
RETURNS TABLE(model_id text, model_slug text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text := NULLIF(btrim(COALESCE(p_model_id, '')), '');
  v_slug text := lower(NULLIF(btrim(COALESCE(p_model_slug, '')), ''));
BEGIN
  IF v_id IS NULL OR length(v_id) > 160 OR v_id ~ '[[:cntrl:]<>[:space:]]' THEN
    RAISE EXCEPTION 'Invalid canonical model id' USING ERRCODE = '22023';
  END IF;
  IF v_slug IS NULL OR v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$' THEN
    RAISE EXCEPTION 'Invalid canonical model slug' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT v_id, v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_internal_collections()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'collectionKind', c.collection_kind,
        'curationVisibility', c.curation_visibility,
        'isActive', c.is_active,
        'status', c.status::text
      )
      ORDER BY c.name
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.collections c
  WHERE c.collection_kind IN ('internal', 'hybrid');
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ensure_internal_collection(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_slug text;
  v_description text;
  v_existing public.collections%ROWTYPE;
  v_created jsonb;
  v_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  v_name := public.admin_validate_collection_text(p_name, 'collection name', 160);
  v_slug := lower(public.admin_validate_collection_text(p_slug, 'collection slug', 120));
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid collection slug' USING ERRCODE = '22023';
  END IF;
  v_description := public.admin_validate_collection_text(
    p_description,
    'collection description',
    2000,
    false
  );

  PERFORM pg_advisory_xact_lock(hashtext('tonart-internal-collection:' || v_slug));

  SELECT * INTO v_existing
  FROM public.collections
  WHERE slug = v_slug
  ORDER BY created_at
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- A template must not silently reclassify an existing commercial offer.
    -- Only already-internal or explicitly established hybrid collections can be reused.
    IF v_existing.collection_kind = 'commercial' THEN
      RAISE EXCEPTION 'Commercial collection slug is reserved; cannot silently convert it to internal curation'
        USING ERRCODE = '22023';
    END IF;
    IF v_existing.collection_kind NOT IN ('internal', 'hybrid') THEN
      RAISE EXCEPTION 'Invalid collection kind for editorial reuse'
        USING ERRCODE = '22023';
    END IF;
    IF v_existing.curation_visibility <> 'private' THEN
      UPDATE public.collections
         SET curation_visibility = 'private', updated_at = now()
       WHERE id = v_existing.id
       RETURNING * INTO v_existing;
    END IF;
    v_id := v_existing.id;
  ELSE
    v_created := public.admin_create_collection(
      jsonb_build_object(
        'name', v_name,
        'slug', v_slug,
        'description', v_description,
        'is_active', false,
        'rotation_type', 'fixed'
      )
    );
    v_id := (v_created->>'id')::uuid;
    UPDATE public.collections
       SET collection_kind = 'internal',
           curation_visibility = 'private',
           is_active = false,
           status = 'draft',
           updated_at = now()
     WHERE id = v_id
     RETURNING * INTO v_existing;
  END IF;

  RETURN jsonb_build_object(
    'id', v_existing.id,
    'name', v_existing.name,
    'slug', v_existing.slug,
    'collectionKind', v_existing.collection_kind,
    'curationVisibility', v_existing.curation_visibility,
    'isActive', v_existing.is_active,
    'status', v_existing.status::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_catalog_curation_tags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'dimension', t.dimension,
        'slug', t.slug,
        'label', t.label,
        'status', t.status,
        'definitionOrigin', t.definition_origin,
        'aliases', COALESCE((
          SELECT jsonb_agg(a.alias_slug ORDER BY a.alias_slug)
          FROM public.catalog_curation_tag_aliases a
          WHERE a.tag_id = t.id
        ), '[]'::jsonb)
      )
      ORDER BY
        CASE t.dimension
          WHEN 'theme_genre' THEN 1
          WHEN 'characteristic' THEN 2
          ELSE 3
        END,
        t.label
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.catalog_curation_tags t;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_catalog_curation_tag_alias(
  p_tag_id uuid,
  p_alias_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $alias$
DECLARE
  v_dimension text;
  v_tag_slug text;
  v_status text;
  v_alias_slug text := lower(btrim(COALESCE(p_alias_slug, '')));
  v_existing_tag_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF length(v_alias_slug) < 1
     OR length(v_alias_slug) > 80
     OR left(v_alias_slug, 1) !~ '^[a-z0-9]'
     OR v_alias_slug ~ '[^a-z0-9-]' THEN
    RAISE EXCEPTION 'Invalid curation tag alias slug' USING ERRCODE = '22023';
  END IF;

  SELECT dimension, slug, status
    INTO v_dimension, v_tag_slug, v_status
  FROM public.catalog_curation_tags
  WHERE id = p_tag_id;

  IF v_dimension IS NULL THEN
    RAISE EXCEPTION 'Curation tag not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Curation tag is not active' USING ERRCODE = '22023';
  END IF;
  IF v_alias_slug = v_tag_slug OR EXISTS (
    SELECT 1
    FROM public.catalog_curation_tags t
    WHERE t.dimension = v_dimension
      AND t.slug = v_alias_slug
  ) THEN
    RAISE EXCEPTION 'Alias collides with canonical curation tag slug' USING ERRCODE = '22023';
  END IF;

  SELECT a.tag_id
    INTO v_existing_tag_id
  FROM public.catalog_curation_tag_aliases a
  WHERE a.dimension = v_dimension
    AND a.alias_slug = v_alias_slug;

  IF v_existing_tag_id IS NOT NULL AND v_existing_tag_id <> p_tag_id THEN
    RAISE EXCEPTION 'Alias already belongs to another curation tag' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.catalog_curation_tag_aliases (dimension, alias_slug, tag_id)
  VALUES (v_dimension, v_alias_slug, p_tag_id)
  ON CONFLICT (dimension, alias_slug) DO NOTHING;

  RETURN jsonb_build_object(
    'tagId', p_tag_id,
    'dimension', v_dimension,
    'aliasSlug', v_alias_slug
  );
END;
$alias$;
CREATE OR REPLACE FUNCTION public.admin_remove_catalog_curation_tag_alias(
  p_tag_id uuid,
  p_alias_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $removealias$
DECLARE
  v_alias_slug text := lower(btrim(COALESCE(p_alias_slug, '')));
  v_deleted integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF length(v_alias_slug) < 1
     OR length(v_alias_slug) > 80
     OR left(v_alias_slug, 1) !~ '^[a-z0-9]'
     OR v_alias_slug ~ '[^a-z0-9-]' THEN
    RAISE EXCEPTION 'Invalid curation tag alias slug' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.catalog_curation_tag_aliases
  WHERE tag_id = p_tag_id
    AND alias_slug = v_alias_slug;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'Curation tag alias not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'tagId', p_tag_id,
    'aliasSlug', v_alias_slug,
    'removed', true
  );
END;
$removealias$;
CREATE OR REPLACE FUNCTION public.admin_get_collection_curation_summary(
  p_collection_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kind text;
  v_model_count integer;
  v_distinct_characters integer;
  v_unverified integer;
  v_suggested integer;
  v_approved integer;
  v_selected integer;
  v_discarded integer;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT collection_kind INTO v_kind
  FROM public.collections
  WHERE id = p_collection_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_kind NOT IN ('internal', 'hybrid') THEN
    RAISE EXCEPTION 'Collection is not enabled for internal curation' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE cc.state <> 'discarded'),
    count(DISTINCT mp.character_identity_id)
      FILTER (WHERE cc.state <> 'discarded' AND mp.identity_verified = true),
    count(*) FILTER (WHERE cc.state <> 'discarded' AND mp.identity_verified = false),
    count(*) FILTER (WHERE cc.state = 'suggested'),
    count(*) FILTER (WHERE cc.state = 'approved'),
    count(*) FILTER (WHERE cc.state = 'selected_for_offer'),
    count(*) FILTER (WHERE cc.state = 'discarded')
  INTO
    v_model_count,
    v_distinct_characters,
    v_unverified,
    v_suggested,
    v_approved,
    v_selected,
    v_discarded
  FROM public.catalog_collection_curation cc
  JOIN public.catalog_curation_model_profiles mp
    ON mp.catalog_model_id = cc.catalog_model_id
  WHERE cc.collection_id = p_collection_id;

  RETURN jsonb_build_object(
    'modelCount', COALESCE(v_model_count, 0),
    'distinctVerifiedCharacterCount', COALESCE(v_distinct_characters, 0),
    'unverifiedModelCount', COALESCE(v_unverified, 0),
    'suggestedCount', COALESCE(v_suggested, 0),
    'approvedCount', COALESCE(v_approved, 0),
    'selectedForOfferCount', COALESCE(v_selected, 0),
    'discardedCount', COALESCE(v_discarded, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_collection_curation_page(
  p_collection_id uuid,
  p_state text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_tag_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kind text;
  v_state text := NULLIF(btrim(COALESCE(p_state, '')), '');
  v_total integer;
  v_items jsonb;
BEGIN
  PERFORM public.assert_admin_access();
  IF p_offset < 0 OR p_limit < 1 OR p_limit > 20 THEN
    RAISE EXCEPTION 'Invalid curation page bounds' USING ERRCODE = '22023';
  END IF;
  IF v_state IS NOT NULL
     AND v_state NOT IN ('suggested', 'approved', 'selected_for_offer', 'discarded') THEN
    RAISE EXCEPTION 'Invalid curation state' USING ERRCODE = '22023';
  END IF;

  SELECT collection_kind INTO v_kind
  FROM public.collections
  WHERE id = p_collection_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_kind NOT IN ('internal', 'hybrid') THEN
    RAISE EXCEPTION 'Collection is not enabled for internal curation' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.catalog_collection_curation cc
  WHERE cc.collection_id = p_collection_id
    AND (v_state IS NULL OR cc.state = v_state)
    AND (
      p_tag_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.catalog_curation_model_tags mt_filter
        WHERE mt_filter.catalog_model_id = cc.catalog_model_id
          AND mt_filter.tag_id = p_tag_id
          AND mt_filter.review_state <> 'discarded'
      )
    );

  SELECT COALESCE(jsonb_agg(row_payload ORDER BY ordinal), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      row_number() OVER (ORDER BY cc.updated_at DESC, cc.catalog_model_id) AS ordinal,
      jsonb_build_object(
        'modelId', cc.catalog_model_id,
        'slug', mp.catalog_model_slug,
        'state', cc.state,
        'evidenceOrigin', cc.evidence_origin,
        'evidenceNote', cc.evidence_note,
        'identityVerified', mp.identity_verified,
        'characterIdentityId', mp.character_identity_id,
        'tags', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'dimension', t.dimension,
              'slug', t.slug,
              'label', t.label,
              'reviewState', mt.review_state,
              'evidenceOrigin', mt.evidence_origin,
              'evidenceNote', mt.evidence_note
            )
            ORDER BY t.dimension, t.label
          )
          FROM public.catalog_curation_model_tags mt
          JOIN public.catalog_curation_tags t ON t.id = mt.tag_id
          WHERE mt.catalog_model_id = cc.catalog_model_id
            AND mt.review_state <> 'discarded'
        ), '[]'::jsonb)
      ) AS row_payload
    FROM public.catalog_collection_curation cc
    JOIN public.catalog_curation_model_profiles mp
      ON mp.catalog_model_id = cc.catalog_model_id
    WHERE cc.collection_id = p_collection_id
      AND (v_state IS NULL OR cc.state = v_state)
    AND (
      p_tag_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.catalog_curation_model_tags mt_filter
        WHERE mt_filter.catalog_model_id = cc.catalog_model_id
          AND mt_filter.tag_id = p_tag_id
          AND mt_filter.review_state <> 'discarded'
      )
    )
    ORDER BY cc.updated_at DESC, cc.catalog_model_id
    OFFSET p_offset
    LIMIT p_limit
  ) page_rows;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'offset', p_offset,
    'limit', p_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_collection_curation_models(
  p_collection_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kind text;
  v_item jsonb;
  v_id text;
  v_slug text;
  v_state text;
  v_origin text;
  v_note text;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Curation items must contain between 1 and 50 models' USING ERRCODE = '22023';
  END IF;

  SELECT collection_kind INTO v_kind
  FROM public.collections
  WHERE id = p_collection_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_kind NOT IN ('internal', 'hybrid') THEN
    RAISE EXCEPTION 'Collection is not enabled for internal curation' USING ERRCODE = '22023';
  END IF;

  -- Reject repeated canonical references atomically before any row is written.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item->>'modelId'
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item->>'slug'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate catalog model id or slug in curation batch'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT model_id, model_slug INTO v_id, v_slug
    FROM public.admin_validate_catalog_model_reference(
      v_item->>'modelId',
      v_item->>'slug'
    );
    v_state := NULLIF(btrim(COALESCE(v_item->>'state', '')), '');
    IF v_state NOT IN ('suggested', 'approved', 'selected_for_offer', 'discarded') THEN
      RAISE EXCEPTION 'Invalid curation state' USING ERRCODE = '22023';
    END IF;
    v_origin := public.admin_validate_catalog_curation_text(
      v_item->>'evidenceOrigin',
      'curation evidence origin',
      240
    );
    v_note := public.admin_validate_catalog_curation_text(
      v_item->>'evidenceNote',
      'curation evidence note',
      1000,
      false
    );
    IF lower(v_origin) LIKE 'automatic:%' THEN
      IF v_state <> 'suggested' THEN
        RAISE EXCEPTION 'Automatic classifications must remain suggestions' USING ERRCODE = '22023';
      END IF;
      IF v_note IS NULL THEN
        RAISE EXCEPTION 'Automatic curation requires a specific evidence note' USING ERRCODE = '22023';
      END IF;
    END IF;

    INSERT INTO public.catalog_curation_model_profiles (
      catalog_model_id,
      catalog_model_slug,
      updated_at
    )
    VALUES (v_id, v_slug, now())
    ON CONFLICT (catalog_model_id) DO UPDATE
      SET catalog_model_slug = EXCLUDED.catalog_model_slug,
          updated_at = now();

    INSERT INTO public.catalog_collection_curation (
      collection_id,
      catalog_model_id,
      state,
      evidence_origin,
      evidence_note,
      updated_at
    )
    VALUES (
      p_collection_id,
      v_id,
      v_state,
      v_origin,
      v_note,
      now()
    )
    ON CONFLICT (collection_id, catalog_model_id) DO UPDATE
      SET state = EXCLUDED.state,
          evidence_origin = EXCLUDED.evidence_origin,
          evidence_note = EXCLUDED.evidence_note,
          updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('id', p_collection_id, 'count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_catalog_model_identity(
  p_model_id text,
  p_model_slug text,
  p_character_name text,
  p_franchise text,
  p_evidence_origin text,
  p_evidence_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
  v_slug text;
  v_name text;
  v_franchise text;
  v_origin text;
  v_note text;
  v_identity_key text;
  v_identity_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT model_id, model_slug INTO v_id, v_slug
  FROM public.admin_validate_catalog_model_reference(p_model_id, p_model_slug);
  v_name := public.admin_validate_catalog_curation_text(
    p_character_name,
    'character name',
    160
  );
  v_franchise := public.admin_validate_catalog_curation_text(
    p_franchise,
    'franchise',
    160
  );
  v_origin := public.admin_validate_catalog_curation_text(
    p_evidence_origin,
    'identity evidence origin',
    240
  );
  v_note := public.admin_validate_catalog_curation_text(
    p_evidence_note,
    'identity evidence note',
    1000,
    false
  );
  IF lower(v_origin) LIKE 'automatic:%' THEN
    RAISE EXCEPTION 'Automatic identity cannot be marked as verified' USING ERRCODE = '22023';
  END IF;

  -- Length-prefix avoids ambiguous separators while keeping the stable key free of control chars.
  v_identity_key := length(v_franchise)::text || ':' || lower(v_franchise) || ':' || lower(v_name);

  INSERT INTO public.catalog_character_identities (
    identity_key,
    character_name,
    franchise,
    evidence_origin,
    evidence_note,
    updated_at
  )
  VALUES (
    v_identity_key,
    v_name,
    v_franchise,
    v_origin,
    v_note,
    now()
  )
  ON CONFLICT (identity_key) DO UPDATE
    SET character_name = EXCLUDED.character_name,
        franchise = EXCLUDED.franchise,
        evidence_origin = EXCLUDED.evidence_origin,
        evidence_note = EXCLUDED.evidence_note,
        updated_at = now()
  RETURNING id INTO v_identity_id;

  INSERT INTO public.catalog_curation_model_profiles (
    catalog_model_id,
    catalog_model_slug,
    character_identity_id,
    identity_verified,
    identity_evidence_origin,
    identity_evidence_note,
    updated_at
  )
  VALUES (
    v_id,
    v_slug,
    v_identity_id,
    true,
    v_origin,
    v_note,
    now()
  )
  ON CONFLICT (catalog_model_id) DO UPDATE
    SET catalog_model_slug = EXCLUDED.catalog_model_slug,
        character_identity_id = EXCLUDED.character_identity_id,
        identity_verified = true,
        identity_evidence_origin = EXCLUDED.identity_evidence_origin,
        identity_evidence_note = EXCLUDED.identity_evidence_note,
        updated_at = now();

  RETURN jsonb_build_object(
    'modelId', v_id,
    'identityId', v_identity_id,
    'verified', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_catalog_curation_tags(
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_id text;
  v_slug text;
  v_tag_id uuid;
  v_state text;
  v_origin text;
  v_note text;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Tag items must contain between 1 and 100 classifications' USING ERRCODE = '22023';
  END IF;

  -- Reject repeated canonical references atomically before any row is written.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item->>'modelId'
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item->>'slug'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate catalog model id or slug in curation batch'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT model_id, model_slug INTO v_id, v_slug
    FROM public.admin_validate_catalog_model_reference(
      v_item->>'modelId',
      v_item->>'slug'
    );
    BEGIN
      v_tag_id := (v_item->>'tagId')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid curation tag id' USING ERRCODE = '22023';
    END;
    IF NOT EXISTS (
      SELECT 1 FROM public.catalog_curation_tags
      WHERE id = v_tag_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Curation tag not found or inactive' USING ERRCODE = 'P0002';
    END IF;
    v_state := NULLIF(btrim(COALESCE(v_item->>'reviewState', '')), '');
    IF v_state NOT IN ('suggested', 'approved', 'discarded') THEN
      RAISE EXCEPTION 'Invalid classification review state' USING ERRCODE = '22023';
    END IF;
    v_origin := public.admin_validate_catalog_curation_text(
      v_item->>'evidenceOrigin',
      'classification evidence origin',
      240
    );
    v_note := public.admin_validate_catalog_curation_text(
      v_item->>'evidenceNote',
      'classification evidence note',
      1000,
      false
    );
    IF lower(v_origin) LIKE 'automatic:%' THEN
      IF v_state <> 'suggested' THEN
        RAISE EXCEPTION 'Automatic classifications must remain suggestions' USING ERRCODE = '22023';
      END IF;
      IF v_note IS NULL THEN
        RAISE EXCEPTION 'Automatic curation requires a specific evidence note' USING ERRCODE = '22023';
      END IF;
    END IF;

    INSERT INTO public.catalog_curation_model_profiles (
      catalog_model_id,
      catalog_model_slug,
      updated_at
    )
    VALUES (v_id, v_slug, now())
    ON CONFLICT (catalog_model_id) DO UPDATE
      SET catalog_model_slug = EXCLUDED.catalog_model_slug,
          updated_at = now();

    INSERT INTO public.catalog_curation_model_tags (
      catalog_model_id,
      tag_id,
      review_state,
      evidence_origin,
      evidence_note,
      updated_at
    )
    VALUES (
      v_id,
      v_tag_id,
      v_state,
      v_origin,
      v_note,
      now()
    )
    ON CONFLICT (catalog_model_id, tag_id) DO UPDATE
      SET review_state = EXCLUDED.review_state,
          evidence_origin = EXCLUDED.evidence_origin,
          evidence_note = EXCLUDED.evidence_note,
          updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_internal_collections() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_ensure_internal_collection(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_catalog_curation_tags() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_add_catalog_curation_tag_alias(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_remove_catalog_curation_tag_alias(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_collection_curation_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_collection_curation_page(uuid, text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_collection_curation_models(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_catalog_curation_tags(jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_internal_collections() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ensure_internal_collection(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_catalog_curation_tags() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_catalog_curation_tag_alias(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_catalog_curation_tag_alias(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_collection_curation_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_collection_curation_page(uuid, text, integer, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_collection_curation_models(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_catalog_curation_tags(jsonb) TO service_role;

COMMENT ON COLUMN public.collections.collection_kind IS
  'commercial=existing sellable collection; internal=private editorial grouping; hybrid=same collection row also used for internal curation.';
COMMENT ON COLUMN public.collections.curation_visibility IS
  'Visibility of editorial curation metadata only. It does not publish or hide the commercial collection.';
COMMENT ON TABLE public.catalog_collection_curation IS
  'Private editorial membership of canonical catalog models. selected_for_offer is not publication authorization and never mutates collections.catalog_model_slugs.';
COMMENT ON TABLE public.catalog_curation_model_tags IS
  'Controlled, reviewable classifications with provenance. Automatic sources may only create suggestions.';
COMMENT ON TABLE public.catalog_character_identities IS
  'Verified editorial grouping for multiple canonical sculptures/variants of the same character; catalog model fields remain authoritative in D1.';

NOTIFY pgrst, 'reload schema';
COMMIT;
