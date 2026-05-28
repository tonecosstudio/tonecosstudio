-- Support chat and quote payment mutation RPCs.
-- Moves customer/admin mutations behind validated SECURITY DEFINER boundaries.

CREATE OR REPLACE FUNCTION public.validate_support_attachment_path(
  p_path text,
  p_conversation_id uuid,
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
  v_prefix text := p_conversation_id::text || '/';
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

CREATE OR REPLACE FUNCTION public.send_support_message(
  p_conversation_id uuid,
  p_sender_type text,
  p_message text,
  p_is_internal boolean DEFAULT false
)
RETURNS public.support_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_sender_type text := lower(NULLIF(btrim(COALESCE(p_sender_type, '')), ''));
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role';
  v_conversation public.support_conversations%ROWTYPE;
  v_result public.support_messages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND v_user_id IS NOT NULL THEN
    SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  END IF;

  IF v_sender_type NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'Invalid sender type' USING ERRCODE = '22023';
  END IF;

  IF v_message IS NULL
    OR length(v_message) > 2000
    OR translate(v_message, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.support_conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_conversation.status, '') = 'closed' THEN
    RAISE EXCEPTION 'Conversation is closed' USING ERRCODE = '22023';
  END IF;

  IF p_is_internal AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create internal notes' USING ERRCODE = '42501';
  END IF;

  IF v_sender_type = 'admin' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can send admin messages' USING ERRCODE = '42501';
  END IF;

  IF v_sender_type = 'customer' AND v_conversation.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.support_messages (
    conversation_id,
    sender_id,
    sender_type,
    message,
    is_internal
  )
  VALUES (
    p_conversation_id,
    v_user_id,
    v_sender_type,
    v_message,
    COALESCE(p_is_internal, false)
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_support_message(
  p_message_id uuid,
  p_message text
)
RETURNS public.support_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message_text text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_message public.support_messages%ROWTYPE;
  v_result public.support_messages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_message_text IS NULL
    OR length(v_message_text) > 2000
    OR translate(v_message_text, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_message
  FROM public.support_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_message.sender_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the author can edit this message' USING ERRCODE = '42501';
  END IF;

  IF v_message.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted messages cannot be edited' USING ERRCODE = '22023';
  END IF;

  IF v_message.created_at < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'Message edit window expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.support_messages
  SET
    message = v_message_text,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_message_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_edit_internal_support_note(
  p_message_id uuid,
  p_message text
)
RETURNS public.support_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message_text text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_message public.support_messages%ROWTYPE;
  v_result public.support_messages%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_message_text IS NULL
    OR length(v_message_text) > 2000
    OR translate(v_message_text, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_message
  FROM public.support_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT COALESCE(v_message.is_internal, false) THEN
    RAISE EXCEPTION 'Message is not an internal note' USING ERRCODE = '22023';
  END IF;

  IF v_message.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted notes cannot be edited' USING ERRCODE = '22023';
  END IF;

  IF v_message.created_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Internal note edit window expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.support_messages
  SET
    message = v_message_text,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_message_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_support_message(p_message_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.support_messages
  SET
    deleted_at = COALESCE(deleted_at, now()),
    deleted_by = COALESCE(deleted_by, auth.uid()),
    updated_at = now()
  WHERE id = p_message_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_internal_support_note(p_message_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.support_messages
  SET
    deleted_at = COALESCE(deleted_at, now()),
    deleted_by = COALESCE(deleted_by, auth.uid()),
    updated_at = now()
  WHERE id = p_message_id
    AND is_internal = true
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Internal note not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(
  p_message_ids uuid[],
  p_reader_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reader_type text := lower(NULLIF(btrim(COALESCE(p_reader_type, '')), ''));
  v_ids uuid[];
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role';
  v_count integer;
BEGIN
  IF v_user_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::uuid[])
  INTO v_ids
  FROM unnest(COALESCE(p_message_ids, ARRAY[]::uuid[])) AS id
  WHERE id IS NOT NULL;

  IF cardinality(v_ids) = 0 THEN
    RETURN 0;
  END IF;

  IF cardinality(v_ids) > 200 THEN
    RAISE EXCEPTION 'Too many messages' USING ERRCODE = '22023';
  END IF;

  IF v_reader_type NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'Invalid reader type' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND v_user_id IS NOT NULL THEN
    SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  END IF;

  IF v_reader_type = 'admin' THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can mark admin reads' USING ERRCODE = '42501';
    END IF;

    UPDATE public.support_messages
    SET
      read_by_admin = true,
      read_at = COALESCE(read_at, now()),
      updated_at = now()
    WHERE id = ANY(v_ids);
  ELSE
    UPDATE public.support_messages sm
    SET
      read_by_customer = true,
      read_at = COALESCE(read_at, now()),
      updated_at = now()
    WHERE sm.id = ANY(v_ids)
      AND EXISTS (
        SELECT 1
        FROM public.support_conversations sc
        WHERE sc.id = sm.conversation_id
          AND sc.user_id = v_user_id
      );
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_support_attachment_upload(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role';
  v_message public.support_messages%ROWTYPE;
  v_file_name text := NULLIF(btrim(COALESCE(p_file_name, '')), '');
  v_file_type text := lower(NULLIF(btrim(COALESCE(p_file_type, '')), ''));
  v_file_path text;
  v_thumbnail_path text;
  v_public_url text := NULLIF(btrim(COALESCE(p_public_url, '')), '');
  v_existing_count integer;
  v_result public.support_attachments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_uploaded_by IS DISTINCT FROM v_user_id AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Invalid uploader' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND v_user_id IS NOT NULL THEN
    SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
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

  IF v_public_url IS NOT NULL AND v_public_url !~ '^https?://' THEN
    RAISE EXCEPTION 'Invalid public URL' USING ERRCODE = '22023';
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
    v_public_url,
    v_thumbnail_path
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_support_attachment_record(
  p_attachment_id uuid,
  p_file_path text,
  p_thumbnail_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attachment public.support_attachments%ROWTYPE;
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_attachment
  FROM public.support_attachments
  WHERE id = p_attachment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attachment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_attachment.file_path IS DISTINCT FROM p_file_path
    OR v_attachment.thumbnail_path IS DISTINCT FROM p_thumbnail_path THEN
    RAISE EXCEPTION 'Attachment path mismatch' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.support_attachments
  WHERE id = p_attachment_id
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_quote_payment_for_current_user(
  p_quote_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_amount numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_quote
  FROM public.quotes
  WHERE id = p_quote_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_quote.customer_paid_notification_at IS NOT NULL THEN
    RETURN;
  END IF;

  v_amount := LEAST(p_amount, COALESCE(v_quote.total_amount, p_amount));

  UPDATE public.quotes
  SET
    customer_paid_notification_at = now(),
    updated_at = now()
  WHERE id = p_quote_id;

  INSERT INTO public.admin_notifications (
    title,
    message,
    type
  )
  VALUES (
    'Cliente confirmou pagamento',
    format('O cliente informou pagamento de R$ %s para o orcamento %s.', to_char(v_amount, 'FM999999990D00'), p_quote_id),
    'payment'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_support_attachment_path(text, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_support_message(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edit_support_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_edit_internal_support_note(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_support_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_internal_support_note(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_support_messages_read(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_support_attachment_record(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.send_support_message(uuid, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.edit_support_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_edit_internal_support_note(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_support_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_internal_support_note(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_support_messages_read(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_support_attachment_record(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.support_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.support_attachments FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.quotes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_notifications FROM anon, authenticated;

COMMENT ON FUNCTION public.send_support_message(uuid, text, text, boolean) IS
  'Validated authenticated support message creation.';
COMMENT ON FUNCTION public.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) IS
  'Validated support attachment metadata registration after storage upload.';
COMMENT ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric) IS
  'Customer-owned quote payment notification to admins.';

NOTIFY pgrst, 'reload schema';
