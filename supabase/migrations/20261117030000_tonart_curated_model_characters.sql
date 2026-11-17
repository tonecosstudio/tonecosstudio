-- TONART private editorial characters: atomic one-to-many cutover.
-- Stage with the matching frontend/service release. No D1/R2 or public changes.
BEGIN;

CREATE TABLE public.catalog_curation_model_characters (
  catalog_model_id text NOT NULL REFERENCES public.catalog_curation_model_profiles(catalog_model_id) ON DELETE CASCADE,
  character_identity_id uuid NOT NULL REFERENCES public.catalog_character_identities(id) ON DELETE RESTRICT,
  evidence_origin text NOT NULL CHECK (
    length(evidence_origin) BETWEEN 3 AND 240
    AND evidence_origin !~ '[[:cntrl:]<>]'
    AND lower(evidence_origin) NOT LIKE 'automatic:%'
  ),
  evidence_note text CHECK (
    evidence_note IS NULL OR
    (length(evidence_note) <= 1000 AND evidence_note !~ '[[:cntrl:]<>]')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (catalog_model_id, character_identity_id)
);

CREATE INDEX idx_catalog_curation_model_characters_identity
  ON public.catalog_curation_model_characters(character_identity_id, catalog_model_id);

ALTER TABLE public.catalog_curation_model_characters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.catalog_curation_model_characters
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.catalog_curation_model_characters TO service_role;

-- Preserve verified original links before removing the obsolete pointer.
INSERT INTO public.catalog_curation_model_characters (
  catalog_model_id, character_identity_id, evidence_origin, evidence_note,
  created_at, updated_at
)
SELECT catalog_model_id, character_identity_id, identity_evidence_origin,
       identity_evidence_note, created_at, updated_at
FROM public.catalog_curation_model_profiles
WHERE identity_verified = true;

DO $backfill$
DECLARE
  v_legacy bigint;
  v_links bigint;
BEGIN
  SELECT count(*) INTO v_legacy
  FROM public.catalog_curation_model_profiles WHERE identity_verified = true;
  SELECT count(*) INTO v_links
  FROM public.catalog_curation_model_characters;
  IF v_legacy <> v_links OR EXISTS (
    SELECT 1 FROM public.catalog_curation_model_profiles
    WHERE identity_verified = false
      AND (character_identity_id IS NOT NULL
        OR identity_evidence_origin IS NOT NULL OR identity_evidence_note IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Character link backfill was not lossless' USING ERRCODE = '23514';
  END IF;
END;
$backfill$;

-- Existing admin RPC names are preserved: no duplicate endpoint or writer.
CREATE OR REPLACE FUNCTION public.admin_get_collection_curation_summary(
  p_collection_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_model_count integer;
  v_distinct_characters integer;
  v_unverified integer;
  v_suggested integer;
  v_approved integer;
  v_selected integer;
  v_discarded integer;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF NOT EXISTS (
    SELECT 1 FROM public.tonart_editorial_collections WHERE id = p_collection_id
  ) THEN
    RAISE EXCEPTION 'Internal collection not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    count(*) FILTER (WHERE cc.state <> 'discarded'),
    count(*) FILTER (
      WHERE cc.state <> 'discarded'
        AND NOT EXISTS (
          SELECT 1 FROM public.catalog_curation_model_characters cmc
          WHERE cmc.catalog_model_id = cc.catalog_model_id
        )
    ),
    count(*) FILTER (WHERE cc.state = 'suggested'),
    count(*) FILTER (WHERE cc.state = 'approved'),
    count(*) FILTER (WHERE cc.state = 'selected_for_offer'),
    count(*) FILTER (WHERE cc.state = 'discarded')
  INTO
    v_model_count,
    v_unverified,
    v_suggested,
    v_approved,
    v_selected,
    v_discarded
  FROM public.catalog_collection_curation cc
  JOIN public.catalog_curation_model_profiles mp
    ON mp.catalog_model_id = cc.catalog_model_id
  WHERE cc.collection_id = p_collection_id;

  SELECT count(DISTINCT cmc.character_identity_id)
  INTO v_distinct_characters
  FROM public.catalog_collection_curation cc
  JOIN public.catalog_curation_model_characters cmc
    ON cmc.catalog_model_id = cc.catalog_model_id
  WHERE cc.collection_id = p_collection_id AND cc.state <> 'discarded';

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
  v_state text := NULLIF(btrim(COALESCE(p_state, '')), '');
  v_total integer;
  v_items jsonb;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF p_offset IS NULL OR p_limit IS NULL OR p_offset < 0 OR p_limit < 1 OR p_limit > 20 THEN
    RAISE EXCEPTION 'Invalid curation page bounds' USING ERRCODE = '22023';
  END IF;
  IF v_state IS NOT NULL
     AND v_state NOT IN ('suggested', 'approved', 'selected_for_offer', 'discarded') THEN
    RAISE EXCEPTION 'Invalid curation state' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tonart_editorial_collections WHERE id = p_collection_id
  ) THEN
    RAISE EXCEPTION 'Internal collection not found' USING ERRCODE = 'P0002';
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
        'characters', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ci.id,
              'name', ci.character_name,
              'franchise', ci.franchise,
              'evidenceOrigin', cmc.evidence_origin,
              'evidenceNote', cmc.evidence_note
            ) ORDER BY ci.franchise, ci.character_name, ci.id
          )
          FROM public.catalog_curation_model_characters cmc
          JOIN public.catalog_character_identities ci
            ON ci.id = cmc.character_identity_id
          WHERE cmc.catalog_model_id = cc.catalog_model_id
        ), '[]'::jsonb),
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
  PERFORM private_api.assert_tonart_curation_service_role();
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
  -- Preserve the first reviewed evidence on the shared identity. New evidence
  -- belongs to its model-character link; it must not rewrite other models.
  ON CONFLICT (identity_key) DO NOTHING
  RETURNING id INTO v_identity_id;

  IF v_identity_id IS NULL THEN
    SELECT id INTO STRICT v_identity_id
    FROM public.catalog_character_identities
    WHERE identity_key = v_identity_key;
  END IF;

  -- The catalog model remains a single canonical reference.
  INSERT INTO public.catalog_curation_model_profiles (
    catalog_model_id, catalog_model_slug, updated_at
  ) VALUES (v_id, v_slug, now())
  ON CONFLICT (catalog_model_id) DO UPDATE
    SET catalog_model_slug = EXCLUDED.catalog_model_slug, updated_at = now();

  -- Lock the model row so the 12-link bound is safe under concurrent reviews.
  PERFORM 1 FROM public.catalog_curation_model_profiles
    WHERE catalog_model_id = v_id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_curation_model_characters
    WHERE catalog_model_id = v_id AND character_identity_id = v_identity_id
  ) AND (
    SELECT count(*) FROM public.catalog_curation_model_characters
    WHERE catalog_model_id = v_id
  ) >= 12 THEN
    RAISE EXCEPTION 'Maximum 12 verified characters per model' USING ERRCODE = '22023';
  END IF;

  -- An additional verified character never overwrites an existing link.
  INSERT INTO public.catalog_curation_model_characters (
    catalog_model_id, character_identity_id, evidence_origin, evidence_note, updated_at
  ) VALUES (v_id, v_identity_id, v_origin, v_note, now())
  ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE
    SET evidence_origin = EXCLUDED.evidence_origin,
        evidence_note = EXCLUDED.evidence_note,
        updated_at = now();

  RETURN jsonb_build_object(
    'modelId', v_id,
    'identityId', v_identity_id,
    'verified', true
  );
END;
$$;


-- Detach one verified model-character link without deleting the shared identity.
-- A stale model reference or absent link must fail, never report fake success.
CREATE OR REPLACE FUNCTION public.admin_unlink_catalog_model_character(
  p_model_id text,
  p_model_slug text,
  p_character_identity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
DECLARE
  v_model_id text;
  v_model_slug text;
  v_deleted integer;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF p_character_identity_id IS NULL THEN
    RAISE EXCEPTION 'Character identity is required' USING ERRCODE = '22023';
  END IF;
  SELECT model_id, model_slug INTO v_model_id, v_model_slug
  FROM public.admin_validate_catalog_model_reference(p_model_id, p_model_slug);

  -- An orphaned catalog model can be cleaned up using its exact stored
  -- reference, but no mismatched or stale slug can remove a different link.
  PERFORM 1
  FROM public.catalog_curation_model_profiles
  WHERE catalog_model_id = v_model_id AND catalog_model_slug = v_model_slug
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical curation model reference mismatch' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_id
    AND character_identity_id = p_character_identity_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'Verified character link not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'modelId', v_model_id,
    'identityId', p_character_identity_id,
    'removed', true
  );
END;
$;

REVOKE ALL ON FUNCTION public.admin_get_collection_curation_summary(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_collection_curation_page(uuid, text, integer, integer, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_collection_curation_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_collection_curation_page(uuid, text, integer, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_unlink_catalog_model_character(text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_catalog_model_character(text, text, uuid)
  TO service_role;

-- No parallel identity source or legacy compatibility columns after cutover.
ALTER TABLE public.catalog_curation_model_profiles
  DROP CONSTRAINT catalog_curation_verified_identity_valid,
  DROP COLUMN character_identity_id,
  DROP COLUMN identity_verified,
  DROP COLUMN identity_evidence_origin,
  DROP COLUMN identity_evidence_note;

COMMENT ON TABLE public.catalog_curation_model_characters IS
  'Private reviewed links between canonical catalog model IDs and character identities. Not a public catalog or commercial offer.';

NOTIFY pgrst, 'reload schema';
COMMIT;
