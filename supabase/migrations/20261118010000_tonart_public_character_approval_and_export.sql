-- Public character publication is a separate human decision from private review.
-- It extends the one canonical identity and exports only its current approved revision.
BEGIN;

ALTER TABLE public.catalog_character_identities
  ADD COLUMN editorial_publication_status text NOT NULL DEFAULT 'not_approved',
  ADD COLUMN editorial_publication_revision integer,
  ADD COLUMN editorial_publication_approval_ref text,
  ADD COLUMN editorial_publication_approved_at timestamptz,
  ADD COLUMN editorial_publication_approved_by uuid,
  ADD COLUMN editorial_publication_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT catalog_character_publication_status
    CHECK (editorial_publication_status IN ('not_approved', 'approved')),
  ADD CONSTRAINT catalog_character_publication_revision
    CHECK (editorial_publication_revision IS NULL OR editorial_publication_revision >= 0),
  ADD CONSTRAINT catalog_character_publication_history
    CHECK (jsonb_typeof(editorial_publication_history) = 'array'
      AND jsonb_array_length(editorial_publication_history) <= 25),
  ADD CONSTRAINT catalog_character_publication_state
    CHECK (
      (editorial_publication_status = 'not_approved'
        AND editorial_publication_revision IS NULL
        AND editorial_publication_approval_ref IS NULL
        AND editorial_publication_approved_at IS NULL
        AND editorial_publication_approved_by IS NULL)
      OR
      (editorial_publication_status = 'approved'
        AND editorial_profile_status = 'reviewed'
        AND editorial_publication_revision = editorial_profile_revision
        AND editorial_publication_approval_ref IS NOT NULL
        AND editorial_publication_approved_at IS NOT NULL
        AND editorial_publication_approved_by IS NOT NULL)
    );

-- Any content edit invalidates the previous public approval in the same row
-- update, while retaining a bounded audit entry for the former approval.
CREATE OR REPLACE FUNCTION private_api.invalidate_tonart_character_publication_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_temp
AS $publication_invalidation$
BEGIN
  IF NEW.editorial_profile_revision IS DISTINCT FROM OLD.editorial_profile_revision
     AND OLD.editorial_publication_status = 'approved' THEN
    SELECT COALESCE(jsonb_agg(recent.value ORDER BY recent.ordinality), '[]'::jsonb)
    INTO NEW.editorial_publication_history
    FROM (
      SELECT history.value, history.ordinality
      FROM jsonb_array_elements(OLD.editorial_publication_history || jsonb_build_array(
        jsonb_build_object(
          'action', 'invalidated_by_profile_change',
          'approvalRef', OLD.editorial_publication_approval_ref,
          'approvedRevision', OLD.editorial_publication_revision,
          'approvedAt', OLD.editorial_publication_approved_at,
          'approvedBy', OLD.editorial_publication_approved_by,
          'nextProfileRevision', NEW.editorial_profile_revision,
          'at', now()
        )
      )) WITH ORDINALITY AS history(value, ordinality)
      ORDER BY history.ordinality DESC
      LIMIT 25
    ) recent;
    NEW.editorial_publication_status := 'not_approved';
    NEW.editorial_publication_revision := NULL;
    NEW.editorial_publication_approval_ref := NULL;
    NEW.editorial_publication_approved_at := NULL;
    NEW.editorial_publication_approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$publication_invalidation$;

CREATE TRIGGER trg_catalog_character_publication_invalidated_by_profile_change
  BEFORE UPDATE OF editorial_profile_revision ON public.catalog_character_identities
  FOR EACH ROW
  EXECUTE FUNCTION private_api.invalidate_tonart_character_publication_on_profile_change();

REVOKE ALL ON FUNCTION private_api.invalidate_tonart_character_publication_on_profile_change()
  FROM PUBLIC, anon, authenticated;

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
    'history', v_identity.editorial_profile_history,
    'publicationStatus', v_identity.editorial_publication_status,
    'publicationRevision', v_identity.editorial_publication_revision,
    'publicationApprovalRef', v_identity.editorial_publication_approval_ref,
    'publicationApprovedAt', v_identity.editorial_publication_approved_at,
    'publicationApprovedBy', v_identity.editorial_publication_approved_by,
    'publicationHistory', v_identity.editorial_publication_history
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
    'reviewedBy', v_identity.editorial_profile_reviewed_by,
    'history', v_identity.editorial_profile_history,
    'publicationStatus', v_identity.editorial_publication_status,
    'publicationRevision', v_identity.editorial_publication_revision,
    'publicationApprovalRef', v_identity.editorial_publication_approval_ref,
    'publicationApprovedAt', v_identity.editorial_publication_approved_at,
    'publicationApprovedBy', v_identity.editorial_publication_approved_by,
    'publicationHistory', v_identity.editorial_publication_history
  );
END;
$character_profile_save$;

REVOKE ALL ON FUNCTION public.admin_get_catalog_character_editorial_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_catalog_character_editorial_profile(uuid, jsonb, text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_catalog_character_editorial_profile(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_catalog_character_editorial_profile(uuid, jsonb, text, integer, uuid)
  TO service_role;

-- Reusing the canonical identity writer also lets an editor attach real
-- citation data to a previously manual-only link. Prior evidence is appended
-- to the same bounded relation history before an explicit replacement.
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
AS $verify_catalog_model_identity$
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
  v_name := public.admin_validate_catalog_curation_text(p_character_name, 'character name', 160);
  v_franchise := public.admin_validate_catalog_curation_text(p_franchise, 'franchise', 160);
  v_origin := public.admin_validate_catalog_curation_text(p_evidence_origin, 'identity evidence origin', 240);
  v_note := public.admin_validate_catalog_curation_text(p_evidence_note, 'identity evidence note', 1000, false);
  IF lower(v_origin) LIKE 'automatic:%' THEN
    RAISE EXCEPTION 'Automatic identity cannot be marked as verified' USING ERRCODE = '22023';
  END IF;

  v_identity_key := length(v_franchise)::text || ':' || lower(v_franchise) || ':' || lower(v_name);
  INSERT INTO public.catalog_character_identities (
    identity_key, character_name, franchise, evidence_origin, evidence_note, updated_at
  ) VALUES (v_identity_key, v_name, v_franchise, v_origin, v_note, now())
  ON CONFLICT (identity_key) DO NOTHING
  RETURNING id INTO v_identity_id;
  IF v_identity_id IS NULL THEN
    SELECT id INTO STRICT v_identity_id
    FROM public.catalog_character_identities
    WHERE identity_key = v_identity_key;
  END IF;

  INSERT INTO public.catalog_curation_model_profiles (
    catalog_model_id, catalog_model_slug, updated_at
  ) VALUES (v_id, v_slug, now())
  ON CONFLICT (catalog_model_id) DO UPDATE
    SET catalog_model_slug = EXCLUDED.catalog_model_slug, updated_at = now();

  INSERT INTO public.catalog_curation_model_characters (
    catalog_model_id, character_identity_id, evidence_origin, evidence_note, updated_at
  ) VALUES (v_id, v_identity_id, v_origin, v_note, now())
  ON CONFLICT (catalog_model_id, character_identity_id) DO UPDATE
    SET review_history = public.catalog_curation_model_characters.review_history ||
          jsonb_build_array(jsonb_build_object(
            'action', CASE WHEN public.catalog_curation_model_characters.unlinked_at IS NULL
              THEN 'evidence_updated' ELSE 'restored' END,
            'at', now(),
            'previousOrigin', public.catalog_curation_model_characters.evidence_origin,
            'previousNote', public.catalog_curation_model_characters.evidence_note,
            'origin', EXCLUDED.evidence_origin,
            'note', EXCLUDED.evidence_note
          )),
        evidence_origin = EXCLUDED.evidence_origin,
        evidence_note = EXCLUDED.evidence_note,
        unlinked_at = NULL,
        unlink_reason = NULL,
        updated_at = now()
    WHERE public.catalog_curation_model_characters.unlinked_at IS NOT NULL
       OR (
         public.catalog_curation_model_characters.evidence_origin !~ '^https://[^[:space:]<>]+$'
         AND EXCLUDED.evidence_origin ~ '^https://[^[:space:]<>]+$'
         AND EXCLUDED.evidence_note IS NOT NULL
         AND btrim(EXCLUDED.evidence_note) <> ''
       )
       OR (
         public.catalog_curation_model_characters.evidence_note IS NULL
         AND EXCLUDED.evidence_origin ~ '^https://[^[:space:]<>]+$'
         AND EXCLUDED.evidence_note IS NOT NULL
         AND btrim(EXCLUDED.evidence_note) <> ''
       );

  RETURN jsonb_build_object('modelId', v_id, 'identityId', v_identity_id, 'verified', true);
END;
$verify_catalog_model_identity$;

REVOKE ALL ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_catalog_model_identity(text, text, text, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_catalog_character_publication_approval(
  p_identity_id uuid,
  p_expected_revision integer,
  p_approved boolean,
  p_approver_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_publication_approval$
DECLARE
  v_identity public.catalog_character_identities%ROWTYPE;
  v_approved_at timestamptz;
  v_approval_ref text;
  v_profile jsonb;
  v_missing_relation_proof boolean;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();
  IF p_identity_id IS NULL OR p_expected_revision IS NULL
     OR p_expected_revision < 0 OR p_approved IS NULL
     OR (p_approved AND p_approver_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid character publication approval request'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_identity
  FROM public.catalog_character_identities
  WHERE id = p_identity_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character identity not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_identity.editorial_profile_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Character editorial profile changed; reload before approving'
      USING ERRCODE = '40001';
  END IF;

  IF p_approved THEN
    IF v_identity.editorial_profile_status <> 'reviewed'
       OR v_identity.editorial_profile_reviewed_at IS NULL
       OR v_identity.editorial_profile_reviewed_by IS NULL THEN
      RAISE EXCEPTION 'Only a reviewed character profile can be approved for publication'
        USING ERRCODE = '22023';
    END IF;
    v_profile := public.admin_validate_catalog_character_editorial_profile(
      v_identity.editorial_profile, 'reviewed'
    );

    -- The independent source for each public claim must support that claim;
    -- catalog labels alone are provenance, not identity or biography evidence.
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'nameSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'franchiseSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'biographySources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'originWorkSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR (v_profile ->> 'ageContext' IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'ageSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       ))
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(v_profile -> 'aliases') claim(value)
         WHERE NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(claim.value -> 'sources') source(value)
           WHERE source.value ->> 'kind' <> 'catalog'
         )
       )
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(v_profile -> 'characteristics') claim(value)
         WHERE NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(claim.value -> 'sources') source(value)
           WHERE source.value ->> 'kind' <> 'catalog'
         )
       ) THEN
      RAISE EXCEPTION 'Every published identity, franchise, and attribute needs independent evidence'
        USING ERRCODE = '22023';
    END IF;

    -- A linked model is publishable only with a human-entered HTTPS citation
    -- and an explanatory label. Keep unsupported private links untouched;
    -- they block public approval instead of being silently omitted.
    SELECT EXISTS (
      SELECT 1
      FROM public.catalog_curation_model_characters relation
      WHERE relation.character_identity_id = p_identity_id
        AND relation.unlinked_at IS NULL
        AND (
          relation.evidence_origin !~ '^https://[^[:space:]<>]+$'
          OR substring(relation.evidence_origin FROM '^https://([^/?#]+)') IS NULL
          OR lower(substring(relation.evidence_origin FROM '^https://([^/?#]+)')) LIKE '%@%'
          OR relation.evidence_note IS NULL
          OR btrim(relation.evidence_note) = ''
        )
    ) INTO v_missing_relation_proof;
    IF v_missing_relation_proof THEN
      RAISE EXCEPTION 'Every active model link needs its own HTTPS source and evidence note'
        USING ERRCODE = '22023';
    END IF;

    IF v_identity.editorial_publication_status = 'approved'
       AND v_identity.editorial_publication_revision = p_expected_revision THEN
      RETURN jsonb_build_object(
        'identityId', v_identity.id,
        'name', v_identity.character_name,
        'franchise', v_identity.franchise,
        'profile', v_identity.editorial_profile,
        'status', v_identity.editorial_profile_status,
        'revision', v_identity.editorial_profile_revision,
        'reviewedAt', v_identity.editorial_profile_reviewed_at,
        'reviewedBy', v_identity.editorial_profile_reviewed_by,
        'publicationStatus', v_identity.editorial_publication_status,
        'publicationRevision', v_identity.editorial_publication_revision,
        'publicationApprovalRef', v_identity.editorial_publication_approval_ref,
        'approvedAt', v_identity.editorial_publication_approved_at,
        'approvedBy', v_identity.editorial_publication_approved_by,
        'publicationApprovedAt', v_identity.editorial_publication_approved_at,
        'publicationApprovedBy', v_identity.editorial_publication_approved_by,
        'publicationHistory', v_identity.editorial_publication_history,
        'history', v_identity.editorial_profile_history
      );
    END IF;

    v_approved_at := now();
    v_approval_ref := gen_random_uuid()::text;
    UPDATE public.catalog_character_identities
    SET editorial_publication_history = (
          SELECT COALESCE(jsonb_agg(recent.value ORDER BY recent.ordinality), '[]'::jsonb)
          FROM (
            SELECT history.value, history.ordinality
            FROM jsonb_array_elements(editorial_publication_history || jsonb_build_array(
              jsonb_build_object(
                'action', 'approved',
                'profileRevision', p_expected_revision,
                'approvalRef', v_approval_ref,
                'approvedAt', v_approved_at,
                'approvedBy', p_approver_id
              )
            )) WITH ORDINALITY AS history(value, ordinality)
            ORDER BY history.ordinality DESC
            LIMIT 25
          ) recent
        ),
        editorial_publication_status = 'approved',
        editorial_publication_revision = p_expected_revision,
        editorial_publication_approval_ref = v_approval_ref,
        editorial_publication_approved_at = v_approved_at,
        editorial_publication_approved_by = p_approver_id,
        updated_at = now()
    WHERE id = p_identity_id
    RETURNING * INTO v_identity;
  ELSE
    IF v_identity.editorial_publication_status <> 'approved' THEN
      RETURN jsonb_build_object(
        'identityId', v_identity.id,
        'name', v_identity.character_name,
        'franchise', v_identity.franchise,
        'profile', v_identity.editorial_profile,
        'status', v_identity.editorial_profile_status,
        'revision', v_identity.editorial_profile_revision,
        'reviewedAt', v_identity.editorial_profile_reviewed_at,
        'reviewedBy', v_identity.editorial_profile_reviewed_by,
        'publicationStatus', v_identity.editorial_publication_status,
        'publicationRevision', NULL,
        'publicationApprovalRef', NULL,
        'publicationApprovedAt', NULL,
        'publicationApprovedBy', NULL,
        'publicationHistory', v_identity.editorial_publication_history,
        'history', v_identity.editorial_profile_history
      );
    END IF;
    UPDATE public.catalog_character_identities
    SET editorial_publication_history = (
          SELECT COALESCE(jsonb_agg(recent.value ORDER BY recent.ordinality), '[]'::jsonb)
          FROM (
            SELECT history.value, history.ordinality
            FROM jsonb_array_elements(editorial_publication_history || jsonb_build_array(
              jsonb_build_object(
                'action', 'revoked',
                'profileRevision', editorial_publication_revision,
                'approvalRef', editorial_publication_approval_ref,
                'approvedAt', editorial_publication_approved_at,
                'approvedBy', editorial_publication_approved_by,
                'revokedAt', now()
              )
            )) WITH ORDINALITY AS history(value, ordinality)
            ORDER BY history.ordinality DESC
            LIMIT 25
          ) recent
        ),
        editorial_publication_status = 'not_approved',
        editorial_publication_revision = NULL,
        editorial_publication_approval_ref = NULL,
        editorial_publication_approved_at = NULL,
        editorial_publication_approved_by = NULL,
        updated_at = now()
    WHERE id = p_identity_id
    RETURNING * INTO v_identity;
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
    'publicationStatus', v_identity.editorial_publication_status,
    'publicationRevision', v_identity.editorial_publication_revision,
    'publicationApprovalRef', v_identity.editorial_publication_approval_ref,
    'publicationApprovedAt', v_identity.editorial_publication_approved_at,
    'publicationApprovedBy', v_identity.editorial_publication_approved_by,
    'publicationHistory', v_identity.editorial_publication_history,
    'history', v_identity.editorial_profile_history
  );
END;
$character_publication_approval$;

-- Service-role only: this RPC is the narrow, source-backed export authority.
-- No profile history, unlink history, draft, merely reviewed, or stale approval
-- is included. Export remains read-only and does not write to D1.
CREATE OR REPLACE FUNCTION public.admin_export_approved_catalog_character_projection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $character_public_projection$
DECLARE
  v_identity record;
  v_profile jsonb;
  v_links jsonb;
  v_characters jsonb := '[]'::jsonb;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();

  FOR v_identity IN
    SELECT ci.id, ci.character_name, ci.franchise, ci.editorial_profile,
      ci.editorial_profile_revision, ci.editorial_profile_reviewed_at,
      ci.editorial_profile_reviewed_by, ci.editorial_publication_approval_ref,
      ci.editorial_publication_approved_at, ci.editorial_publication_approved_by
    FROM public.catalog_character_identities ci
    WHERE ci.editorial_profile_status = 'reviewed'
      AND ci.editorial_publication_status = 'approved'
      AND ci.editorial_publication_revision = ci.editorial_profile_revision
    ORDER BY lower(ci.franchise), lower(ci.character_name), ci.id
  LOOP
    v_profile := public.admin_validate_catalog_character_editorial_profile(
      v_identity.editorial_profile, 'reviewed'
    );
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'nameSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'franchiseSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'biographySources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'originWorkSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       )
       OR (v_profile ->> 'ageContext' IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_profile -> 'ageSources') source(value)
         WHERE source.value ->> 'kind' <> 'catalog'
       ))
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(v_profile -> 'aliases') claim(value)
         WHERE NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(claim.value -> 'sources') source(value)
           WHERE source.value ->> 'kind' <> 'catalog'
         )
       )
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(v_profile -> 'characteristics') claim(value)
         WHERE NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(claim.value -> 'sources') source(value)
           WHERE source.value ->> 'kind' <> 'catalog'
         )
       ) THEN
      RAISE EXCEPTION 'Approved identity, franchise, or attribute lacks independent evidence'
        USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'modelId', relation.catalog_model_id,
      'modelSlug', model.catalog_model_slug,
      'evidenceUrl', relation.evidence_origin,
      'evidenceTitle', relation.evidence_note
    ) ORDER BY relation.catalog_model_id), '[]'::jsonb)
    INTO v_links
    FROM public.catalog_curation_model_characters relation
    JOIN public.catalog_curation_model_profiles model
      ON model.catalog_model_id = relation.catalog_model_id
    WHERE relation.character_identity_id = v_identity.id
      AND relation.unlinked_at IS NULL;

    IF EXISTS (
      SELECT 1
      FROM public.catalog_curation_model_characters relation
      WHERE relation.character_identity_id = v_identity.id
        AND relation.unlinked_at IS NULL
        AND (
          relation.evidence_origin !~ '^https://[^[:space:]<>]+$'
          OR substring(relation.evidence_origin FROM '^https://([^/?#]+)') IS NULL
          OR lower(substring(relation.evidence_origin FROM '^https://([^/?#]+)')) LIKE '%@%'
          OR relation.evidence_note IS NULL
          OR btrim(relation.evidence_note) = ''
        )
    ) THEN
      RAISE EXCEPTION 'Approved character has an active model link without evidence'
        USING ERRCODE = '23514';
    END IF;

    v_characters := v_characters || jsonb_build_array(jsonb_build_object(
      'identityId', v_identity.id,
      'name', v_identity.character_name,
      'franchiseName', v_identity.franchise,
      'slug', v_profile ->> 'slug',
      'profile', v_profile,
      'profileRevision', v_identity.editorial_profile_revision,
      'reviewedAt', v_identity.editorial_profile_reviewed_at,
      'reviewedBy', v_identity.editorial_profile_reviewed_by,
      'approvalRef', v_identity.editorial_publication_approval_ref,
      'approvedAt', v_identity.editorial_publication_approved_at,
      'approvedBy', v_identity.editorial_publication_approved_by,
      'modelLinks', v_links
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'schemaVersion', 1,
    'source', 'public.admin_export_approved_catalog_character_projection',
    'generatedAt', now(),
    'characters', v_characters
  );
END;
$character_public_projection$;

REVOKE ALL ON FUNCTION public.admin_set_catalog_character_publication_approval(uuid, integer, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_export_approved_catalog_character_projection()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_catalog_character_publication_approval(uuid, integer, boolean, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_export_approved_catalog_character_projection()
  TO service_role;

COMMENT ON COLUMN public.catalog_character_identities.editorial_publication_status IS
  'Separate human approval for public Worker projection. Profile review alone never publishes.';
COMMENT ON COLUMN public.catalog_character_identities.editorial_publication_history IS
  'Last 25 public approval, revocation, and invalidation events for the canonical character identity.';

NOTIFY pgrst, 'reload schema';
COMMIT;
