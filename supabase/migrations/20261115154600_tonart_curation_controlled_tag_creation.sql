-- Adds the admin-only vocabulary operation after the internal curation tables.
-- Does not classify models or affect commercial collection publication.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_create_catalog_curation_tag(
  p_dimension text,
  p_slug text,
  p_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $createtag$
DECLARE
  v_dimension text := NULLIF(btrim(COALESCE(p_dimension, '')), '');
  v_slug text := lower(NULLIF(btrim(COALESCE(p_slug, '')), ''));
  v_label text;
  v_id uuid;
BEGIN
  PERFORM private_api.assert_tonart_curation_service_role();

  IF v_dimension IS NULL
     OR v_dimension NOT IN ('theme_genre', 'characteristic', 'narrative_role') THEN
    RAISE EXCEPTION 'Invalid curation tag dimension' USING ERRCODE = '22023';
  END IF;
  IF v_slug IS NULL OR v_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' THEN
    RAISE EXCEPTION 'Invalid curation tag slug' USING ERRCODE = '22023';
  END IF;
  v_label := public.admin_validate_catalog_curation_text(
    p_label, 'curation tag label', 120
  );

  -- Canonical slugs cannot collide with tags or aliases in their dimension.
  IF EXISTS (
    SELECT 1 FROM public.catalog_curation_tags
    WHERE dimension = v_dimension AND slug = v_slug
  ) THEN
    RAISE EXCEPTION 'Invalid curation tag: canonical slug already exists'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.catalog_curation_tags (
    id, dimension, slug, label, status, definition_origin
  )
  VALUES (
    gen_random_uuid(), v_dimension, v_slug, v_label, 'active',
    'manual_admin:controlled_vocabulary'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'dimension', v_dimension,
    'slug', v_slug,
    'label', v_label,
    'status', 'active',
    'definitionOrigin', 'manual_admin:controlled_vocabulary',
    'aliases', '[]'::jsonb
  );
END;
$createtag$;

REVOKE ALL ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_catalog_curation_tag(text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
