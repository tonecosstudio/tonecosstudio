-- Isolated PostgreSQL 17 contract test, never a production migration.
-- Applies the canonical private curation and editorial migration chain
-- unchanged. No Supabase keys, real data, external services or D1 writes.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA private_api;
REVOKE ALL ON SCHEMA private_api FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;

-- Supply only the pre-existing admin predicate needed by the canonical wrapper.
-- Keep its decision false; the editorial migrations and service-role guard are
-- applied below from their original files, with no copied table definitions.
CREATE FUNCTION private_api.is_current_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $admin_predicate$
  SELECT false
$admin_predicate$;
REVOKE ALL ON FUNCTION private_api.is_current_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.is_current_admin() TO authenticated, service_role;
\ir ../migrations/20261105062428_tonecos_admin_access_routine.sql

-- Apply the original curation chain in canonical order rather than reproducing
-- its tables or editorial helper functions in this test fixture.
\ir ../migrations/20261115154500_tonart_internal_collection_curation.sql
\ir ../migrations/20261115154600_tonart_curation_controlled_tag_creation.sql

-- Preserve one legacy verified scalar identity through the 1:N migration.
INSERT INTO public.catalog_character_identities (
  id, identity_key, character_name, franchise, evidence_origin, evidence_note
) VALUES (
  '33333333-3333-4333-8333-333333333333', 'legacy/test-character',
  'Legacy test character', 'Test universe',
  'https://example.org/legacy-character', 'Fixture for the one-to-many backfill'
);
INSERT INTO public.catalog_curation_model_profiles (
  catalog_model_id, catalog_model_slug, character_identity_id,
  identity_verified, identity_evidence_origin, identity_evidence_note
) VALUES (
  'mdl_legacy_001', 'legacy-test-model', '33333333-3333-4333-8333-333333333333',
  true, 'https://example.org/legacy-character', 'Legacy verified model link'
);
\ir ../migrations/20261117030000_tonart_curated_model_characters.sql
DO $legacy_link_backfill$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_curation_model_characters
    WHERE catalog_model_id = 'mdl_legacy_001'
      AND character_identity_id = '33333333-3333-4333-8333-333333333333'
      AND evidence_origin = 'https://example.org/legacy-character'
      AND evidence_note = 'Legacy verified model link'
      AND unlinked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy verified identity was not preserved as an active relation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_curation_model_profiles'
      AND column_name IN (
        'character_identity_id', 'identity_verified',
        'identity_evidence_origin', 'identity_evidence_note'
      )
  ) THEN
    RAISE EXCEPTION 'Legacy scalar identity columns remain after 1:N cutover';
  END IF;
END;
$legacy_link_backfill$;
\ir ../migrations/20261117040000_tonart_character_editorial_profiles.sql
\ir ../migrations/20261118010000_tonart_public_character_approval_and_export.sql

DO $private_editorial_access_contract$
DECLARE
  v_rls_table_count integer;
BEGIN
  SELECT count(*) INTO v_rls_table_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'catalog_character_identities',
      'catalog_curation_model_profiles',
      'catalog_curation_model_characters'
    )
    AND c.relrowsecurity;
  IF v_rls_table_count <> 3 THEN
    RAISE EXCEPTION 'Canonical editorial tables must all retain row-level security';
  END IF;
  IF has_table_privilege('anon', 'public.catalog_character_identities', 'SELECT')
     OR has_table_privilege('authenticated', 'public.catalog_character_identities', 'SELECT')
     OR has_table_privilege('anon', 'public.catalog_curation_model_profiles', 'SELECT')
     OR has_table_privilege('authenticated', 'public.catalog_curation_model_profiles', 'SELECT')
     OR has_table_privilege('anon', 'public.catalog_curation_model_characters', 'SELECT')
     OR has_table_privilege('authenticated', 'public.catalog_curation_model_characters', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.catalog_character_identities', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.catalog_curation_model_profiles', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.catalog_curation_model_characters', 'SELECT') THEN
    RAISE EXCEPTION 'Editorial table grants do not preserve the private service-role boundary';
  END IF;
  IF has_function_privilege(
       'anon', 'public.admin_export_approved_catalog_character_projection()', 'EXECUTE'
     ) OR has_function_privilege(
       'authenticated', 'public.admin_export_approved_catalog_character_projection()', 'EXECUTE'
     ) OR NOT has_function_privilege(
       'service_role', 'public.admin_export_approved_catalog_character_projection()', 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Approved export RPC must remain service-role only';
  END IF;
END;
$private_editorial_access_contract$;

-- A transaction-scoped execution proof. Every fixture row is rolled back.
BEGIN;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $ephemeral_acceptance$
DECLARE
  v_id uuid := '11111111-1111-4111-8111-111111111111';
  v_reviewer uuid := '22222222-2222-4222-8222-222222222222';
  v_profile jsonb;
  v_source jsonb := jsonb_build_object(
    'title', 'Verified official character profile',
    'url', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius/in-comics',
    'kind', 'official'
  );
  v_receipt jsonb;
  v_export jsonb;
  v_relation_revision integer;
  v_error boolean;
BEGIN
  IF private_api.tonart_public_https_evidence_url('https://localhost./private')
     OR private_api.tonart_public_https_evidence_url('https://127.0.0.1/internal')
     OR private_api.tonart_public_https_evidence_url('https://[::1]/internal')
     OR private_api.tonart_public_https_evidence_url('http://example.org/insecure')
     OR private_api.tonart_public_https_evidence_url('https://user:secret@example.org/a')
     OR NOT private_api.tonart_public_https_evidence_url('https://www.marvel.com/a') THEN
    RAISE EXCEPTION 'PostgreSQL accepted unsafe or rejected safe HTTPS evidence';
  END IF;

  INSERT INTO public.catalog_character_identities (
    id, identity_key, character_name, franchise, evidence_origin, evidence_note
  ) VALUES (
    v_id, 'acceptance/doctor-octopus', 'Doctor Octopus', 'Marvel',
    'https://www.marvel.com/characters/doctor-octopus-otto-octavius/in-comics',
    'Official identity evidence'
  );
  INSERT INTO public.catalog_curation_model_profiles (catalog_model_id, catalog_model_slug)
  VALUES ('model-one', 'model-one'), ('model-two', 'model-two');
  INSERT INTO public.catalog_curation_model_characters (
    catalog_model_id, character_identity_id, evidence_origin, evidence_note
  ) VALUES (
    'model-one', v_id,
    'https://www.marvel.com/characters/doctor-octopus-otto-octavius/in-comics',
    'Official linked model evidence'
  );

  v_profile := jsonb_build_object(
    'slug', 'doctor-octopus',
    'aliases', jsonb_build_array(jsonb_build_object(
      'name', 'Doc Ock', 'sources', jsonb_build_array(v_source)
    )),
    'biography', 'Original evidence-backed editorial biography.',
    'biographySources', jsonb_build_array(v_source),
    'ageContext', NULL,
    'ageSources', '[]'::jsonb,
    'originWork', 'Marvel Comics',
    'originWorkSources', jsonb_build_array(v_source),
    'characteristics', jsonb_build_array(jsonb_build_object(
      'name', 'Mechanical arms', 'sources', jsonb_build_array(v_source)
    )),
    'nameSources', jsonb_build_array(v_source),
    'franchiseSources', jsonb_build_array(v_source)
  );
  v_receipt := public.admin_save_catalog_character_editorial_profile(
    v_id, v_profile, 'reviewed', 0, v_reviewer
  );
  IF v_receipt ->> 'status' <> 'reviewed'
     OR (v_receipt ->> 'revision')::integer <> 1
     OR (v_receipt ->> 'relationRevision')::integer <> 1 THEN
    RAISE EXCEPTION 'Reviewed profile did not retain the canonical relation revision';
  END IF;
  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 1, 1, true, v_reviewer
  );
  IF v_receipt ->> 'publicationStatus' <> 'approved'
     OR (v_receipt ->> 'approvedRelationRevision')::integer <> 1 THEN
    RAISE EXCEPTION 'Approval lost the observed model relation revision';
  END IF;
  v_export := public.admin_export_approved_catalog_character_projection();
  IF v_export ->> 'schemaVersion' <> '1'
     OR v_export ->> 'source' <> 'public.admin_export_approved_catalog_character_projection'
     OR NULLIF(v_export ->> 'generatedAt', '') IS NULL THEN
    RAISE EXCEPTION 'Approved export header does not match the versioned Worker contract';
  END IF;
  IF (SELECT array_agg(key ORDER BY key COLLATE "C")
      FROM jsonb_object_keys(v_export) AS item(key))
     IS DISTINCT FROM ARRAY['characters', 'generatedAt', 'schemaVersion', 'source']::text[] THEN
    RAISE EXCEPTION 'Approved export leaked or omitted a top-level Worker contract field';
  END IF;
  IF (SELECT array_agg(key ORDER BY key COLLATE "C")
      FROM jsonb_object_keys(v_export -> 'characters' -> 0) AS item(key))
     IS DISTINCT FROM ARRAY[
       'approvalRef', 'approvedAt', 'approvedBy', 'approvedRelationRevision',
       'franchiseName', 'identityId', 'modelLinks', 'name', 'profile',
       'profileRevision', 'relationRevision', 'reviewedAt', 'reviewedBy', 'slug'
     ]::text[] THEN
    RAISE EXCEPTION 'Approved character does not match the versioned Worker contract';
  END IF;
  IF (SELECT array_agg(key ORDER BY key COLLATE "C")
      FROM jsonb_object_keys(v_export -> 'characters' -> 0 -> 'profile') AS item(key))
     IS DISTINCT FROM ARRAY[
       'ageContext', 'ageSources', 'aliases', 'biography', 'biographySources',
       'characteristics', 'franchiseSources', 'nameSources', 'originWork',
       'originWorkSources', 'slug'
     ]::text[] THEN
    RAISE EXCEPTION 'Approved profile does not match the versioned Worker contract';
  END IF;
  IF (SELECT array_agg(key ORDER BY key COLLATE "C")
      FROM jsonb_object_keys(v_export -> 'characters' -> 0 -> 'modelLinks' -> 0) AS item(key))
     IS DISTINCT FROM ARRAY['evidenceTitle', 'evidenceUrl', 'modelId', 'modelSlug']::text[] THEN
    RAISE EXCEPTION 'Approved model link does not match the versioned Worker contract';
  END IF;
  IF v_export -> 'characters' -> 0 -> 'profile' -> 'aliases' -> 0 ->> 'name' <> 'Doc Ock'
     OR jsonb_array_length(
       v_export -> 'characters' -> 0 -> 'profile' -> 'aliases' -> 0 -> 'sources'
     ) <> 1
     OR v_export -> 'characters' -> 0 -> 'profile' -> 'characteristics' -> 0 ->> 'name'
       <> 'Mechanical arms'
     OR jsonb_array_length(
       v_export -> 'characters' -> 0 -> 'profile' -> 'characteristics' -> 0 -> 'sources'
     ) <> 1 THEN
    RAISE EXCEPTION 'Approved aliases and attributes lost their claim-level evidence';
  END IF;
  IF jsonb_array_length(v_export -> 'characters') <> 1
     OR (v_export -> 'characters' -> 0 ->> 'approvedRelationRevision')::integer <> 1
     OR jsonb_array_length(v_export -> 'characters' -> 0 -> 'modelLinks') <> 1 THEN
    RAISE EXCEPTION 'Approved export does not match reviewed model evidence';
  END IF;

  -- Biography is optional; no biography sources are required or fabricated.
  v_profile := jsonb_set(v_profile, '{biography}', '""'::jsonb)
    - 'biographySources';
  v_receipt := public.admin_save_catalog_character_editorial_profile(
    v_id, v_profile, 'reviewed', 1, v_reviewer
  );
  IF v_receipt ->> 'status' <> 'reviewed'
     OR v_receipt -> 'profile' ->> 'biography' <> ''
     OR jsonb_array_length(v_receipt -> 'profile' -> 'biographySources') <> 0 THEN
    RAISE EXCEPTION 'Reviewed profile rejected an optional biography';
  END IF;
  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 2, 1, true, v_reviewer
  );
  v_export := public.admin_export_approved_catalog_character_projection();
  IF jsonb_array_length(v_export -> 'characters') <> 1
     OR v_export -> 'characters' -> 0 -> 'profile' ->> 'biography' <> ''
     OR jsonb_array_length(v_export -> 'characters' -> 0 -> 'profile' -> 'biographySources') <> 0 THEN
    RAISE EXCEPTION 'Approved export fabricated evidence for an optional biography';
  END IF;

  -- A changed relationship is not retroactively authorized by that approval.
  INSERT INTO public.catalog_curation_model_characters (
    catalog_model_id, character_identity_id, evidence_origin, evidence_note
  ) VALUES (
    'model-two', v_id,
    'https://www.marvel.com/characters/doctor-octopus-otto-octavius/in-comics',
    'Another verified model'
  );
  v_receipt := public.admin_get_catalog_character_editorial_profile(v_id);
  IF v_receipt ->> 'publicationStatus' <> 'not_approved'
     OR (v_receipt ->> 'relationRevision')::integer <> 2
     OR v_receipt -> 'approvedRelationRevision' <> 'null'::jsonb
     OR jsonb_array_length(v_receipt -> 'activeModelLinks') <> 2 THEN
    RAISE EXCEPTION 'New link did not invalidate the approved set';
  END IF;
  IF jsonb_array_length(
    public.admin_export_approved_catalog_character_projection() -> 'characters'
  ) <> 0 THEN
    RAISE EXCEPTION 'Stale approval leaked after an added model link';
  END IF;
  v_error := false;
  BEGIN
    PERFORM public.admin_set_catalog_character_publication_approval(
      v_id, 2, 1, true, v_reviewer
    );
  EXCEPTION WHEN SQLSTATE '40001' THEN
    v_error := true;
  END;
  IF NOT v_error THEN RAISE EXCEPTION 'Stale reviewer approval was accepted'; END IF;

  -- Explicit renewed human approval covers exactly two links.
  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 2, 2, true, v_reviewer
  );
  IF v_receipt ->> 'publicationStatus' <> 'approved' THEN
    RAISE EXCEPTION 'New approval for updated relations failed';
  END IF;
  UPDATE public.catalog_curation_model_characters
  SET evidence_note = 'Revised public citation'
  WHERE catalog_model_id = 'model-two' AND character_identity_id = v_id;
  v_receipt := public.admin_get_catalog_character_editorial_profile(v_id);
  IF v_receipt ->> 'publicationStatus' <> 'not_approved'
     OR (v_receipt ->> 'relationRevision')::integer <> 3 THEN
    RAISE EXCEPTION 'Evidence change failed to revoke public approval';
  END IF;
  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 2, 3, true, v_reviewer
  );
  UPDATE public.catalog_curation_model_profiles
  SET catalog_model_slug = 'model-two-revised'
  WHERE catalog_model_id = 'model-two';
  IF (public.admin_get_catalog_character_editorial_profile(v_id) ->>
      'publicationStatus') <> 'not_approved' THEN
    RAISE EXCEPTION 'Model slug drift left publication approved';
  END IF;
  v_relation_revision := (
    public.admin_get_catalog_character_editorial_profile(v_id) ->>
    'relationRevision'
  )::integer;

  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 2, v_relation_revision, true, v_reviewer
  );
  UPDATE public.catalog_character_identities
  SET evidence_note = 'New identity proof after approval'
  WHERE id = v_id;
  IF (public.admin_get_catalog_character_editorial_profile(v_id) ->>
      'publicationStatus') <> 'not_approved' THEN
    RAISE EXCEPTION 'Canonical identity drift was not revoked';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.admin_set_catalog_character_publication_approval(uuid,integer,integer,boolean,uuid)',
       'EXECUTE'
     ) OR has_function_privilege(
       'authenticated',
       'public.admin_export_approved_catalog_character_projection()',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'An untrusted role can invoke private publication RPCs';
  END IF;
  RAISE NOTICE 'TONART isolated PostgreSQL approval/revocation smoke PASS';
END;
$ephemeral_acceptance$;
ROLLBACK;

-- Run the pre-existing comprehensive SQL acceptance suite against this same
-- isolated PostgreSQL instance, after real canonical cutover/backfill.
-- The acceptance SQL requires an explicit staging session and independently
-- wraps its test fixtures in BEGIN/ROLLBACK. It never runs on production.
SET SESSION tonart.curation_acceptance_stage = 'staging';
\ir tonart_curated_model_characters_acceptance.sql
RESET tonart.curation_acceptance_stage;
