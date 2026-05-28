-- Payment file upload RPCs.
-- Keeps payment proof metadata, first-file status transition, admin deletion,
-- and security-incident logging behind validated database functions.

CREATE TABLE IF NOT EXISTS public.payment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.manual_payments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  thumbnail_path text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_files_payment_id
  ON public.payment_files(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_files_uploaded_by
  ON public.payment_files(uploaded_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_files_file_path_unique
  ON public.payment_files(file_path);

DROP POLICY IF EXISTS "payment_files_select_own" ON public.payment_files;
CREATE POLICY "payment_files_select_own"
  ON public.payment_files FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.manual_payments mp
       WHERE mp.id = payment_files.payment_id
         AND mp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payment_files_select_admin" ON public.payment_files;
CREATE POLICY "payment_files_select_admin"
  ON public.payment_files FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

REVOKE INSERT, UPDATE, DELETE ON public.payment_files FROM anon, authenticated;

DROP POLICY IF EXISTS "System can insert security incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "security_incidents_insert_rpc_only" ON public.security_incidents;
REVOKE INSERT ON public.security_incidents FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_payment_file_path(
  p_path text,
  p_payment_id uuid,
  p_field text,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_path text := NULLIF(btrim(COALESCE(p_path, '')), '');
  v_prefix text := p_payment_id::text || '/';
BEGIN
  IF v_path IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION 'PAYMENT_FILE_PATH_REQUIRED:%', p_field USING ERRCODE = '22023';
    END IF;
    RETURN NULL;
  END IF;

  IF length(v_path) > 512
    OR left(v_path, 1) = '/'
    OR v_path LIKE '%..%'
    OR position(v_prefix in v_path) <> 1
    OR substring(v_path from length(v_prefix) + 1) !~ '^[A-Za-z0-9_.-]+$'
    OR v_path ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_FILE_PATH:%', p_field USING ERRCODE = '22023';
  END IF;

  RETURN v_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_file_upload(
  p_payment_id uuid,
  p_file_name text,
  p_file_path text,
  p_file_size bigint,
  p_file_type text,
  p_thumbnail_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text := public.current_user_role();
  v_file_name text := left(NULLIF(btrim(COALESCE(p_file_name, '')), ''), 255);
  v_file_path text;
  v_thumbnail_path text;
  v_payment public.manual_payments%ROWTYPE;
  v_existing_count integer;
  v_file public.payment_files%ROWTYPE;
  v_first_file boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_file_name IS NULL OR v_file_name ~ '[/\\]' OR v_file_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_FILE_NAME' USING ERRCODE = '22023';
  END IF;

  IF p_file_type NOT IN ('image/jpeg', 'image/png', 'application/pdf') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_FILE_TYPE' USING ERRCODE = '22023';
  END IF;

  IF p_file_size IS NULL OR p_file_size <= 0 OR p_file_size > 5242880 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_FILE_SIZE' USING ERRCODE = '22023';
  END IF;

  v_file_path := public.validate_payment_file_path(p_file_path, p_payment_id, 'file_path', true);
  v_thumbnail_path := public.validate_payment_file_path(p_thumbnail_path, p_payment_id, 'thumbnail_path', false);

  SELECT *
    INTO v_payment
    FROM public.manual_payments
   WHERE id = p_payment_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.user_id <> v_user_id AND v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
    INTO v_existing_count
    FROM public.payment_files
   WHERE payment_id = p_payment_id;

  IF v_existing_count >= 5 THEN
    RAISE EXCEPTION 'MAX_PAYMENT_FILES_REACHED' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payment_files (
    payment_id,
    file_name,
    file_path,
    file_size,
    file_type,
    thumbnail_path,
    uploaded_by
  )
  VALUES (
    p_payment_id,
    v_file_name,
    v_file_path,
    p_file_size,
    p_file_type,
    v_thumbnail_path,
    v_user_id
  )
  RETURNING * INTO v_file;

  v_first_file := v_existing_count = 0;

  IF v_first_file AND v_payment.status::text IN ('pending', 'requires_info', 'rejected') THEN
    UPDATE public.manual_payments
       SET status = 'under_review',
           rejection_reason = NULL,
           updated_at = now()
     WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'file', to_jsonb(v_file),
    'firstFile', v_first_file
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_file_record(
  p_file_id uuid,
  p_file_path text,
  p_thumbnail_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_file public.payment_files%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_file_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_FILE_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_file
    FROM public.payment_files
   WHERE id = p_file_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_FILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_file.file_path IS DISTINCT FROM p_file_path
    OR v_file.thumbnail_path IS DISTINCT FROM p_thumbnail_path THEN
    RAISE EXCEPTION 'PAYMENT_FILE_PATH_MISMATCH' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.payment_files
   WHERE id = p_file_id;

  RETURN jsonb_build_object('success', true, 'fileId', p_file_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_incident_for_current_user(
  p_incident_type text,
  p_file_name text,
  p_payment_id uuid,
  p_threats text[] DEFAULT ARRAY[]::text[],
  p_scanner text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text := public.current_user_role();
  v_incident_type text := left(NULLIF(btrim(COALESCE(p_incident_type, '')), ''), 80);
  v_file_name text := left(NULLIF(btrim(COALESCE(p_file_name, '')), ''), 255);
  v_scanner text := left(NULLIF(btrim(COALESCE(p_scanner, '')), ''), 80);
  v_payment public.manual_payments%ROWTYPE;
  v_incident_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_incident_type IS NULL OR v_incident_type !~ '^[A-Z0-9_]{3,80}$' THEN
    RAISE EXCEPTION 'INVALID_SECURITY_INCIDENT_TYPE' USING ERRCODE = '22023';
  END IF;

  IF v_file_name IS NULL OR v_file_name ~ '[/\\]' OR v_file_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'INVALID_SECURITY_FILE_NAME' USING ERRCODE = '22023';
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_payment
    FROM public.manual_payments
   WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.user_id <> v_user_id AND v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.security_incidents (
    incident_type,
    file_name,
    user_id,
    payment_id,
    details
  )
  VALUES (
    v_incident_type,
    v_file_name,
    v_user_id,
    p_payment_id,
    jsonb_build_object(
      'threats', COALESCE(p_threats, ARRAY[]::text[]),
      'scanner', v_scanner,
      'timestamp', now()
    )
  )
  RETURNING id INTO v_incident_id;

  RETURN jsonb_build_object('success', true, 'incidentId', v_incident_id);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_payment_file_path(text, uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_payment_file_record(uuid, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_security_incident_for_current_user(text, text, uuid, text[], text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_file_record(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_security_incident_for_current_user(text, text, uuid, text[], text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text) IS
  'Authenticated payment owner/admin payment proof metadata creation with first-file status transition.';
COMMENT ON FUNCTION public.admin_delete_payment_file_record(uuid, text, text) IS
  'Admin-only payment proof metadata deletion after storage path verification.';
COMMENT ON FUNCTION public.log_security_incident_for_current_user(text, text, uuid, text[], text) IS
  'Logs a security incident for a payment owned by the current user or visible to admin.';

NOTIFY pgrst, 'reload schema';
