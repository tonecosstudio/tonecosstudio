-- Make support attachments private and remove browser-side write authority.
-- Objects are written only by service-role Edge Functions. Authenticated clients
-- can read only attachments they are authorized to see and admins may delete.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove any older bucket-specific object policies, including policies created
-- manually in the dashboard, before installing the canonical policy set.
DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual, '') ILIKE '%support-attachments%'
        OR COALESCE(with_check, '') ILIKE '%support-attachments%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', v_policy.policyname);
  END LOOP;
END $$;

CREATE POLICY "support_attachments_storage_select_authorized"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.support_attachments sa
      JOIN public.support_messages sm ON sm.id = sa.message_id
      JOIN public.support_conversations sc ON sc.id = sm.conversation_id
      WHERE (sa.file_path = storage.objects.name OR sa.thumbnail_path = storage.objects.name)
        AND (
          public.current_user_role() IN ('admin', 'super_admin')
          OR (
            sc.user_id = auth.uid()
            AND COALESCE(sm.is_internal, false) = false
          )
        )
    )
  );

CREATE POLICY "support_attachments_storage_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND public.current_user_role() IN ('admin', 'super_admin')
  );

-- Metadata is not directly mutable through the Data API. The existing public
-- RPC remains the stable authenticated entry point and delegates to private_api.
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.support_attachments FROM anon, authenticated;
GRANT SELECT ON public.support_attachments TO authenticated;

DROP POLICY IF EXISTS "support_attachments_select_own" ON public.support_attachments;
DROP POLICY IF EXISTS "support_attachments_select_admin" ON public.support_attachments;
DROP POLICY IF EXISTS "support_attachments_insert_own" ON public.support_attachments;
DROP POLICY IF EXISTS "support_attachments_insert_admin" ON public.support_attachments;
DROP POLICY IF EXISTS "support_attachments_delete_admin" ON public.support_attachments;

CREATE POLICY "support_attachments_select_own"
  ON public.support_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_messages sm
      JOIN public.support_conversations sc ON sc.id = sm.conversation_id
      WHERE sm.id = support_attachments.message_id
        AND sc.user_id = auth.uid()
        AND COALESCE(sm.is_internal, false) = false
    )
  );

CREATE POLICY "support_attachments_select_admin"
  ON public.support_attachments
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Harden the privileged implementation without changing the public RPC
-- signature. p_uploaded_by and p_public_url remain only for compatibility;
-- uploader identity comes from auth.uid() and public URLs are rejected.
CREATE OR REPLACE FUNCTION private_api.record_support_attachment_upload(
  p_message_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_file_path text,
  p_file_size integer,
  p_file_type text,
  p_thumbnail_path text DEFAULT NULL,
  p_public_url text DEFAULT NULL
)
RETURNS public.support_attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_service boolean := COALESCE(auth.role(), '') = 'service_role';
  v_is_admin boolean := v_is_service;
  v_message public.support_messages%ROWTYPE;
  v_file_name text := NULLIF(btrim(COALESCE(p_file_name, '')), '');
  v_file_type text := lower(NULLIF(btrim(COALESCE(p_file_type, '')), ''));
  v_file_path text;
  v_thumbnail_path text;
  v_existing_count integer;
  v_result public.support_attachments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL AND NOT v_is_service THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_service AND p_uploaded_by IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Invalid uploader' USING ERRCODE = '42501';
  END IF;

  IF p_public_url IS NOT NULL AND NULLIF(btrim(p_public_url), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Public support attachment URLs are not allowed' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND v_user_id IS NOT NULL THEN
    SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  END IF;

  IF v_file_name IS NULL
    OR length(v_file_name) > 255
    OR v_file_name ~ '[[:cntrl:]<>/\\]' THEN
    RAISE EXCEPTION 'Invalid file name' USING ERRCODE = '22023';
  END IF;

  IF v_file_type NOT IN ('image/jpeg', 'image/png', 'application/pdf') THEN
    RAISE EXCEPTION 'Invalid file type' USING ERRCODE = '22023';
  END IF;

  IF p_file_size IS NULL OR p_file_size <= 0 OR p_file_size > 5242880 THEN
    RAISE EXCEPTION 'Invalid file size' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_message
  FROM public.support_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_message.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted messages cannot receive attachments' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND v_message.sender_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the sender can attach files to this message' USING ERRCODE = '42501';
  END IF;

  v_file_path := public.validate_support_attachment_path(
    p_file_path,
    v_message.conversation_id,
    'file_path',
    true
  );
  v_thumbnail_path := public.validate_support_attachment_path(
    p_thumbnail_path,
    v_message.conversation_id,
    'thumbnail_path',
    false
  );

  SELECT count(*)
  INTO v_existing_count
  FROM public.support_attachments
  WHERE message_id = p_message_id;

  IF v_existing_count >= 10 THEN
    RAISE EXCEPTION 'Attachment limit exceeded' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.support_attachments (
    message_id,
    uploaded_by,
    file_name,
    file_path,
    file_type,
    file_size,
    public_url,
    thumbnail_path
  )
  VALUES (
    p_message_id,
    COALESCE(v_user_id, p_uploaded_by),
    v_file_name,
    v_file_path,
    v_file_type,
    p_file_size,
    NULL,
    v_thumbnail_path
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private_api.record_support_attachment_upload(
  uuid, uuid, text, text, integer, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.record_support_attachment_upload(
  uuid, uuid, text, text, integer, text, text, text
) TO authenticated, service_role;

COMMENT ON COLUMN public.support_attachments.public_url IS
  'Legacy compatibility field. Must remain NULL; access uses short-lived signed Storage URLs.';

NOTIFY pgrst, 'reload schema';
