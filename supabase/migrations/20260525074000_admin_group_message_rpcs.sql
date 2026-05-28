-- Admin group message and template mutation RPCs.
-- Consolidates chat group mutations behind validated admin-only functions.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-attachments',
  'group-attachments',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.chat_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_group_messages
  ADD COLUMN IF NOT EXISTS action_button_text text,
  ADD COLUMN IF NOT EXISTS action_button_url text,
  ADD COLUMN IF NOT EXISTS link_text text,
  ADD COLUMN IF NOT EXISTS link_url text;

CREATE TABLE IF NOT EXISTS public.chat_group_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_group_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_created
  ON public.chat_group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_group_attachments_message_id
  ON public.chat_group_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status_schedule
  ON public.scheduled_messages(status, scheduled_at);

ALTER TABLE public.chat_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_group_messages_select_member_or_admin" ON public.chat_group_messages;
CREATE POLICY "chat_group_messages_select_member_or_admin"
  ON public.chat_group_messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.chat_group_members member
      WHERE member.group_id = chat_group_messages.group_id
        AND member.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_group_attachments_select_member_or_admin" ON public.chat_group_attachments;
CREATE POLICY "chat_group_attachments_select_member_or_admin"
  ON public.chat_group_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.chat_group_messages msg
      JOIN public.chat_group_members member ON member.group_id = msg.group_id
      WHERE msg.id = chat_group_attachments.message_id
        AND member.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "message_templates_select_admin" ON public.message_templates;
CREATE POLICY "message_templates_select_admin"
  ON public.message_templates
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "scheduled_messages_select_admin" ON public.scheduled_messages;
CREATE POLICY "scheduled_messages_select_admin"
  ON public.scheduled_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_group_message_url(p_url text, p_field_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text := NULLIF(btrim(COALESCE(p_url, '')), '');
BEGIN
  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF length(v_url) > 2048
    OR v_url !~ '^https?://'
    OR v_url ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_group_attachment_path(
  p_path text,
  p_group_id uuid,
  p_field_name text,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_path text := NULLIF(btrim(COALESCE(p_path, '')), '');
  v_prefix text := p_group_id::text || '/';
BEGIN
  IF v_path IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field_name USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_path) > 500
    OR v_path LIKE '/%'
    OR v_path LIKE '%//%'
    OR v_path LIKE '%..%'
    OR v_path ~ '[[:cntrl:]<>]'
    OR left(v_path, length(v_prefix)) <> v_prefix THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_send_chat_group_message(
  p_group_id uuid,
  p_message text,
  p_action_button_text text DEFAULT NULL,
  p_action_button_url text DEFAULT NULL,
  p_link_text text DEFAULT NULL,
  p_link_url text DEFAULT NULL
)
RETURNS public.chat_group_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_action_text text := NULLIF(btrim(COALESCE(p_action_button_text, '')), '');
  v_link_text text := NULLIF(btrim(COALESCE(p_link_text, '')), '');
  v_group public.chat_groups%ROWTYPE;
  v_result public.chat_group_messages%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_message IS NULL
    OR length(v_message) > 5000
    OR translate(v_message, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  IF v_action_text IS NOT NULL AND (length(v_action_text) > 80 OR v_action_text ~ '[[:cntrl:]<>]') THEN
    RAISE EXCEPTION 'Invalid action button text' USING ERRCODE = '22023';
  END IF;

  IF v_link_text IS NOT NULL AND (length(v_link_text) > 120 OR v_link_text ~ '[[:cntrl:]<>]') THEN
    RAISE EXCEPTION 'Invalid link text' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_group
  FROM public.chat_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Group is deleted' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.chat_group_messages (
    group_id,
    sender_id,
    message,
    action_button_text,
    action_button_url,
    link_text,
    link_url
  )
  VALUES (
    p_group_id,
    v_user_id,
    v_message,
    v_action_text,
    public.validate_group_message_url(p_action_button_url, 'action_button_url'),
    v_link_text,
    public.validate_group_message_url(p_link_url, 'link_url')
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_register_chat_group_attachment(
  p_message_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_file_path text,
  p_file_size integer,
  p_file_type text,
  p_thumbnail_path text DEFAULT NULL
)
RETURNS public.chat_group_attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message public.chat_group_messages%ROWTYPE;
  v_file_name text := NULLIF(btrim(COALESCE(p_file_name, '')), '');
  v_file_type text := lower(NULLIF(btrim(COALESCE(p_file_type, '')), ''));
  v_file_path text;
  v_thumbnail_path text;
  v_existing_count integer;
  v_result public.chat_group_attachments%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL OR p_uploaded_by IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Invalid uploader' USING ERRCODE = '42501';
  END IF;

  IF v_file_name IS NULL
    OR length(v_file_name) > 255
    OR v_file_name ~ '[[:cntrl:]<>/\\]' THEN
    RAISE EXCEPTION 'Invalid file name' USING ERRCODE = '22023';
  END IF;

  IF v_file_type NOT IN ('image/jpeg', 'image/jpg', 'image/png', 'application/pdf') THEN
    RAISE EXCEPTION 'Invalid file type' USING ERRCODE = '22023';
  END IF;

  IF p_file_size IS NULL OR p_file_size <= 0 OR p_file_size > 5242880 THEN
    RAISE EXCEPTION 'Invalid file size' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_message
  FROM public.chat_group_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  v_file_path := public.validate_group_attachment_path(
    p_file_path,
    v_message.group_id,
    'file_path',
    true
  );
  v_thumbnail_path := public.validate_group_attachment_path(
    p_thumbnail_path,
    v_message.group_id,
    'thumbnail_path',
    false
  );

  SELECT count(*)
  INTO v_existing_count
  FROM public.chat_group_attachments
  WHERE message_id = p_message_id;

  IF v_existing_count >= 10 THEN
    RAISE EXCEPTION 'Attachment limit exceeded' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.chat_group_attachments (
    message_id,
    uploaded_by,
    file_name,
    file_path,
    file_type,
    file_size,
    thumbnail_path
  )
  VALUES (
    p_message_id,
    v_user_id,
    v_file_name,
    v_file_path,
    v_file_type,
    p_file_size,
    v_thumbnail_path
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_edit_chat_group_message(
  p_message_id uuid,
  p_message text
)
RETURNS public.chat_group_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_result public.chat_group_messages%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_message IS NULL
    OR length(v_message) > 5000
    OR translate(v_message, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  UPDATE public.chat_group_messages
  SET
    message = v_message,
    updated_at = now()
  WHERE id = p_message_id
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_chat_group_message(p_message_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.chat_group_messages
  WHERE id = p_message_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_group_message(
  p_group_id uuid,
  p_message text,
  p_scheduled_at timestamptz
)
RETURNS public.scheduled_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_group public.chat_groups%ROWTYPE;
  v_result public.scheduled_messages%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_message IS NULL
    OR length(v_message) > 5000
    OR translate(v_message, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  IF p_scheduled_at IS NULL
    OR p_scheduled_at <= now()
    OR p_scheduled_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'Invalid scheduled time' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_group
  FROM public.chat_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF NOT FOUND OR v_group.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Group not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.scheduled_messages (
    group_id,
    message,
    scheduled_at,
    created_by,
    status
  )
  VALUES (
    p_group_id,
    v_message,
    p_scheduled_at,
    v_user_id,
    'pending'
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_group_message_template(
  p_template_id uuid,
  p_name text,
  p_content text
)
RETURNS public.message_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_content text := NULLIF(btrim(COALESCE(p_content, '')), '');
  v_result public.message_templates%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_name IS NULL OR length(v_name) > 100 OR v_name ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid template name' USING ERRCODE = '22023';
  END IF;

  IF v_content IS NULL
    OR length(v_content) > 5000
    OR translate(v_content, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid template content' USING ERRCODE = '22023';
  END IF;

  IF p_template_id IS NULL THEN
    INSERT INTO public.message_templates (name, content, created_by)
    VALUES (v_name, v_content, v_user_id)
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.message_templates
    SET
      name = v_name,
      content = v_content,
      updated_at = now()
    WHERE id = p_template_id
    RETURNING * INTO v_result;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_group_message_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.message_templates
  WHERE id = p_template_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_group_message_url(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_group_attachment_path(text, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_edit_chat_group_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_chat_group_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_schedule_group_message(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_group_message_template(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_group_message_template(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_edit_chat_group_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_chat_group_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_schedule_group_message(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_group_message_template(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_group_message_template(uuid) TO authenticated, service_role;

GRANT SELECT ON public.chat_group_messages TO authenticated;
GRANT SELECT ON public.chat_group_attachments TO authenticated;
GRANT SELECT ON public.message_templates TO authenticated;
GRANT SELECT ON public.scheduled_messages TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.chat_group_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.chat_group_attachments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.message_templates FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.scheduled_messages FROM anon, authenticated;

COMMENT ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) IS
  'Admin-only validated group broadcast message creation.';
COMMENT ON FUNCTION public.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) IS
  'Admin-only validated group attachment metadata registration after storage upload.';
COMMENT ON FUNCTION public.admin_save_group_message_template(uuid, text, text) IS
  'Admin-only upsert boundary for reusable group message templates.';

NOTIFY pgrst, 'reload schema';
