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
  v_history jsonb;
  v_expected_failure boolean;
  v_n integer;
BEGIN
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
       'public.admin_unlink_catalog_model_character(text,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Curation leaked to public roles' USING ERRCODE = '42501';
  END IF;
  IF NOT has_function_privilege('service_role',
    'public.admin_unlink_catalog_model_character(text,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Editorial gateway lost required execute grant'
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

  -- Idempotent re-approval of an ACTIVE link cannot modify first link proof.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'manual_admin:acceptance_duplicate', 'Should not overwrite link proof'
  );
  IF (SELECT evidence_origin FROM public.catalog_curation_model_characters
      WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a)
       IS DISTINCT FROM 'manual_admin:acceptance_original' THEN
    RAISE EXCEPTION 'Idempotent review rewrote original link provenance';
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
  IF jsonb_array_length(v_history) <> 1
     OR (v_history->0->>'action') IS DISTINCT FROM 'unlinked' THEN
    RAISE EXCEPTION 'Unlink reason was not recorded';
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

  -- Restoration must reuse the link and retain BOTH the earlier decision
  -- and original proof. New reviewed proof belongs to the history event.
  PERFORM public.admin_verify_catalog_model_identity(
    v_model_a, v_slug_a, v_name_a, v_franchise,
    'manual_admin:acceptance_restored', 'Restored after manual reassessment'
  );
  SELECT review_history INTO STRICT v_history
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND character_identity_id = v_id_a
    AND unlinked_at IS NULL AND unlink_reason IS NULL
    AND evidence_origin = 'manual_admin:acceptance_original';
  IF jsonb_array_length(v_history) <> 2
     OR (v_history->1->>'action') IS DISTINCT FROM 'restored'
     OR (v_history->1->>'note') IS DISTINCT FROM 'Restored after manual reassessment' THEN
    RAISE EXCEPTION 'Restoration lost previous approval, link, or review history';
  END IF;

  -- The 12-active-character ceiling must be enforced server-side.
  FOR v_n IN 3..12 LOOP
    PERFORM public.admin_verify_catalog_model_identity(
      v_model_a, v_slug_a, 'TONART acceptance extra ' || v_n || ' ' || v_suffix,
      v_franchise, 'manual_admin:acceptance_limit', NULL
    );
  END LOOP;
  SELECT count(*) INTO v_count
  FROM public.catalog_curation_model_characters
  WHERE catalog_model_id = v_model_a AND unlinked_at IS NULL;
  IF v_count <> 12 THEN
    RAISE EXCEPTION 'Expected exactly 12 active character links, found %', v_count;
  END IF;
  v_expected_failure := false;
  BEGIN
    PERFORM public.admin_verify_catalog_model_identity(
      v_model_a, v_slug_a, 'TONART acceptance over-limit ' || v_suffix,
      v_franchise, 'manual_admin:acceptance_limit', NULL
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_expected_failure := true;
  END;
  IF NOT v_expected_failure THEN
    RAISE EXCEPTION 'Thirteenth active character was not rejected';
  END IF;

  RAISE NOTICE 'TONART character staging acceptance PASS (transaction rolled back)';
END;
$tonart_acceptance$;

ROLLBACK;
