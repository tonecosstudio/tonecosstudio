-- Collector and quote production write RPCs.

CREATE TABLE IF NOT EXISTS public.public_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  notes text NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_collection
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS model_id uuid,
  ADD COLUMN IF NOT EXISTS notes text NULL,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.quote_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE,
  current_stage text NOT NULL DEFAULT 'queued',
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quote_production_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  stage text NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quote_production_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  update_id uuid NOT NULL,
  url text NOT NULL,
  caption text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.quote_production
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

ALTER TABLE public.quote_production_updates
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS note text NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

ALTER TABLE public.quote_production_photos
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS update_id uuid,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS caption text NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'quote_production_quote_id_key'
       AND conrelid = 'public.quote_production'::regclass
  ) THEN
    ALTER TABLE public.quote_production
      ADD CONSTRAINT quote_production_quote_id_key UNIQUE (quote_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'quote_production_stage_check'
       AND conrelid = 'public.quote_production'::regclass
  ) THEN
    ALTER TABLE public.quote_production
      ADD CONSTRAINT quote_production_stage_check
      CHECK (current_stage IN ('queued', 'printing', 'finishing', 'painting', 'inspection', 'shipped'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'quote_production_updates_stage_check'
       AND conrelid = 'public.quote_production_updates'::regclass
  ) THEN
    ALTER TABLE public.quote_production_updates
      ADD CONSTRAINT quote_production_updates_stage_check
      CHECK (stage IN ('queued', 'printing', 'finishing', 'painting', 'inspection', 'shipped'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'public_collection_display_order_check'
       AND conrelid = 'public.public_collection'::regclass
  ) THEN
    ALTER TABLE public.public_collection
      ADD CONSTRAINT public_collection_display_order_check
      CHECK (display_order >= 0)
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_public_collection_user_id
  ON public.public_collection (user_id);
CREATE INDEX IF NOT EXISTS idx_public_collection_model_id
  ON public.public_collection (model_id);
CREATE INDEX IF NOT EXISTS idx_public_collection_order
  ON public.public_collection (user_id, display_order);

CREATE INDEX IF NOT EXISTS idx_quote_production_quote_id
  ON public.quote_production (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_production_updates_quote_id
  ON public.quote_production_updates (quote_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_production_photos_update_id
  ON public.quote_production_photos (update_id, created_at);

ALTER TABLE public.public_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_production_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_collection_select_public ON public.public_collection;
DROP POLICY IF EXISTS public_collection_service_role_all ON public.public_collection;
DROP POLICY IF EXISTS quote_production_select_authenticated ON public.quote_production;
DROP POLICY IF EXISTS quote_production_updates_select_authenticated ON public.quote_production_updates;
DROP POLICY IF EXISTS quote_production_photos_select_authenticated ON public.quote_production_photos;
DROP POLICY IF EXISTS quote_production_service_role_all ON public.quote_production;
DROP POLICY IF EXISTS quote_production_updates_service_role_all ON public.quote_production_updates;
DROP POLICY IF EXISTS quote_production_photos_service_role_all ON public.quote_production_photos;

CREATE POLICY public_collection_select_public
  ON public.public_collection
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_collection_service_role_all
  ON public.public_collection
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY quote_production_select_authenticated
  ON public.quote_production
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY quote_production_updates_select_authenticated
  ON public.quote_production_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY quote_production_photos_select_authenticated
  ON public.quote_production_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY quote_production_service_role_all
  ON public.quote_production
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY quote_production_updates_service_role_all
  ON public.quote_production_updates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY quote_production_photos_service_role_all
  ON public.quote_production_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.public_collection FROM PUBLIC;
GRANT SELECT ON public.public_collection TO anon, authenticated;
GRANT ALL ON public.public_collection TO service_role;

REVOKE ALL ON public.quote_production FROM PUBLIC, anon;
REVOKE ALL ON public.quote_production_updates FROM PUBLIC, anon;
REVOKE ALL ON public.quote_production_photos FROM PUBLIC, anon;
GRANT SELECT ON public.quote_production TO authenticated;
GRANT SELECT ON public.quote_production_updates TO authenticated;
GRANT SELECT ON public.quote_production_photos TO authenticated;
GRANT ALL ON public.quote_production TO service_role;
GRANT ALL ON public.quote_production_updates TO service_role;
GRANT ALL ON public.quote_production_photos TO service_role;

CREATE OR REPLACE FUNCTION public.validate_production_stage(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := public.customer_mutation_validate_text(p_stage, 'stage', 40, true);
BEGIN
  IF v_stage NOT IN ('queued', 'printing', 'finishing', 'painting', 'inspection', 'shipped') THEN
    RAISE EXCEPTION 'Invalid production stage' USING ERRCODE = '22023';
  END IF;

  RETURN v_stage;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_collection_row_to_json(p_row public.public_collection)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'user_id', p_row.user_id,
    'model_id', p_row.model_id,
    'notes', p_row.notes,
    'display_order', p_row.display_order,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION public.quote_production_row_to_json(p_row public.quote_production)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'quote_id', p_row.quote_id,
    'current_stage', p_row.current_stage,
    'started_at', p_row.started_at,
    'updated_at', p_row.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION public.quote_production_photo_row_to_json(p_row public.quote_production_photos)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_row.id,
    'quote_id', p_row.quote_id,
    'update_id', p_row.update_id,
    'url', p_row.url,
    'caption', p_row.caption,
    'created_at', p_row.created_at,
    'created_by', p_row.created_by
  );
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_collector_profile(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_username text;
  v_row public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Collector profile payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_updates)
  LOOP
    IF v_key NOT IN ('username', 'display_name', 'bio', 'avatar_url', 'is_public') THEN
      RAISE EXCEPTION 'Unsupported collector profile field: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'is_public' AND jsonb_typeof(v_value) <> 'boolean' THEN
      RAISE EXCEPTION 'is_public must be boolean' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_updates ? 'username' THEN
    v_username := lower(public.customer_mutation_validate_text(p_updates->>'username', 'username', 32, false));

    IF v_username IS NOT NULL AND v_username !~ '^[a-z0-9_]{3,32}$' THEN
      RAISE EXCEPTION 'username is invalid' USING ERRCODE = '22023';
    END IF;

    IF v_username IS NOT NULL
       AND EXISTS (
         SELECT 1
           FROM public.profiles
          WHERE lower(username) = v_username
            AND id <> v_user_id
       ) THEN
      RAISE EXCEPTION 'username is already in use' USING ERRCODE = '23505';
    END IF;
  END IF;

  PERFORM public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false);
  PERFORM public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false);
  PERFORM public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false);

  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
     SET username = CASE WHEN p_updates ? 'username' THEN v_username ELSE username END,
         display_name = CASE WHEN p_updates ? 'display_name'
           THEN public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false)
           ELSE display_name
         END,
         bio = CASE WHEN p_updates ? 'bio'
           THEN public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false)
           ELSE bio
         END,
         avatar_url = CASE WHEN p_updates ? 'avatar_url'
           THEN public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false)
           ELSE avatar_url
         END,
         is_public = CASE WHEN p_updates ? 'is_public'
           THEN (p_updates->>'is_public')::boolean
           ELSE is_public
         END,
         updated_at = now()
   WHERE id = v_user_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_current_user_public_collection_item(
  p_model_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_notes text := public.customer_mutation_validate_text(p_notes, 'notes', 500, false);
  v_order integer;
  v_row public.public_collection%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_model_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.models WHERE id = p_model_id) THEN
    RAISE EXCEPTION 'Model not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_row
    FROM public.public_collection
   WHERE user_id = v_user_id
     AND model_id = p_model_id
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    UPDATE public.public_collection
       SET notes = COALESCE(v_notes, notes),
           updated_at = now()
     WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN public.public_collection_row_to_json(v_row);
  END IF;

  SELECT COALESCE(MAX(display_order), -1) + 1
    INTO v_order
    FROM public.public_collection
   WHERE user_id = v_user_id;

  INSERT INTO public.public_collection (
    user_id,
    model_id,
    notes,
    display_order
  )
  VALUES (
    v_user_id,
    p_model_id,
    v_notes,
    v_order
  )
  RETURNING * INTO v_row;

  RETURN public.public_collection_row_to_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_current_user_public_collection_item(p_collection_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.public_collection
   WHERE id = p_collection_id
     AND user_id = v_user_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'Collection item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_deleted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_public_collection_notes(
  p_collection_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_notes text := public.customer_mutation_validate_text(p_notes, 'notes', 500, false);
  v_row public.public_collection%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.public_collection
     SET notes = v_notes,
         updated_at = now()
   WHERE id = p_collection_id
     AND user_id = v_user_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Collection item not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN public.public_collection_row_to_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_public_collection_order(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_id uuid;
  v_display_order integer;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'too many collection items' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'collection order item must be an object' USING ERRCODE = '22023';
    END IF;

    v_id := (v_item->>'id')::uuid;
    v_display_order := (v_item->>'display_order')::integer;

    IF v_id IS NULL OR v_display_order IS NULL OR v_display_order < 0 OR v_display_order > 10000 THEN
      RAISE EXCEPTION 'invalid collection order item' USING ERRCODE = '22023';
    END IF;

    UPDATE public.public_collection
       SET display_order = v_display_order,
           updated_at = now()
     WHERE id = v_id
       AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Collection item not found' USING ERRCODE = 'P0002';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_quote_production(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.quote_production%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION 'quote_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_row
    FROM public.quote_production
   WHERE quote_id = p_quote_id;

  IF v_row.id IS NULL THEN
    INSERT INTO public.quote_production (
      quote_id,
      current_stage,
      created_by
    )
    VALUES (
      p_quote_id,
      'queued',
      auth.uid()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN public.quote_production_row_to_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_quote_production_stage(
  p_quote_id uuid,
  p_stage text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stage text := public.validate_production_stage(p_stage);
  v_note text := public.customer_mutation_validate_text(p_note, 'note', 1000, false);
  v_update_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION 'quote_id is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quote_production (
    quote_id,
    current_stage,
    created_by
  )
  VALUES (
    p_quote_id,
    v_stage,
    auth.uid()
  )
  ON CONFLICT (quote_id) DO UPDATE
    SET current_stage = EXCLUDED.current_stage,
        updated_at = now()
  RETURNING id INTO v_update_id;

  INSERT INTO public.quote_production_updates (
    quote_id,
    stage,
    note,
    created_by
  )
  VALUES (
    p_quote_id,
    v_stage,
    v_note,
    auth.uid()
  )
  RETURNING id INTO v_update_id;

  RETURN jsonb_build_object('id', v_update_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_quote_production_photo(
  p_quote_id uuid,
  p_update_id uuid,
  p_url text,
  p_caption text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text := public.customer_mutation_validate_text(p_url, 'url', 2000, true);
  v_caption text := public.customer_mutation_validate_text(p_caption, 'caption', 300, false);
  v_row public.quote_production_photos%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_quote_id IS NULL OR p_update_id IS NULL THEN
    RAISE EXCEPTION 'quote_id and update_id are required' USING ERRCODE = '22023';
  END IF;

  IF v_url !~* '^https?://' THEN
    RAISE EXCEPTION 'url must be an HTTP(S) URL' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.quote_production_updates
     WHERE id = p_update_id
       AND quote_id = p_quote_id
  ) THEN
    RAISE EXCEPTION 'Production update not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.quote_production_photos (
    quote_id,
    update_id,
    url,
    caption,
    created_by
  )
  VALUES (
    p_quote_id,
    p_update_id,
    v_url,
    v_caption,
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN public.quote_production_photo_row_to_json(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_production_stage(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_collection_row_to_json(public.public_collection) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_production_row_to_json(public.quote_production) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_production_photo_row_to_json(public.quote_production_photos) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_current_user_collector_profile(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_current_user_public_collection_item(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_current_user_public_collection_item(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_current_user_public_collection_notes(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_current_user_public_collection_order(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_quote_production(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_quote_production_stage(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_quote_production_photo(uuid, uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_current_user_collector_profile(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_current_user_public_collection_item(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_current_user_public_collection_item(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_current_user_public_collection_notes(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_current_user_public_collection_order(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_quote_production(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_quote_production_stage(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_quote_production_photo(uuid, uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.update_current_user_collector_profile(jsonb) IS
  'Validated current-user collector profile mutation.';
COMMENT ON FUNCTION public.add_current_user_public_collection_item(uuid, text) IS
  'Validated current-user public collection add/update.';
COMMENT ON FUNCTION public.set_quote_production_stage(uuid, text, text) IS
  'Admin-only atomic quote production stage mutation with history.';

NOTIFY pgrst, 'reload schema';
