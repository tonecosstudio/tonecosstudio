-- Production photo metadata table and admin RPCs.

CREATE TABLE IF NOT EXISTS public.production_photo_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url text NOT NULL,
  production_stage_id uuid NOT NULL REFERENCES public.production_stages(id) ON DELETE CASCADE,
  customer_visible boolean NOT NULL DEFAULT false,
  caption text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_photo_metadata
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS production_stage_id uuid REFERENCES public.production_stages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by_name text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_stage_id
  ON public.production_photo_metadata(production_stage_id);
CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_photo_url
  ON public.production_photo_metadata(photo_url);

ALTER TABLE public.production_photo_metadata ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.production_photo_metadata FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.production_photo_metadata TO authenticated;

DROP POLICY IF EXISTS "production_photo_metadata_select_visible" ON public.production_photo_metadata;
CREATE POLICY "production_photo_metadata_select_visible"
  ON public.production_photo_metadata
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      customer_visible = true
      AND EXISTS (
        SELECT 1
        FROM public.production_stages ps
        JOIN public.production_queue pq ON pq.id = ps.production_queue_id
        WHERE ps.id = production_photo_metadata.production_stage_id
          AND pq.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "production_photo_metadata_admin_manage" ON public.production_photo_metadata;
CREATE POLICY "production_photo_metadata_admin_manage"
  ON public.production_photo_metadata
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_validate_photo_url(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text := NULLIF(btrim(COALESCE(p_url, '')), '');
BEGIN
  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Photo URL is required' USING ERRCODE = '22023';
  END IF;

  IF length(v_url) > 2000
    OR v_url ~ '[[:cntrl:]<>]'
    OR lower(v_url) !~ '^https?://' THEN
    RAISE EXCEPTION 'Invalid photo URL' USING ERRCODE = '22023';
  END IF;

  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_photo_caption(
  p_caption text,
  p_required boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caption text := NULLIF(btrim(COALESCE(p_caption, '')), '');
  v_control_check text;
BEGIN
  IF v_caption IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION 'Caption is required' USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  v_control_check := translate(v_caption, E'\n\r\t', '');

  IF length(v_caption) > 1000 OR v_control_check ~ '[[:cntrl:]]' OR v_caption ~ '[<>]' THEN
    RAISE EXCEPTION 'Invalid caption' USING ERRCODE = '22023';
  END IF;

  RETURN v_caption;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_photo_metadata_json(p_row public.production_photo_metadata)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'photo_url', p_row.photo_url,
    'production_stage_id', p_row.production_stage_id,
    'customer_visible', p_row.customer_visible,
    'caption', p_row.caption,
    'uploaded_by', p_row.uploaded_by,
    'uploaded_by_name', p_row.uploaded_by_name,
    'uploaded_at', p_row.uploaded_at,
    'updated_at', p_row.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_create_photo_metadata(
  p_photo_url text,
  p_production_stage_id uuid,
  p_customer_visible boolean,
  p_caption text DEFAULT NULL,
  p_uploaded_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo_url text := public.admin_validate_photo_url(p_photo_url);
  v_caption text := public.admin_validate_photo_caption(p_caption, false);
  v_uploaded_by_name text := public.admin_validate_choice_note(p_uploaded_by_name, 'uploader name', 160, false);
  v_row public.production_photo_metadata%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_production_stage_id IS NULL THEN
    RAISE EXCEPTION 'Production stage is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.production_stages WHERE id = p_production_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production stage not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_uploaded_by_name IS NULL THEN
    SELECT COALESCE(full_name, email)
    INTO v_uploaded_by_name
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  INSERT INTO public.production_photo_metadata (
    photo_url,
    production_stage_id,
    customer_visible,
    caption,
    uploaded_by,
    uploaded_by_name,
    updated_at
  )
  VALUES (
    v_photo_url,
    p_production_stage_id,
    COALESCE(p_customer_visible, false),
    v_caption,
    auth.uid(),
    v_uploaded_by_name,
    now()
  )
  RETURNING * INTO v_row;

  RETURN public.admin_photo_metadata_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_photo_metadata(
  p_photo_url text,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo_url text := public.admin_validate_photo_url(p_photo_url);
  v_caption text;
  v_customer_visible boolean;
  v_has_caption boolean := COALESCE(p_updates ? 'caption', false);
  v_has_customer_visible boolean := COALESCE(p_updates ? 'customer_visible', false);
  v_row public.production_photo_metadata%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(jsonb_typeof(p_updates), '') <> 'object' THEN
    RAISE EXCEPTION 'Invalid photo metadata update' USING ERRCODE = '22023';
  END IF;

  IF v_has_caption THEN
    v_caption := public.admin_validate_photo_caption(p_updates->>'caption', false);
  END IF;

  IF v_has_customer_visible THEN
    v_customer_visible := (p_updates->>'customer_visible')::boolean;
  END IF;

  UPDATE public.production_photo_metadata
  SET customer_visible = CASE WHEN v_has_customer_visible THEN v_customer_visible ELSE customer_visible END,
      caption = CASE WHEN v_has_caption THEN v_caption ELSE caption END,
      updated_at = now()
  WHERE photo_url = v_photo_url
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Photo metadata not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN public.admin_photo_metadata_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_photo_metadata(p_photo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo_url text := public.admin_validate_photo_url(p_photo_url);
  v_deleted_count integer;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.production_photo_metadata
  WHERE photo_url = v_photo_url;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Photo metadata not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_create_photo_metadata(
  p_production_stage_id uuid,
  p_photos jsonb,
  p_uploaded_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo jsonb;
  v_uploaded_by_name text := public.admin_validate_choice_note(p_uploaded_by_name, 'uploader name', 160, false);
  v_rows jsonb := '[]'::jsonb;
  v_row public.production_photo_metadata%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_production_stage_id IS NULL THEN
    RAISE EXCEPTION 'Production stage is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.production_stages WHERE id = p_production_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production stage not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(jsonb_typeof(p_photos), '') <> 'array' THEN
    RAISE EXCEPTION 'Photos must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_photos) > 25 THEN
    RAISE EXCEPTION 'Too many photos' USING ERRCODE = '22023';
  END IF;

  IF v_uploaded_by_name IS NULL THEN
    SELECT COALESCE(full_name, email)
    INTO v_uploaded_by_name
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  FOR v_photo IN SELECT value FROM jsonb_array_elements(p_photos)
  LOOP
    INSERT INTO public.production_photo_metadata (
      photo_url,
      production_stage_id,
      customer_visible,
      caption,
      uploaded_by,
      uploaded_by_name,
      updated_at
    )
    VALUES (
      public.admin_validate_photo_url(v_photo->>'url'),
      p_production_stage_id,
      COALESCE((v_photo->>'customerVisible')::boolean, false),
      public.admin_validate_photo_caption(v_photo->>'caption', false),
      auth.uid(),
      v_uploaded_by_name,
      now()
    )
    RETURNING * INTO v_row;

    v_rows := v_rows || jsonb_build_array(public.admin_photo_metadata_json(v_row));
  END LOOP;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stage_photos_with_metadata(p_stage_id uuid)
RETURNS TABLE (
  photo_url text,
  customer_visible boolean,
  caption text,
  uploaded_by_name text,
  uploaded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF p_stage_id IS NULL THEN
    RAISE EXCEPTION 'Production stage is required' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT ppm.photo_url,
         ppm.customer_visible,
         ppm.caption,
         ppm.uploaded_by_name,
         ppm.uploaded_at
  FROM public.production_photo_metadata ppm
  JOIN public.production_stages ps ON ps.id = ppm.production_stage_id
  JOIN public.production_queue pq ON pq.id = ps.production_queue_id
  WHERE ppm.production_stage_id = p_stage_id
    AND (
      v_is_admin
      OR (ppm.customer_visible = true AND pq.user_id = auth.uid())
    )
  ORDER BY ppm.uploaded_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_photo_url(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_photo_caption(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_photo_metadata_json(public.production_photo_metadata) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_photo_metadata(text, uuid, boolean, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_photo_metadata(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_photo_metadata(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_create_photo_metadata(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_stage_photos_with_metadata(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_photo_metadata(text, uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_photo_metadata(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_photo_metadata(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_create_photo_metadata(uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stage_photos_with_metadata(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_create_photo_metadata(text, uuid, boolean, text, text) IS
  'Admin-only production photo metadata creation.';
COMMENT ON FUNCTION public.admin_update_photo_metadata(text, jsonb) IS
  'Admin-only production photo metadata update.';
COMMENT ON FUNCTION public.admin_delete_photo_metadata(text) IS
  'Admin-only production photo metadata deletion.';
COMMENT ON FUNCTION public.admin_bulk_create_photo_metadata(uuid, jsonb, text) IS
  'Admin-only bulk production photo metadata creation.';
COMMENT ON FUNCTION public.get_stage_photos_with_metadata(uuid) IS
  'Returns production stage photos filtered by admin role or customer visibility.';

NOTIFY pgrst, 'reload schema';
