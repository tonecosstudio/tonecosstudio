-- Admin chat group management RPCs.
-- Moves group/member mutations out of browser clients and into admin-guarded
-- database functions.

CREATE OR REPLACE FUNCTION public.admin_create_chat_group(
  p_name text,
  p_type text,
  p_membership_criteria jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_type text := NULLIF(btrim(COALESCE(p_type, '')), '');
  v_criteria jsonb := p_membership_criteria;
  v_actor uuid := COALESCE(auth.uid(), p_created_by);
  v_group public.chat_groups%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_name IS NULL OR length(v_name) < 3 OR length(v_name) > 100 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'INVALID_GROUP_NAME' USING ERRCODE = '22023';
  END IF;

  IF v_type NOT IN ('manual', 'assinantes', 'colecao', 'lancamentos', 'pedidos') THEN
    RAISE EXCEPTION 'INVALID_GROUP_TYPE' USING ERRCODE = '22023';
  END IF;

  IF v_type = 'manual' THEN
    v_criteria := NULL;
  ELSIF v_criteria IS NULL THEN
    RAISE EXCEPTION 'GROUP_CRITERIA_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.chat_groups
     WHERE lower(name) = lower(v_name)
       AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'GROUP_NAME_EXISTS' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.chat_groups (
    name,
    type,
    membership_criteria,
    created_by
  )
  VALUES (
    v_name,
    v_type,
    v_criteria,
    v_actor
  )
  RETURNING * INTO v_group;

  RETURN to_jsonb(v_group);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_chat_group(
  p_group_id uuid,
  p_deleted_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_deleted_by);
  v_group public.chat_groups%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_group_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_group
    FROM public.chat_groups
   WHERE id = p_group_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'GROUP_ALREADY_DELETED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.chat_groups
     SET deleted_at = now(),
         deleted_by = v_actor,
         updated_at = now()
   WHERE id = p_group_id;

  RETURN p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_chat_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group public.chat_groups%ROWTYPE;
  v_member public.chat_group_members%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_MEMBER_INPUT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_group
    FROM public.chat_groups
   WHERE id = p_group_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.type <> 'manual' THEN
    RAISE EXCEPTION 'GROUP_MANUAL_MEMBERS_ONLY' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'GROUP_USER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.chat_group_members
     WHERE group_id = p_group_id
       AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'GROUP_MEMBER_EXISTS' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.chat_group_members (group_id, user_id)
  VALUES (p_group_id, p_user_id)
  RETURNING * INTO v_member;

  RETURN to_jsonb(v_member);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_chat_group_members(
  p_group_id uuid,
  p_user_ids uuid[],
  p_added_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group public.chat_groups%ROWTYPE;
  v_input_count integer := 0;
  v_valid_count integer := 0;
  v_existing_count integer := 0;
  v_added_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_group_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_group
    FROM public.chat_groups
   WHERE id = p_group_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.type <> 'manual' THEN
    RAISE EXCEPTION 'GROUP_MANUAL_MEMBERS_ONLY' USING ERRCODE = '22023';
  END IF;

  WITH input_users AS (
    SELECT DISTINCT user_id
      FROM unnest(COALESCE(p_user_ids, ARRAY[]::uuid[])) AS user_ids(user_id)
     WHERE user_id IS NOT NULL
  ),
  valid_users AS (
    SELECT input_users.user_id
      FROM input_users
      JOIN public.profiles profiles ON profiles.id = input_users.user_id
  ),
  existing_members AS (
    SELECT valid_users.user_id
      FROM valid_users
      JOIN public.chat_group_members members
        ON members.group_id = p_group_id
       AND members.user_id = valid_users.user_id
  ),
  inserted AS (
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT p_group_id, valid_users.user_id
      FROM valid_users
     WHERE NOT EXISTS (
       SELECT 1
         FROM existing_members
        WHERE existing_members.user_id = valid_users.user_id
     )
    ON CONFLICT (group_id, user_id) DO NOTHING
    RETURNING user_id
  )
  SELECT
    (SELECT count(*) FROM input_users),
    (SELECT count(*) FROM valid_users),
    (SELECT count(*) FROM existing_members),
    (SELECT count(*) FROM inserted)
  INTO v_input_count, v_valid_count, v_existing_count, v_added_count;

  RETURN jsonb_build_object(
    'added', v_added_count,
    'existing', v_existing_count,
    'invalid', GREATEST(v_input_count - v_valid_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_chat_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group public.chat_groups%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_MEMBER_INPUT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_group
    FROM public.chat_groups
   WHERE id = p_group_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.type <> 'manual' THEN
    RAISE EXCEPTION 'GROUP_MANUAL_MEMBERS_ONLY' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.chat_group_members
   WHERE group_id = p_group_id
     AND user_id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_soft_delete_chat_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_chat_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_chat_group_members(uuid, uuid[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_chat_group_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_chat_group(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_chat_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_chat_group_members(uuid, uuid[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_chat_group_member(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_create_chat_group(text, text, jsonb, uuid) IS
  'Admin-only creation for chat groups.';

COMMENT ON FUNCTION public.admin_add_chat_group_members(uuid, uuid[], uuid) IS
  'Admin-only bulk insertion for manual chat group members.';

NOTIFY pgrst, 'reload schema';
