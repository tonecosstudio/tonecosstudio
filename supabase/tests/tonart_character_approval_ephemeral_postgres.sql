-- Isolated PostgreSQL 17 contract test, never a production migration.
-- Provides the pre-editorial minimum only, then runs the ORIGINAL migrations
-- unchanged. No Supabase keys, real data, external services or D1 writes.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA private_api;

CREATE TABLE public.catalog_character_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL UNIQUE,
  character_name text NOT NULL,
  franchise text NOT NULL,
  evidence_origin text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_curation_model_profiles (
  catalog_model_id text PRIMARY KEY,
  catalog_model_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_curation_model_characters (
  catalog_model_id text NOT NULL REFERENCES public.catalog_curation_model_profiles(catalog_model_id),
  character_identity_id uuid NOT NULL REFERENCES public.catalog_character_identities(id),
  evidence_origin text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  unlink_reason text,
  review_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY(catalog_model_id, character_identity_id)
);

-- These two supporting primitives exist in the pre-existing canonical
-- Supabase schema. The test uses their current semantics, but not its data.
CREATE FUNCTION private_api.assert_tonart_curation_service_role()
RETURNS void LANGUAGE plpgsql AS $guard$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service-only editorial RPC' USING ERRCODE = '42501';
  END IF;
END;
$guard$;
CREATE FUNCTION public.admin_validate_catalog_curation_text(
  p_value text, p_label text, p_max_length integer, p_required boolean DEFAULT true
)
RETURNS text LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp AS $text_validator$
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
$text_validator$;

-- The two canonical migration files are included, not copied into a fixture.
\ir ../migrations/20261117040000_tonart_character_editorial_profiles.sql
\ir ../migrations/20261118010000_tonart_public_character_approval_and_export.sql

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
    'aliases', '[]'::jsonb,
    'biography', 'Original evidence-backed editorial biography.',
    'biographySources', jsonb_build_array(v_source),
    'ageContext', NULL,
    'ageSources', '[]'::jsonb,
    'originWork', 'Marvel Comics',
    'originWorkSources', jsonb_build_array(v_source),
    'characteristics', '[]'::jsonb,
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
  IF jsonb_array_length(v_export -> 'characters') <> 1
     OR (v_export -> 'characters' -> 0 ->> 'approvedRelationRevision')::integer <> 1
     OR jsonb_array_length(v_export -> 'characters' -> 0 -> 'modelLinks') <> 1 THEN
    RAISE EXCEPTION 'Approved export does not match reviewed model evidence';
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
      v_id, 1, 1, true, v_reviewer
    );
  EXCEPTION WHEN SQLSTATE '40001' THEN
    v_error := true;
  END;
  IF NOT v_error THEN RAISE EXCEPTION 'Stale reviewer approval was accepted'; END IF;

  -- Explicit renewed human approval covers exactly two links.
  v_receipt := public.admin_set_catalog_character_publication_approval(
    v_id, 1, 2, true, v_reviewer
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
    v_id, 1, 3, true, v_reviewer
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
    v_id, 1, v_relation_revision, true, v_reviewer
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
