-- Admin images queue rejection RPC.
-- Keeps queue deletion behind the database admin boundary and compares the
-- storage target read by the Edge function before deleting the row.

ALTER TABLE public.images_queue
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS image_hash text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS ai_suggested_name text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_model_used text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'images_queue'
       AND column_name = 'source_url'
  ) THEN
    ALTER TABLE public.images_queue ALTER COLUMN source_url DROP NOT NULL;
  END IF;
END;
$$;

UPDATE public.images_queue
   SET original_filename = file_name
 WHERE original_filename IS NULL
   AND file_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_images_queue_image_hash
  ON public.images_queue(image_hash)
  WHERE image_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_images_queue_item(
  p_queue_id uuid,
  p_storage_bucket text,
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_bucket text := NULLIF(btrim(COALESCE(p_storage_bucket, '')), '');
  v_path text := NULLIF(btrim(COALESCE(p_storage_path, '')), '');
BEGIN
  PERFORM public.assert_admin_access();

  IF p_queue_id IS NULL THEN
    RAISE EXCEPTION 'QUEUE_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_bucket IS NULL OR v_path IS NULL THEN
    RAISE EXCEPTION 'STORAGE_TARGET_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT id, storage_bucket, storage_path
    INTO v_row
    FROM public.images_queue
   WHERE id = p_queue_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUEUE_ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.storage_bucket IS DISTINCT FROM v_bucket
    OR v_row.storage_path IS DISTINCT FROM v_path THEN
    RAISE EXCEPTION 'QUEUE_ITEM_CHANGED' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.images_queue
   WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'storageBucket', v_row.storage_bucket,
    'storagePath', v_row.storage_path
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_images_queue_item(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_images_queue_item(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_delete_images_queue_item(uuid, text, text) IS
  'Admin-only deletion for rejected images_queue rows, guarded by storage target comparison.';

NOTIFY pgrst, 'reload schema';
