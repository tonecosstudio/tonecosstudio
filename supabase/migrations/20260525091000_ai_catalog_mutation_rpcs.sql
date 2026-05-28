-- AI classification and image queue mutation RPCs.

CREATE TABLE IF NOT EXISTS public.ai_name_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  franchise text NULL,
  category text NULL,
  subcategory text NULL,
  tags text[] NULL,
  model text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_vision_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash text NOT NULL UNIQUE,
  name text NOT NULL,
  franchise text NULL,
  category text NULL,
  subcategory text NULL,
  tags text[] NULL,
  confidence numeric NULL,
  model text NULL,
  cost_usd numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_images integer NOT NULL DEFAULT 0,
  processed_images integer NOT NULL DEFAULT 0,
  failed_images integer NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  model_used text NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS franchise text NULL,
  ADD COLUMN IF NOT EXISTS category text NULL,
  ADD COLUMN IF NOT EXISTS subcategory text NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NULL,
  ADD COLUMN IF NOT EXISTS image_bucket text NULL,
  ADD COLUMN IF NOT EXISTS image_path text NULL;

ALTER TABLE public.images_queue
  ADD COLUMN IF NOT EXISTS ai_suggested_name text NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric NULL,
  ADD COLUMN IF NOT EXISTS ai_model_used text NULL,
  ADD COLUMN IF NOT EXISTS name text NULL,
  ADD COLUMN IF NOT EXISTS franchise text NULL,
  ADD COLUMN IF NOT EXISTS category text NULL,
  ADD COLUMN IF NOT EXISTS subcategory text NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NULL,
  ADD COLUMN IF NOT EXISTS last_error text NULL,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ai_name_cache_name
  ON public.ai_name_cache (name);
CREATE INDEX IF NOT EXISTS idx_ai_vision_cache_image_hash
  ON public.ai_vision_cache (image_hash);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_created_at
  ON public.ai_processing_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_franchises_canonical
  ON public.franchises (canonical);

ALTER TABLE public.ai_name_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_vision_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_name_cache_select_admin ON public.ai_name_cache;
DROP POLICY IF EXISTS ai_name_cache_service_role_all ON public.ai_name_cache;
DROP POLICY IF EXISTS ai_vision_cache_select_admin ON public.ai_vision_cache;
DROP POLICY IF EXISTS ai_vision_cache_service_role_all ON public.ai_vision_cache;
DROP POLICY IF EXISTS ai_processing_jobs_select_admin ON public.ai_processing_jobs;
DROP POLICY IF EXISTS ai_processing_jobs_service_role_all ON public.ai_processing_jobs;
DROP POLICY IF EXISTS franchises_select_all ON public.franchises;
DROP POLICY IF EXISTS franchises_service_role_all ON public.franchises;

CREATE POLICY ai_name_cache_select_admin
  ON public.ai_name_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY ai_name_cache_service_role_all
  ON public.ai_name_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY ai_vision_cache_select_admin
  ON public.ai_vision_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY ai_vision_cache_service_role_all
  ON public.ai_vision_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY ai_processing_jobs_select_admin
  ON public.ai_processing_jobs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY ai_processing_jobs_service_role_all
  ON public.ai_processing_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY franchises_select_all
  ON public.franchises
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY franchises_service_role_all
  ON public.franchises
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.ai_name_cache FROM PUBLIC, anon;
REVOKE ALL ON public.ai_vision_cache FROM PUBLIC, anon;
REVOKE ALL ON public.ai_processing_jobs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_name_cache FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_vision_cache FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_processing_jobs FROM authenticated;
GRANT SELECT ON public.ai_name_cache TO authenticated;
GRANT SELECT ON public.ai_vision_cache TO authenticated;
GRANT SELECT ON public.ai_processing_jobs TO authenticated;
GRANT ALL ON public.ai_name_cache TO service_role;
GRANT ALL ON public.ai_vision_cache TO service_role;
GRANT ALL ON public.ai_processing_jobs TO service_role;
GRANT SELECT ON public.franchises TO anon, authenticated;
GRANT ALL ON public.franchises TO service_role;

CREATE OR REPLACE FUNCTION public.assert_ai_catalog_mutation_access()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN;
  END IF;

  PERFORM public.assert_admin_access();
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_catalog_validate_tags(p_tags text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result text[] := ARRAY[]::text[];
  v_tag text;
BEGIN
  IF p_tags IS NULL THEN
    RETURN NULL;
  END IF;

  IF cardinality(p_tags) > 30 THEN
    RAISE EXCEPTION 'tags has too many items' USING ERRCODE = '22023';
  END IF;

  FOREACH v_tag IN ARRAY p_tags
  LOOP
    v_result := v_result || public.customer_mutation_validate_text(v_tag, 'tag', 60, true);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_ai_name_cache(
  p_name text,
  p_franchise text,
  p_category text,
  p_subcategory text,
  p_tags text[],
  p_model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.customer_mutation_validate_text(p_name, 'name', 500, true);
  v_franchise text := public.customer_mutation_validate_text(p_franchise, 'franchise', 160, false);
  v_category text := public.customer_mutation_validate_text(p_category, 'category', 120, false);
  v_subcategory text := public.customer_mutation_validate_text(p_subcategory, 'subcategory', 120, false);
  v_model text := public.customer_mutation_validate_text(p_model, 'model', 120, false);
  v_tags text[] := public.ai_catalog_validate_tags(p_tags);
  v_row public.ai_name_cache%ROWTYPE;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  INSERT INTO public.ai_name_cache (
    name,
    franchise,
    category,
    subcategory,
    tags,
    model
  )
  VALUES (
    v_name,
    v_franchise,
    v_category,
    v_subcategory,
    v_tags,
    v_model
  )
  ON CONFLICT (name) DO UPDATE
    SET franchise = EXCLUDED.franchise,
        category = EXCLUDED.category,
        subcategory = EXCLUDED.subcategory,
        tags = EXCLUDED.tags,
        model = EXCLUDED.model,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_ai_vision_cache(
  p_image_hash text,
  p_name text,
  p_franchise text,
  p_category text,
  p_subcategory text,
  p_tags text[],
  p_confidence numeric,
  p_model text,
  p_cost_usd numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_image_hash text := public.customer_mutation_validate_text(p_image_hash, 'image_hash', 160, true);
  v_name text := public.customer_mutation_validate_text(p_name, 'name', 500, true);
  v_franchise text := public.customer_mutation_validate_text(p_franchise, 'franchise', 160, false);
  v_category text := public.customer_mutation_validate_text(p_category, 'category', 120, false);
  v_subcategory text := public.customer_mutation_validate_text(p_subcategory, 'subcategory', 120, false);
  v_model text := public.customer_mutation_validate_text(p_model, 'model', 120, false);
  v_tags text[] := public.ai_catalog_validate_tags(p_tags);
  v_row public.ai_vision_cache%ROWTYPE;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_cost_usd IS NOT NULL AND p_cost_usd < 0 THEN
    RAISE EXCEPTION 'cost_usd is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_vision_cache (
    image_hash,
    name,
    franchise,
    category,
    subcategory,
    tags,
    confidence,
    model,
    cost_usd
  )
  VALUES (
    v_image_hash,
    v_name,
    v_franchise,
    v_category,
    v_subcategory,
    v_tags,
    p_confidence,
    v_model,
    p_cost_usd
  )
  ON CONFLICT (image_hash) DO UPDATE
    SET name = EXCLUDED.name,
        franchise = EXCLUDED.franchise,
        category = EXCLUDED.category,
        subcategory = EXCLUDED.subcategory,
        tags = EXCLUDED.tags,
        confidence = EXCLUDED.confidence,
        model = EXCLUDED.model,
        cost_usd = EXCLUDED.cost_usd,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_image_queue_ai_result(
  p_queue_id uuid,
  p_name text,
  p_confidence numeric,
  p_model text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.customer_mutation_validate_text(p_name, 'name', 500, true);
  v_model text := public.customer_mutation_validate_text(p_model, 'model', 120, false);
  v_id uuid;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF p_queue_id IS NULL THEN
    RAISE EXCEPTION 'queue_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence is invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.images_queue
     SET ai_suggested_name = v_name,
         ai_confidence = p_confidence,
         ai_model_used = v_model,
         updated_at = now()
   WHERE id = p_queue_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Queue item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ai_processing_job(
  p_total_images integer,
  p_model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_model text := public.customer_mutation_validate_text(p_model, 'model', 120, false);
  v_row public.ai_processing_jobs%ROWTYPE;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF p_total_images IS NULL OR p_total_images < 1 OR p_total_images > 1000 THEN
    RAISE EXCEPTION 'total_images is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_processing_jobs (
    total_images,
    processed_images,
    failed_images,
    status,
    model_used
  )
  VALUES (
    p_total_images,
    0,
    0,
    'processing',
    v_model
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_processing_job_progress(
  p_job_id uuid,
  p_processed_images integer,
  p_failed_images integer,
  p_total_cost_usd numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'job_id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_processed_images, 0) < 0 OR COALESCE(p_failed_images, 0) < 0 OR COALESCE(p_total_cost_usd, 0) < 0 THEN
    RAISE EXCEPTION 'job progress is invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_processing_jobs
     SET processed_images = p_processed_images,
         failed_images = p_failed_images,
         total_cost_usd = COALESCE(p_total_cost_usd, 0),
         updated_at = now()
   WHERE id = p_job_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'AI processing job not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_processing_job(
  p_job_id uuid,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := public.customer_mutation_validate_text(p_status, 'status', 40, true);
  v_id uuid;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF v_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'status is invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_processing_jobs
     SET status = v_status,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_job_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'AI processing job not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_image_queue_model(
  p_queue_id uuid,
  p_created_by uuid,
  p_name text,
  p_franchise text,
  p_category text,
  p_subcategory text,
  p_tags text[],
  p_image_bucket text,
  p_image_path text,
  p_franchise_override text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := public.customer_mutation_validate_text(p_name, 'name', 500, true);
  v_franchise text := public.customer_mutation_validate_text(p_franchise, 'franchise', 160, false);
  v_category text := public.customer_mutation_validate_text(p_category, 'category', 120, false);
  v_subcategory text := public.customer_mutation_validate_text(p_subcategory, 'subcategory', 120, false);
  v_tags text[] := public.ai_catalog_validate_tags(p_tags);
  v_image_bucket text := public.customer_mutation_validate_text(p_image_bucket, 'image_bucket', 120, true);
  v_image_path text := public.customer_mutation_validate_text(p_image_path, 'image_path', 1000, true);
  v_franchise_override text := public.customer_mutation_validate_text(p_franchise_override, 'franchise_override', 160, false);
  v_existing_franchise public.franchises%ROWTYPE;
  v_model_id uuid;
BEGIN
  PERFORM public.assert_ai_catalog_mutation_access();

  IF p_queue_id IS NULL OR p_created_by IS NULL THEN
    RAISE EXCEPTION 'queue_id and created_by are required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.images_queue WHERE id = p_queue_id) THEN
    RAISE EXCEPTION 'Queue item not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_franchise_override IS NOT NULL THEN
    INSERT INTO public.franchise_rules (
      created_by,
      pattern,
      franchise_canonical,
      enabled,
      priority,
      note
    )
    VALUES (
      p_created_by,
      v_name,
      v_franchise_override,
      true,
      50,
      'auto: confirmado na esteira'
    );
  END IF;

  IF v_franchise IS NOT NULL THEN
    SELECT *
      INTO v_existing_franchise
      FROM public.franchises
     WHERE canonical = v_franchise;

    IF v_existing_franchise.id IS NULL THEN
      INSERT INTO public.franchises (canonical, aliases)
      VALUES (v_franchise, ARRAY[v_franchise]);
    ELSIF NOT v_franchise = ANY(v_existing_franchise.aliases) THEN
      UPDATE public.franchises
         SET aliases = v_existing_franchise.aliases || v_franchise,
             updated_at = now()
       WHERE id = v_existing_franchise.id;
    END IF;
  END IF;

  INSERT INTO public.models (
    created_by,
    name,
    franchise,
    category,
    subcategory,
    tags,
    image_bucket,
    image_path
  )
  VALUES (
    p_created_by,
    v_name,
    v_franchise,
    v_category,
    v_subcategory,
    v_tags,
    v_image_bucket,
    v_image_path
  )
  RETURNING id INTO v_model_id;

  UPDATE public.images_queue
     SET status = 'processed',
         name = v_name,
         franchise = v_franchise,
         category = v_category,
         subcategory = v_subcategory,
         tags = v_tags,
         last_error = NULL,
         processed_at = now(),
         updated_at = now()
   WHERE id = p_queue_id;

  RETURN jsonb_build_object('model_id', v_model_id);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_ai_catalog_mutation_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_catalog_validate_tags(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_ai_name_cache(text, text, text, text, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_ai_vision_cache(text, text, text, text, text, text[], numeric, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_image_queue_ai_result(uuid, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_ai_processing_job(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ai_processing_job_progress(uuid, integer, integer, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_ai_processing_job(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_image_queue_model(uuid, uuid, text, text, text, text, text[], text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_ai_name_cache(text, text, text, text, text[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_ai_vision_cache(text, text, text, text, text, text[], numeric, text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_image_queue_ai_result(uuid, text, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_ai_processing_job(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_ai_processing_job_progress(uuid, integer, integer, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_processing_job(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_image_queue_model(uuid, uuid, text, text, text, text, text[], text, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.confirm_image_queue_model(uuid, uuid, text, text, text, text, text[], text, text, text) IS
  'Admin/service validated model creation and image queue completion in one database transaction.';

NOTIFY pgrst, 'reload schema';
