-- TONART PR #31 acceptance: run only in an explicitly confirmed, isolated
-- PostgreSQL/Supabase STAGING database AFTER applying the reviewed migration.
--
-- Example (psql in the staging database, never production):
--   SET SESSION tonart.curation_acceptance_stage = 'staging';
--   \i supabase/tests/tonart_curated_model_characters_acceptance.sql
--
-- One transaction; all test-only models and characters are rolled back.
-- Run with ON_ERROR_STOP=1 and examine all assertions/RAISE NOTICE. The guard
-- is deliberately external to this script so a casual invocation fails closed.
BEGIN;

DO $tonart_preflight$
BEGIN
  IF current_setting('tonart.curation_acceptance_stage', true)
     IS DISTINCT FROM 'staging' THEN
    RAISE EXCEPTION 'TONART acceptance requires explicit isolated staging session'
      USING ERRCODE = '42501';
  END IF;
  IF to_regclass('public.catalog_curation_model_characters') IS NULL THEN
    RAISE EXCEPTION 'TONART multi-character migration not installed'
      USING ERRCODE = '42P01';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_character_identities'
      AND column_name = 'editorial_profile_history'
  ) OR to_regprocedure('public.admin_get_catalog_character_editorial_profile(uuid)') IS NULL
    OR to_regprocedure('public.admin_save_catalog_character_editorial_profile(uuid,jsonb,text,integer,uuid)') IS NULL
    OR to_regprocedure('public.admin_set_catalog_character_publication_approval(uuid,integer,integer,boolean,uuid)') IS NULL
    OR to_regprocedure('public.admin_export_approved_catalog_character_projection()') IS NULL
    OR to_regprocedure('private_api.bump_tonart_character_relation_revision(uuid,text,text)') IS NULL
    OR to_regprocedure('private_api.invalidate_tonart_character_publication_on_relation_change()') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'catalog_character_identities'
        AND column_name = 'editorial_relation_revision'
    )
    OR NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.catalog_curation_model_characters'::regclass
        AND tgname = 'trg_catalog_character_publication_relation_revision'
        AND NOT tgisinternal
    )
    OR NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.catalog_curation_model_profiles'::regclass
        AND tgname = 'trg_catalog_character_publication_model_slug_revision'
        AND NOT tgisinternal
    ) THEN
    RAISE EXCEPTION 'TONART character editorial profile migration not installed'
      USING ERRCODE = '42P01';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_curation_model_profiles'
      AND column_name IN ('character_identity_id', 'identity_verified')
  ) THEN
    RAISE EXCEPTION 'Old scalar identity columns still present' USING ERRCODE = '23514';
  END IF;
END;
$tonart_preflight$;

-- Only in this isolated transaction: exercise the same service-role guard
-- used by the project's canonical admin-rpc gateway.
SET LOCAL request.jwt.claims = '{"role":"service_role"}';

DO $tonart_acceptance$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_model_a text;
  v_model_b text;
  v_slug_a text;
  v_slug_b text;
  v_name_a text;
  v_name_b text;
  v_franchise text;
  v_id_a uuid;
  v_id_b uuid;
  v_receipt jsonb;
  v_count integer;
  v_original_origin text;
  v_collection_id uuid;
  v_page jsonb;
  v_summary jsonb;
  v_member jsonb;
  v_history jsonb;
  v_editorial_profile jsonb;
  v_editorial_profile_b jsonb;
  v_editorial_result jsonb;
  v_public_projection jsonb;
  v_approval_ref text;
  v_reviewer_id uuid := gen_random_uuid();
  v_expected_failure boolean;
  v_n integer;
BEGIN
  -- Public approval must never accept a local, reserved, or disguised
  -- origin. The source validator is used by both human approval and export.
  IF NOT private_api.tonart_public_https_evidence_url(
       'https://www.marvel.com/characters/doctor-octopus/in-comics')
     OR NOT private_api.tonart_public_https_evidence_url(
       'https://example.org/editorial/source') THEN
    RAISE EXCEPTION 'Public HTTPS editorial source was rejected';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'http://example.org/not-https',
      'https://localhost/character',
      'https://localhost./character',
      'https://127.0.0.1/source',
      'https://10.2.3.4/internal',
      'https://192.168.1.1/internal',
      'https://[::1]/internal',
      'https://private.example.local/bio',
      'https://example.test/draft',
      'https://example.org:443/bio',
      'https://user:password@example.org/bio',
      'https://%31%32%37.0.0.1/source'
    ]) AS bad(url)
    WHERE private_api.tonart_public_https_evidence_url(bad.url)
  ) THEN
    RAISE EXCEPTION 'Private or malformed editorial evidence URL was accepted';
  END IF;
  IF private_api.tonart_editorial_sources_public_https(
       jsonb_build_object('biographySources', jsonb_build_array(
         jsonb_build_object('url', 'https://127.0.0.1/claim')
       ))
     ) OR private_api.tonart_editorial_sources_public_https(
       jsonb_build_object('aliases', jsonb_build_array(jsonb_build_object(
         'name', 'Draft alias', 'sources', jsonb_build_array(
           jsonb_build_object('url', 'https://hidden.example.internal/claim')
         )
       )))
     ) THEN
    RAISE EXCEPTION 'Profile or nested claim bypassed the public source validator';
  END IF;

  v_model_a := 'tonart-qa-a-' || substr(v_suffix, 1, 16);
  v_model_b := 'tonart-qa-b-' || substr(v_suffix, 1, 16);
  v_slug_a := v_model_a;
  v_slug_b := v_model_b;
  v_name_a := 'TONART acceptance alpha ' || substr(v_suffix, 1, 8);
  v_name_b := 'TONART acceptance beta ' || substr(v_suffix, 1, 8);
  v_franchise := 'TONART acceptance-only universe';

  -- Private by grants AND RLS. No browser-role Data API access.
  IF NOT (
    SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.catalog_curation_model_characters'::regclass
  ) THEN
    RAISE EXCEPTION 'Private relation has no RLS' USING ERRCODE = '23514';
  END IF;
  IF has_table_privilege('anon', 'public.catalog_curation_model_characters', 'SELECT')
     OR has_table_privilege('authenticated', 'public.catalog_curation_model_characters', 'SELECT')
     OR has_table_privilege('authenticated', 'public.catalog_curation_model_characters', 'INSERT')
     OR has_function_privilege('anon',
       'public.admin_unlink_catalog_model_character(text,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.admin_unlink_catalog_model_character(text,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.admin_save_catalog_character_editorial_profile(uuid,jsonb,text,integer,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.admin_save_catalog_character_editorial_profile(uuid,jsonb,text,integer,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Curation leaked to public roles' USING ERRCODE = '42501';
  END IF;
  IF NOT has_function_privilege('service_role',
    'public.admin_unlink_catalog_model_character(text,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Editorial gateway lost required execute grant'
      USING ERRCODE = '42501';
  END IF;
  IF NOT has_function_privilege('service_role',
    'public.admin_get_catalog_character_editorial_profile(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.admin_save_catalog_character_editorial_profile(uuid,jsonb,text,integer,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Editorial profile gateway lost required execute grants'
      USING ERRCODE = '42501';
  END IF;
  IF NOT has_function_privilege('service_role',
       'public.admin_set_catalog_character_publication_approval(uuid,integer,integer,boolean,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.admin_export_approved_catalog_character_projection()', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.admin_export_approved_catalog_character_projection()', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.admin_export_approved_catalog_character_projection()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public approval/export RPC grants are not service-role scoped'
      USING ERRCODE = '42501';
  END IF;

  -- The SQL gateway must reject a forged browser-role claim even when the
  -- staging connection itself has elevated database privileges.
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_verify_catalog_model_identity(
      v_model_a, v_slug_a, v_name_a, v_franchise,
      'manual_admin:acceptance_unauthorized', NULL
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_expected_failure := true;
  END;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Editorial function accepted non-service JWT claims'
      USING ERRCODE = '42501';
  END IF;

  -- Two models with the same reviewed character share precisely ONE identity.
  v_receipt := public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'manual_admin:acceptance_original', 'Original reviewed evidence'
  );
  v_id_a := (v_receipt->>'identityId')::uuid;
  IF (v_receipt->>'modelId') IS DISTINCT FROM v_model_a
     OR (v_receipt->>'verified') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Initial verification receipt invalid';
  END IF;
  SELECT evidence_origin INTO STRICT v_original_origin
  FROM public.catalog_character_identities WHERE id = v_id_a;

  v_receipt := public.admin_verify_catalog_model_identity(
    v_model_b, v_slug_b, v_name_a, v_franchise,
    'manual_admin:acceptance_other_model', 'Second model evidence'
  );
  IF (v_receipt->>'identityId')::uuid IS DISTINCT FROM v_id_a THEN
    RAISE EXCEPTION 'Two models duplicated one character identity';
  END IF;
  IF (SELECT evidence_origin FROM public.catalog_character_identities
      WHERE id = v_id_a) IS DISTINCT FROM v_original_origin THEN
    RAISE EXCEPTION 'Second model rewrote original identity provenance';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_verify_catalog_model_identity(
      v_model_a, v_slug_a, v_name_b, v_franchise,
      'automatic:unreviewed_guess', NULL
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Unreviewed automatic identity was accepted';
  END IF;

  v_receipt := public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_b, v_franchise,
    'manual_admin:acceptance_second_character', NULL
  );
  v_id_b := (v_receipt->>'identityId')::uuid;
  SELECT count(*) INTO v_count
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND unlinked_at IS NULL;
  IF v_count <> 2 OR v_id_a = v_id_b THEN
    RAISE EXCEPTION 'One model failed to accept two distinct characters';
  END IF;

  -- Private profile evidence is stored once on the canonical character,
  -- never on either model. These URLs and facts are fictitious test fixtures.
  v_editorial_profile := jsonb_build_object(
    'slug', 'tonart-qa-' || substr(v_suffix, 1, 16),
    'aliases', '[]'::jsonb,
    'biography', '',
    'ageContext', NULL,
    'originWork', '',
    'characteristics', '[]'::jsonb
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF (v_editorial_result->>'status') IS DISTINCT FROM 'draft'
     OR (v_editorial_result->>'revision')::integer <> 0 THEN
    RAISE EXCEPTION 'New canonical character did not start with a private draft profile';
  END IF;
  v_editorial_result := public.admin_save_catalog_character_editorial_profile(
    v_id_a, v_editorial_profile, 'draft', 0, NULL
  );
  IF (v_editorial_result->>'revision')::integer <> 1
     OR (v_editorial_result->>'status') IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Private editorial draft was not versioned';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_save_catalog_character_editorial_profile(
      v_id_a, v_editorial_profile, 'reviewed', 1, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Editorial review accepted a profile without claim evidence';
  END IF;

  v_editorial_profile := jsonb_build_object(
    'slug', 'tonart-qa-' || substr(v_suffix, 1, 16),
    'aliases', jsonb_build_array(jsonb_build_object(
      'name', 'Acceptance alias', 'sources', jsonb_build_array(jsonb_build_object(
        'title', 'Official acceptance fixture', 'url', 'https://example.org/alias', 'kind', 'official'
      ))
    )),
    'biography', 'Fictitious staging-only biography.',
    'biographySources', jsonb_build_array(jsonb_build_object(
      'title', 'Official acceptance fixture', 'url', 'https://example.org/biography', 'kind', 'official'
    )),
    'ageContext', NULL,
    'ageSources', '[]'::jsonb,
    'originWork', 'Fictitious staging-only work',
    'originWorkSources', jsonb_build_array(jsonb_build_object(
      'title', 'Publisher acceptance fixture', 'url', 'https://example.org/origin', 'kind', 'publisher'
    )),
    'characteristics', jsonb_build_array(jsonb_build_object(
      'name', 'Acceptance-only characteristic', 'sources', jsonb_build_array(jsonb_build_object(
        'title', 'Official acceptance fixture', 'url', 'https://example.org/trait', 'kind', 'official'
      ))
    )),
    'nameSources', jsonb_build_array(jsonb_build_object(
      'title', 'Official acceptance fixture', 'url', 'https://example.org/name', 'kind', 'official'
    )),
    'franchiseSources', jsonb_build_array(jsonb_build_object(
      'title', 'Official acceptance fixture', 'url', 'https://example.org/franchise', 'kind', 'official'
    ))
  );
  v_editorial_result := public.admin_save_catalog_character_editorial_profile(
    v_id_a, v_editorial_profile, 'reviewed', 1, v_reviewer_id
  );
  IF (v_editorial_result->>'status') IS DISTINCT FROM 'reviewed'
     OR (v_editorial_result->>'revision')::integer <> 2
     OR (v_editorial_result->>'reviewedBy')::uuid IS DISTINCT FROM v_reviewer_id THEN
    RAISE EXCEPTION 'Evidence-backed character profile did not reach private reviewed state';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_save_catalog_character_editorial_profile(
      v_id_a, v_editorial_profile, 'reviewed', 1, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '40001' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Stale editorial profile revision was accepted';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_save_catalog_character_editorial_profile(
      v_id_b, v_editorial_profile, 'reviewed', 0, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '23505' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Duplicate reviewed character route slug was accepted';
  END IF;

  -- A reviewed identity still needs one active, evidenced model relation
  -- before it can be approved for the public projection.
  v_editorial_profile_b := jsonb_set(
    v_editorial_profile, '{slug}',
    to_jsonb('tonart-qa-beta-' || substr(v_suffix, 1, 16))
  );
  v_editorial_profile_b := jsonb_set(v_editorial_profile_b, '{biography}', '""'::jsonb)
    - 'biographySources';
  v_editorial_result := public.admin_save_catalog_character_editorial_profile(
    v_id_b, v_editorial_profile_b, 'reviewed', 0, v_reviewer_id
  );
  IF v_editorial_result->>'status' IS DISTINCT FROM 'reviewed' THEN
    RAISE EXCEPTION 'Evidence-backed second profile did not reach reviewed state';
  END IF;
  PERFORM public.admin_unlink_catalog_model_character(
    v_model_a, v_slug_a, v_id_b, 'Acceptance check: no active public model link'
  );
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_set_catalog_character_publication_approval(
      v_id_b, 1,
      (public.admin_get_catalog_character_editorial_profile(v_id_b)->>'relationRevision')::integer,
      true, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := SQLERRM =
      'Every approved character needs at least one active model link';
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Public approval accepted a reviewed identity without model links';
  END IF;
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_b, v_franchise,
    'https://example.org/model-a/character-b-restored', 'Restored after link-gate acceptance'
  );
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_b, 1,
    (public.admin_get_catalog_character_editorial_profile(v_id_b)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  v_public_projection := public.admin_export_approved_catalog_character_projection();
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'approved'
     OR NOT EXISTS (
       SELECT 1
       FROM jsonb_array_elements(v_public_projection->'characters') exported(value)
       WHERE (exported.value->>'identityId')::uuid = v_id_b
         AND exported.value->'profile'->>'biography' = ''
         AND jsonb_array_length(exported.value->'profile'->'biographySources') = 0
     ) THEN
    RAISE EXCEPTION 'Optional biography was not exported without invented evidence';
  END IF;
  PERFORM public.admin_set_catalog_character_publication_approval(
    v_id_b, 1,
    (public.admin_get_catalog_character_editorial_profile(v_id_b)->>'relationRevision')::integer,
    false, NULL
  );

  -- Private profile review is not publication. Incomplete legacy link evidence
  -- blocks approval until each exact model link receives a source and note.
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_set_catalog_character_publication_approval(
      v_id_a, 2,
      (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
      true, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Publication approved without source-backed model links';
  END IF;
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'https://example.org/model-a/character-a', 'Acceptance model A character citation'
  );
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_b, v_slug_b, v_name_a, v_franchise,
    'https://example.org/model-b/character-a', 'Acceptance model B character citation'
  );
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, 2,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'approved'
     OR (v_editorial_result->>'publicationRevision')::integer <> 2
     OR (v_editorial_result->>'relationRevision')::integer < 2
     OR (v_editorial_result->>'relationRevision')::integer
        IS DISTINCT FROM (v_editorial_result->>'approvedRelationRevision')::integer
     OR (v_editorial_result->>'publicationApprovedBy')::uuid IS DISTINCT FROM v_reviewer_id THEN
    RAISE EXCEPTION 'Human approval did not bind to the current reviewed revision';
  END IF;
  v_approval_ref := v_editorial_result->>'publicationApprovalRef';
  v_public_projection := public.admin_export_approved_catalog_character_projection();
  IF (v_public_projection->>'schemaVersion')::integer <> 1
     OR jsonb_array_length(v_public_projection->'characters') <> 1
     OR (v_public_projection->'characters'->0->>'identityId')::uuid IS DISTINCT FROM v_id_a
     OR jsonb_array_length(v_public_projection->'characters'->0->'modelLinks') <> 2
     OR (v_public_projection->'characters'->0->>'relationRevision')::integer
        IS DISTINCT FROM (v_public_projection->'characters'->0->>'approvedRelationRevision')::integer
     OR v_public_projection->'characters'->0 ? 'history' THEN
    RAISE EXCEPTION 'Public export leaked private history or omitted approved evidence';
  END IF;
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, 2,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  IF v_editorial_result->>'publicationApprovalRef' IS DISTINCT FROM v_approval_ref
     OR jsonb_array_length(v_editorial_result->'publicationHistory') <> 1 THEN
    RAISE EXCEPTION 'Repeated approval was not idempotent';
  END IF;
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, 2,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    false, NULL
  );
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR v_editorial_result->'publicationHistory'->1->>'action' IS DISTINCT FROM 'revoked' THEN
    RAISE EXCEPTION 'Publication revocation did not retain its audit event';
  END IF;
  PERFORM public.admin_set_catalog_character_publication_approval(
    v_id_a, 2,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  v_editorial_result := public.admin_save_catalog_character_editorial_profile(
    v_id_a, v_editorial_profile, 'draft', 2, NULL
  );
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR v_editorial_result->'publicationHistory'->-1->>'action'
       IS DISTINCT FROM 'invalidated_by_profile_change'
     OR v_editorial_result->>'status' IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Profile change failed to invalidate the prior public approval';
  END IF;

  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF (v_editorial_result->'profile'->>'biography') IS DISTINCT FROM
       'Fictitious staging-only biography.'
     OR jsonb_array_length(v_editorial_result->'history') <> 2 THEN
    RAISE EXCEPTION 'Private character profile or revision history was not retained';
  END IF;

  -- Exercise the ACTUAL private page and summary contracts, not only raw rows.
  -- Both model members belong to this single transaction and disappear at ROLLBACK.
  v_receipt := public.admin_ensure_internal_collection(
    'TONART QA ' || substr(v_suffix, 1, 16),
    'tonart-qa-' || substr(v_suffix, 1, 16),
    'Staging-only character identity acceptance'
  );
  v_collection_id := (v_receipt->>'id')::uuid;
  v_receipt := public.admin_upsert_collection_curation_models(
    v_collection_id,
    jsonb_build_array(
      jsonb_build_object(
        'modelId', v_model_a, 'slug', v_slug_a, 'state', 'approved',
        'evidenceOrigin', 'manual_admin:acceptance_collection'
      ),
      jsonb_build_object(
        'modelId', v_model_b, 'slug', v_slug_b, 'state', 'approved',
        'evidenceOrigin', 'manual_admin:acceptance_collection'
      )
    )
  );
  IF (v_receipt->>'count')::integer IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'Collection curation failed to link two canonical models';
  END IF;
  v_page := public.admin_get_collection_curation_page(
    v_collection_id, NULL, 0, 20, NULL
  );
  v_summary := public.admin_get_collection_curation_summary(v_collection_id);
  IF jsonb_array_length(v_page->'items') <> 2
     OR (v_page->>'total')::integer <> 2
     OR (v_summary->>'distinctVerifiedCharacterCount')::integer <> 2
     OR (v_summary->>'unverifiedModelCount')::integer <> 0
     OR (v_summary->>'approvedCount')::integer <> 2 THEN
    RAISE EXCEPTION 'Initial private summary/page lost verified character links';
  END IF;
  SELECT members.value INTO STRICT v_member
  FROM jsonb_array_elements(v_page->'items') AS members(value)
  WHERE members.value->>'modelId' = v_model_a;
  IF jsonb_array_length(v_member->'characters') <> 2
     OR jsonb_array_length(v_member->'inactiveCharacters') <> 0
     OR (v_member->>'inactiveCharacterCount')::integer <> 0 THEN
    RAISE EXCEPTION 'Initial private page returned incorrect active/archive state';
  END IF;

  -- An idempotent re-review of an ACTIVE link must not downgrade the
  -- source-backed HTTPS citation already approved above. The original
  -- manual provenance remains in the relation's existing review_history.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'manual_admin:acceptance_duplicate', 'Should not overwrite link proof'
  );
  IF (SELECT evidence_origin FROM public.catalog_curation_model_characters
      WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a)
       IS DISTINCT FROM 'https://example.org/model-a/character-a' THEN
    RAISE EXCEPTION 'Idempotent review downgraded reviewed HTTPS link evidence';
  END IF;

  -- Missing explanations and mismatched slugs cannot revoke any relation.
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_unlink_catalog_model_character(
      v_model_a, v_slug_a, v_id_a, ' '
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Blank unlink explanation was accepted';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_unlink_catalog_model_character(
      v_model_a, v_slug_b, v_id_a, 'Wrong model slug must fail'
    );
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Mismatched model slug was allowed to unlink a character';
  END IF;

  -- Detach only A: keep row, original identity and the link on model B.
  v_receipt := public.admin_unlink_catalog_model_character(
    v_model_a, v_slug_a, v_id_a,
    'Manual revision: attribution belongs to another character.'
  );
  IF (v_receipt->>'unlinked') IS DISTINCT FROM 'true'
     OR (v_receipt->>'identityId')::uuid IS DISTINCT FROM v_id_a THEN
    RAISE EXCEPTION 'Unlink returned an unverified receipt';
  END IF;
  SELECT count(*) INTO v_count
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND unlinked_at IS NULL;
  IF v_count <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.catalog_curation_model_characters
    WHERE catalog_model_id = v_model_b
      AND character_identity_id = v_id_a AND unlinked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Unlink removed another model or did not update active count';
  END IF;
  SELECT review_history INTO STRICT v_history
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a;
  IF jsonb_array_length(v_history) <> 2
     OR (v_history->0->>'action') IS DISTINCT FROM 'evidence_updated'
     OR (v_history->0->>'previousOrigin') IS DISTINCT FROM 'manual_admin:acceptance_original'
     OR (v_history->1->>'action') IS DISTINCT FROM 'unlinked'
     OR (v_history->1->>'reason') IS DISTINCT FROM
       'Manual revision: attribution belongs to another character.' THEN
    RAISE EXCEPTION 'Unlink did not retain the HTTPS upgrade and recorded reason';
  END IF;

  v_page := public.admin_get_collection_curation_page(
    v_collection_id, NULL, 0, 20, NULL
  );
  v_summary := public.admin_get_collection_curation_summary(v_collection_id);
  SELECT members.value INTO STRICT v_member
  FROM jsonb_array_elements(v_page->'items') AS members(value)
  WHERE members.value->>'modelId' = v_model_a;
  IF jsonb_array_length(v_member->'characters') <> 1
     OR jsonb_array_length(v_member->'inactiveCharacters') <> 1
     OR (v_member->>'inactiveCharacterCount')::integer <> 1
     OR (v_member->'inactiveCharacters'->0->>'id')::uuid IS DISTINCT FROM v_id_a
     OR (v_member->'inactiveCharacters'->0->>'reviewCount')::integer <> 2
     OR (v_summary->>'distinctVerifiedCharacterCount')::integer <> 2
     OR (v_summary->>'unverifiedModelCount')::integer <> 0 THEN
    RAISE EXCEPTION 'Private page/summary failed to keep inactive links separate';
  END IF;

  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_unlink_catalog_model_character(
      v_model_a, v_slug_a, v_id_a, 'Second unlink must fail'
    );
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Repeated unlink incorrectly reported success';
  END IF;

  -- Restoration must reuse the link and retain both the earlier decision and
  -- the new source. Its event keeps the old proof in bounded relation history.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'https://example.org/model-a/character-a-restored', 'Restored after manual reassessment'
  );
  SELECT review_history INTO STRICT v_history
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a
    AND unlinked_at IS NULL AND unlink_reason IS NULL
    AND evidence_origin = 'https://example.org/model-a/character-a-restored';
  IF jsonb_array_length(v_history) <> 3
     OR (v_history->2->>'action') IS DISTINCT FROM 'restored'
     OR (v_history->2->>'note') IS DISTINCT FROM 'Restored after manual reassessment'
     OR (v_history->2->>'previousOrigin') IS DISTINCT FROM 'https://example.org/model-a/character-a' THEN
    RAISE EXCEPTION 'Restoration lost previous approval, link, or review history';
  END IF;

  v_page := public.admin_get_collection_curation_page(
    v_collection_id, NULL, 0, 20, NULL
  );
  v_summary := public.admin_get_collection_curation_summary(v_collection_id);
  SELECT members.value INTO STRICT v_member
  FROM jsonb_array_elements(v_page->'items') AS members(value)
  WHERE members.value->>'modelId' = v_model_a;
  IF jsonb_array_length(v_member->'characters') <> 2
     OR jsonb_array_length(v_member->'inactiveCharacters') <> 0
     OR (v_member->>'inactiveCharacterCount')::integer <> 0
     OR (v_summary->>'distinctVerifiedCharacterCount')::integer <> 2 THEN
    RAISE EXCEPTION 'Private page/summary failed to reflect restored character';
  END IF;

  -- A 101st review event is forbidden, without corrupting the valid history.
  v_expected_failure := false;
  BEGIN
    UPDATE public.catalog_curation_model_characters
      SET review_history = (
        SELECT jsonb_agg(jsonb_build_object('action', 'acceptance_overflow'))
        FROM generate_series(1, 101)
      )
    WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a;
  EXCEPTION WHEN SQLSTATE '23514' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Unbounded character audit history was accepted';
  END IF;
  SELECT review_history INTO STRICT v_history
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a;
  IF jsonb_array_length(v_history) <> 3 THEN
    RAISE EXCEPTION 'History overflow attempt corrupted existing decisions';
  END IF;

  -- Verify an actual large diorama: the same model can link 21 separately
  -- reviewed identities. The collection stays one model row and the private
  -- RPC returns all active identities, not only the first twelve.
  FOR v_n IN 3..20 LOOP
    PERFORM public.admin_verify_catalog_model_identity(
      v_model_a, v_slug_a, 'TONART acceptance extra ' || v_n || ' ' || v_suffix,
      v_franchise, 'manual_admin:acceptance_large_diorama', NULL
    );
  END LOOP;
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, 'TONART acceptance twenty-first ' || v_suffix,
    v_franchise, 'manual_admin:acceptance_large_diorama', NULL
  );
  SELECT count(*) INTO v_count
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND unlinked_at IS NULL;
  IF v_count <> 21 THEN
    RAISE EXCEPTION 'Expected 21 active character links, found %', v_count;
  END IF;
  v_page := public.admin_get_collection_curation_page(
    v_collection_id, NULL, 0, 20, NULL
  );
  v_summary := public.admin_get_collection_curation_summary(v_collection_id);
  SELECT members.value INTO STRICT v_member
  FROM jsonb_array_elements(v_page->'items') AS members(value)
  WHERE members.value->>'modelId' = v_model_a;
  IF jsonb_array_length(v_member->'characters') <> 21
     OR (v_summary->>'distinctVerifiedCharacterCount')::integer <> 21 THEN
    RAISE EXCEPTION 'Twenty-first verified character was rejected';
  END IF;

  -- The first unlink of two active links MUST invalidate publication,
  -- not only the final unlink. A stale approval may never authorize a subset.
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  v_editorial_result := public.admin_save_catalog_character_editorial_profile(
    v_id_a, v_editorial_result->'profile', 'reviewed',
    (v_editorial_result->>'revision')::integer, v_reviewer_id
  );
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  v_count := (v_editorial_result->>'approvedRelationRevision')::integer;
  PERFORM public.admin_unlink_catalog_model_character(
    v_model_a, v_slug_a, v_id_a, 'Acceptance: partial unlink must revoke approval'
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR (v_editorial_result->>'relationRevision')::integer <> v_count + 1
     OR v_editorial_result->'approvedRelationRevision' <> 'null'::jsonb
     OR v_editorial_result->'publicationHistory'->-1->>'action'
        IS DISTINCT FROM 'invalidated_by_model_relation_change' THEN
    RAISE EXCEPTION 'Partial model unlink failed to revoke the entire approved relation set';
  END IF;
  -- The reviewer still holding the prior relation cursor cannot authorize
  -- newly changed links, even if the editorial profile revision is unchanged.
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_set_catalog_character_publication_approval(
      v_id_a, (v_editorial_result->>'revision')::integer, v_count, true, v_reviewer_id
    );
  EXCEPTION WHEN SQLSTATE '40001' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Stale editor approved relations changed after the review';
  END IF;

  v_public_projection := public.admin_export_approved_catalog_character_projection();
  IF jsonb_array_length(v_public_projection->'characters') <> 0 THEN
    RAISE EXCEPTION 'Partial unlink exported a stale human approval';
  END IF;

  -- Reapprove only the exact remaining link; then remove it.
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  PERFORM public.admin_unlink_catalog_model_character(
    v_model_b, v_slug_b, v_id_a, 'Acceptance: final active model link also revokes'
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR v_editorial_result->'publicationHistory'->-1->>'action'
       IS DISTINCT FROM 'invalidated_by_model_relation_change' THEN
    RAISE EXCEPTION 'Final model unlink failed to revoke publication';
  END IF;

  -- Restoration stays private; reapproval is a separate explicit decision.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_b, v_slug_b, v_name_a, v_franchise,
    'https://example.org/model-b/character-a-restored', 'Private restore after invalidation'
  );
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  v_count := (v_editorial_result->>'approvedRelationRevision')::integer;

  -- An idempotent writer request changes no approved content or revision.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_b, v_slug_b, v_name_a, v_franchise,
    'https://example.org/model-b/character-a-restored', 'Private restore after invalidation'
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'approved'
     OR (v_editorial_result->>'relationRevision')::integer <> v_count THEN
    RAISE EXCEPTION 'Idempotent relation write invalidated an unchanged approval';
  END IF;

  -- Replacing citation text is a semantic edit, even with the same model ID.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_b, v_slug_b, v_name_a, v_franchise,
    'https://example.org/model-b/new-reviewed-evidence', 'New evidence after approval'
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR (v_editorial_result->>'relationRevision')::integer <> v_count + 1 THEN
    RAISE EXCEPTION 'Model evidence replacement did not invalidate old approval';
  END IF;

  -- Adding a second link after reapproval also invalidates it immediately.
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'https://example.org/model-a/new-link', 'Added model after public approval'
  );
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved' THEN
    RAISE EXCEPTION 'New model link remained covered by previous approval';
  END IF;

  -- A changed canonical model slug alters the published modelLink payload;
  -- this is not a harmless metadata-only edit.
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (public.admin_get_catalog_character_editorial_profile(v_id_a)->>'relationRevision')::integer,
    true, v_reviewer_id
  );
  UPDATE public.catalog_curation_model_profiles
    SET catalog_model_slug = catalog_model_slug || '-rev', updated_at = now()
  WHERE catalog_model_id = v_model_a;
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR v_editorial_result->'approvedRelationRevision' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Canonical model slug change failed to invalidate publication';
  END IF;
  v_public_projection := public.admin_export_approved_catalog_character_projection();
  IF jsonb_array_length(v_public_projection->'characters') <> 0 THEN
    RAISE EXCEPTION 'Unapproved character was exported after model identity mutation';
  END IF;

  -- The original character identity and its primary evidence belong to the
  -- public claim too. A direct authorized SQL correction must invalidate it;
  -- it is not safe to rely solely on the editable profile revision.
  UPDATE public.catalog_curation_model_profiles
  SET catalog_model_slug = v_slug_a, updated_at = now()
  WHERE catalog_model_id = v_model_a;
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  v_editorial_result := public.admin_set_catalog_character_publication_approval(
    v_id_a, (v_editorial_result->>'revision')::integer,
    (v_editorial_result->>'relationRevision')::integer, true, v_reviewer_id
  );
  UPDATE public.catalog_character_identities
  SET evidence_note = 'Reviewed identity proof changed after approval',
      updated_at = now()
  WHERE id = v_id_a;
  v_editorial_result := public.admin_get_catalog_character_editorial_profile(v_id_a);
  IF v_editorial_result->>'publicationStatus' IS DISTINCT FROM 'not_approved'
     OR v_editorial_result->'publicationHistory'->-1->>'action'
        IS DISTINCT FROM 'invalidated_by_identity_change' THEN
    RAISE EXCEPTION 'Canonical identity edit retained a stale public approval';
  END IF;
  v_public_projection := public.admin_export_approved_catalog_character_projection();
  IF jsonb_array_length(v_public_projection->'characters') <> 0 THEN
    RAISE EXCEPTION 'Identity drift leaked into the public projection';
  END IF;

  RAISE NOTICE 'TONART character staging acceptance PASS (transaction rolled back)';
END;
$tonart_acceptance$;

ROLLBACK;
