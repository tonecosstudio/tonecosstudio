-- Move group admin RPC implementation bodies out of the exposed public schema.
-- Public functions remain as stable Data API entry points, but no longer run as
-- SECURITY DEFINER. Privileged bodies live in the non-exposed private_api schema.

CREATE SCHEMA IF NOT EXISTS private_api;

GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;

DO $$
DECLARE
  v_signature text;
  v_definition text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.admin_create_chat_group(text,text,jsonb,uuid)',
    'public.admin_soft_delete_chat_group(uuid,uuid)',
    'public.admin_add_chat_group_member(uuid,uuid)',
    'public.admin_add_chat_group_members(uuid,uuid[],uuid)',
    'public.admin_remove_chat_group_member(uuid,uuid)',
    'public.admin_send_chat_group_message(uuid,text,text,text,text,text)',
    'public.admin_register_chat_group_attachment(uuid,uuid,text,text,integer,text,text)',
    'public.admin_edit_chat_group_message(uuid,text)',
    'public.admin_delete_chat_group_message(uuid)',
    'public.admin_schedule_group_message(uuid,text,timestamp with time zone)',
    'public.admin_save_group_message_template(uuid,text,text)',
    'public.admin_delete_group_message_template(uuid)',
    'public.sync_all_automatic_groups()'
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

REVOKE ALL ON FUNCTION private_api.admin_create_chat_group(text, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_soft_delete_chat_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_add_chat_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_add_chat_group_members(uuid, uuid[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_remove_chat_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_send_chat_group_message(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_edit_chat_group_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_chat_group_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_schedule_group_message(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_save_group_message_template(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.admin_delete_group_message_template(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.sync_all_automatic_groups() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private_api.admin_create_chat_group(text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_soft_delete_chat_group(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_add_chat_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_add_chat_group_members(uuid, uuid[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_remove_chat_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_send_chat_group_message(uuid, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_edit_chat_group_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_chat_group_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_schedule_group_message(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_save_group_message_template(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_group_message_template(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.sync_all_automatic_groups() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_chat_group(
  p_name text,
  p_type text,
  p_membership_criteria jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_create_chat_group(
    p_name,
    p_type,
    p_membership_criteria,
    p_created_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_chat_group(
  p_group_id uuid,
  p_deleted_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_soft_delete_chat_group(p_group_id, p_deleted_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_chat_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_add_chat_group_member(p_group_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_chat_group_members(
  p_group_id uuid,
  p_user_ids uuid[],
  p_added_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_add_chat_group_members(p_group_id, p_user_ids, p_added_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_chat_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_remove_chat_group_member(p_group_id, p_user_id);
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
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_send_chat_group_message(
    p_group_id,
    p_message,
    p_action_button_text,
    p_action_button_url,
    p_link_text,
    p_link_url
  );
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
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_register_chat_group_attachment(
    p_message_id,
    p_uploaded_by,
    p_file_name,
    p_file_path,
    p_file_size,
    p_file_type,
    p_thumbnail_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_edit_chat_group_message(
  p_message_id uuid,
  p_message text
)
RETURNS public.chat_group_messages
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_edit_chat_group_message(p_message_id, p_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_chat_group_message(p_message_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_delete_chat_group_message(p_message_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_group_message(
  p_group_id uuid,
  p_message text,
  p_scheduled_at timestamptz
)
RETURNS public.scheduled_messages
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_schedule_group_message(p_group_id, p_message, p_scheduled_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_group_message_template(
  p_template_id uuid,
  p_name text,
  p_content text
)
RETURNS public.message_templates
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_save_group_message_template(p_template_id, p_name, p_content);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_group_message_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.admin_delete_group_message_template(p_template_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_all_automatic_groups()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RETURN private_api.sync_all_automatic_groups();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_soft_delete_chat_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_chat_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_chat_group_members(uuid, uuid[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_chat_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_edit_chat_group_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_chat_group_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_schedule_group_message(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_group_message_template(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_group_message_template(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_all_automatic_groups() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_chat_group(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_chat_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_chat_group_members(uuid, uuid[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_chat_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_chat_group_attachment(uuid, uuid, text, text, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_edit_chat_group_message(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_chat_group_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_schedule_group_message(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_group_message_template(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_group_message_template(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_automatic_groups() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) IS
  'Invoker wrapper for private_api.admin_create_chat_group.';
COMMENT ON FUNCTION public.admin_send_chat_group_message(uuid, text, text, text, text, text) IS
  'Invoker wrapper for private_api.admin_send_chat_group_message.';
COMMENT ON FUNCTION public.sync_all_automatic_groups() IS
  'Invoker wrapper for private_api.sync_all_automatic_groups.';

NOTIFY pgrst, 'reload schema';
