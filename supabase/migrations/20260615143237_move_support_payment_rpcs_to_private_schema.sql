-- Move support and payment RPC implementation bodies out of the exposed public
-- schema. Public RPC names remain stable for the app, but privileged logic lives
-- in private_api where it is not exposed by PostgREST.

CREATE SCHEMA IF NOT EXISTS private_api;

REVOKE ALL ON SCHEMA private_api FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;

DO $$
DECLARE
  v_signature text;
  v_definition text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.create_manual_payment_for_current_user(uuid,uuid,uuid,numeric,text,text)',
    'public.record_payment_file_upload(uuid,text,text,bigint,text,text)',
    'public.admin_delete_payment_file_record(uuid,text,text)',
    'public.log_security_incident_for_current_user(text,text,uuid,text[],text)',
    'public.admin_create_payment_method(jsonb)',
    'public.admin_update_payment_method(uuid,jsonb)',
    'public.admin_set_default_payment_method(uuid)',
    'public.admin_toggle_payment_method_active(uuid,boolean)',
    'public.admin_delete_payment_method(uuid)',
    'public.create_support_conversation(uuid,text,text,text,text[],uuid,uuid,uuid,uuid,text)',
    'public.admin_update_support_conversation(uuid,jsonb)',
    'public.mark_customer_support_conversation_read(uuid)',
    'public.send_support_message(uuid,text,text,boolean)',
    'public.edit_support_message(uuid,text)',
    'public.admin_edit_internal_support_note(uuid,text)',
    'public.admin_delete_support_message(uuid)',
    'public.admin_delete_internal_support_note(uuid)',
    'public.mark_support_messages_read(uuid[],text)',
    'public.record_support_attachment_upload(uuid,uuid,text,text,integer,text,text,text)',
    'public.admin_delete_support_attachment_record(uuid,text,text)',
    'public.notify_quote_payment_for_current_user(uuid,numeric)'
  ]
  LOOP
    SELECT pg_get_functiondef(v_signature::regprocedure::oid)
      INTO v_definition;

    IF v_definition IS NULL THEN
      RAISE EXCEPTION 'Function not found: %', v_signature;
    END IF;

    v_definition := regexp_replace(
      v_definition,
      'CREATE OR REPLACE FUNCTION public\.',
      'CREATE OR REPLACE FUNCTION private_api.',
      'i'
    );

    EXECUTE v_definition;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private_api.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.record_payment_file_upload(uuid, text, text, bigint, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_payment_file_record(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.log_security_incident_for_current_user(text, text, uuid, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_create_payment_method(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_update_payment_method(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_set_default_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_toggle_payment_method_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_update_support_conversation(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.mark_customer_support_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.send_support_message(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.edit_support_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_edit_internal_support_note(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_support_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_internal_support_note(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.mark_support_messages_read(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_support_attachment_record(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.notify_quote_payment_for_current_user(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private_api.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.record_payment_file_upload(uuid, text, text, bigint, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_payment_file_record(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.log_security_incident_for_current_user(text, text, uuid, text[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_create_payment_method(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_update_payment_method(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_set_default_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_toggle_payment_method_active(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_update_support_conversation(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.mark_customer_support_conversation_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.send_support_message(uuid, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.edit_support_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_edit_internal_support_note(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_support_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_internal_support_note(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.mark_support_messages_read(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_support_attachment_record(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.notify_quote_payment_for_current_user(uuid, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_manual_payment_for_current_user(
  p_payment_method_id uuid,
  p_quote_id uuid DEFAULT NULL::uuid,
  p_subscription_id uuid DEFAULT NULL::uuid,
  p_amount numeric DEFAULT NULL::numeric,
  p_currency text DEFAULT 'BRL'::text,
  p_payment_type text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.create_manual_payment_for_current_user(
    p_payment_method_id,
    p_quote_id,
    p_subscription_id,
    p_amount,
    p_currency,
    p_payment_type
  );
$$;

CREATE OR REPLACE FUNCTION public.record_payment_file_upload(
  p_payment_id uuid,
  p_file_name text,
  p_file_path text,
  p_file_size bigint,
  p_file_type text,
  p_thumbnail_path text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.record_payment_file_upload(
    p_payment_id,
    p_file_name,
    p_file_path,
    p_file_size,
    p_file_type,
    p_thumbnail_path
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_file_record(
  p_file_id uuid,
  p_file_path text,
  p_thumbnail_path text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_delete_payment_file_record(p_file_id, p_file_path, p_thumbnail_path);
$$;

CREATE OR REPLACE FUNCTION public.log_security_incident_for_current_user(
  p_incident_type text,
  p_file_name text,
  p_payment_id uuid,
  p_threats text[] DEFAULT ARRAY[]::text[],
  p_scanner text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.log_security_incident_for_current_user(
    p_incident_type,
    p_file_name,
    p_payment_id,
    p_threats,
    p_scanner
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_create_payment_method(p_data jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_create_payment_method(p_data);
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_method(
  p_method_id uuid,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_update_payment_method(p_method_id, p_data);
$$;

CREATE OR REPLACE FUNCTION public.admin_set_default_payment_method(p_method_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_set_default_payment_method(p_method_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_payment_method_active(
  p_method_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_toggle_payment_method_active(p_method_id, p_is_active);
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_method(p_method_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_delete_payment_method(p_method_id);
$$;

CREATE OR REPLACE FUNCTION public.create_support_conversation(
  p_user_id uuid,
  p_subject text,
  p_status text DEFAULT 'new'::text,
  p_priority text DEFAULT 'normal'::text,
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_order_id uuid DEFAULT NULL::uuid,
  p_quote_id uuid DEFAULT NULL::uuid,
  p_subscription_id uuid DEFAULT NULL::uuid,
  p_payment_id uuid DEFAULT NULL::uuid,
  p_first_message text DEFAULT NULL::text
)
RETURNS public.support_conversations
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.create_support_conversation(
    p_user_id,
    p_subject,
    p_status,
    p_priority,
    p_tags,
    p_order_id,
    p_quote_id,
    p_subscription_id,
    p_payment_id,
    p_first_message
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_update_support_conversation(
  p_conversation_id uuid,
  p_updates jsonb
)
RETURNS public.support_conversations
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_update_support_conversation(p_conversation_id, p_updates);
$$;

CREATE OR REPLACE FUNCTION public.mark_customer_support_conversation_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.mark_customer_support_conversation_read(p_conversation_id);
$$;

CREATE OR REPLACE FUNCTION public.send_support_message(
  p_conversation_id uuid,
  p_sender_type text,
  p_message text,
  p_is_internal boolean DEFAULT false
)
RETURNS public.support_messages
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.send_support_message(
    p_conversation_id,
    p_sender_type,
    p_message,
    p_is_internal
  );
$$;

CREATE OR REPLACE FUNCTION public.edit_support_message(
  p_message_id uuid,
  p_message text
)
RETURNS public.support_messages
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.edit_support_message(p_message_id, p_message);
$$;

CREATE OR REPLACE FUNCTION public.admin_edit_internal_support_note(
  p_message_id uuid,
  p_message text
)
RETURNS public.support_messages
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_edit_internal_support_note(p_message_id, p_message);
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_support_message(p_message_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_delete_support_message(p_message_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_internal_support_note(p_message_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_delete_internal_support_note(p_message_id);
$$;

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(
  p_message_ids uuid[],
  p_reader_type text
)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.mark_support_messages_read(p_message_ids, p_reader_type);
$$;

CREATE OR REPLACE FUNCTION public.record_support_attachment_upload(
  p_message_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_file_path text,
  p_file_size integer,
  p_file_type text,
  p_thumbnail_path text DEFAULT NULL::text,
  p_public_url text DEFAULT NULL::text
)
RETURNS public.support_attachments
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.record_support_attachment_upload(
    p_message_id,
    p_uploaded_by,
    p_file_name,
    p_file_path,
    p_file_size,
    p_file_type,
    p_thumbnail_path,
    p_public_url
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_support_attachment_record(
  p_attachment_id uuid,
  p_file_path text,
  p_thumbnail_path text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.admin_delete_support_attachment_record(
    p_attachment_id,
    p_file_path,
    p_thumbnail_path
  );
$$;

CREATE OR REPLACE FUNCTION public.notify_quote_payment_for_current_user(
  p_quote_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
  SELECT private_api.notify_quote_payment_for_current_user(p_quote_id, p_amount);
$$;

REVOKE ALL ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_payment_file_record(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_security_incident_for_current_user(text, text, uuid, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_payment_method(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_payment_method(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_default_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_support_conversation(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_customer_support_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_support_message(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edit_support_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_edit_internal_support_note(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_support_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_internal_support_note(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_support_messages_read(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_support_attachment_record(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_file_record(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_security_incident_for_current_user(text, text, uuid, text[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_payment_method(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_method(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_default_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_support_conversation(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_customer_support_conversation_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_support_message(uuid, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.edit_support_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_edit_internal_support_note(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_support_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_internal_support_note(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_support_messages_read(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_support_attachment_upload(uuid, uuid, text, text, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_support_attachment_record(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_manual_payment_for_current_user(uuid, uuid, uuid, numeric, text, text) IS
  'Invoker wrapper for private_api.create_manual_payment_for_current_user.';
COMMENT ON FUNCTION public.send_support_message(uuid, text, text, boolean) IS
  'Invoker wrapper for private_api.send_support_message.';
COMMENT ON FUNCTION public.record_payment_file_upload(uuid, text, text, bigint, text, text) IS
  'Invoker wrapper for private_api.record_payment_file_upload.';

NOTIFY pgrst, 'reload schema';
