-- Automatic group membership synchronization RPCs.
-- Centralizes group criteria evaluation and member add/remove operations in
-- the database so Edge cron and admin UI share the same source of truth.

ALTER TABLE public.chat_groups
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS membership_criteria jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_chat_groups_type_active
  ON public.chat_groups(type)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz
);

ALTER TABLE public.chat_group_members
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

UPDATE public.chat_group_members
   SET id = gen_random_uuid()
 WHERE id IS NULL;

UPDATE public.chat_group_members
   SET joined_at = now()
 WHERE joined_at IS NULL;

ALTER TABLE public.chat_group_members
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN joined_at SET DEFAULT now();

DELETE FROM public.chat_group_members older
USING public.chat_group_members newer
WHERE older.ctid < newer.ctid
  AND older.group_id = newer.group_id
  AND older.user_id = newer.user_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.chat_group_members'::regclass
       AND conname = 'chat_group_members_group_user_unique'
  ) THEN
    ALTER TABLE public.chat_group_members
      ADD CONSTRAINT chat_group_members_group_user_unique UNIQUE (group_id, user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id
  ON public.chat_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id
  ON public.chat_group_members(user_id);

ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_group_members_select_access" ON public.chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert_admin" ON public.chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete_admin" ON public.chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update_own" ON public.chat_group_members;

CREATE POLICY "chat_group_members_select_access"
  ON public.chat_group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "chat_group_members_insert_admin"
  ON public.chat_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "chat_group_members_delete_admin"
  ON public.chat_group_members
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "chat_group_members_update_own"
  ON public.chat_group_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.subscription_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

DELETE FROM public.subscription_collections older
USING public.subscription_collections newer
WHERE older.ctid < newer.ctid
  AND older.subscription_id = newer.subscription_id
  AND older.collection_id = newer.collection_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.subscription_collections'::regclass
       AND conname = 'subscription_collections_subscription_collection_unique'
  ) THEN
    ALTER TABLE public.subscription_collections
      ADD CONSTRAINT subscription_collections_subscription_collection_unique
      UNIQUE (subscription_id, collection_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_subscription_collections_subscription_id
  ON public.subscription_collections(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_collections_collection_id
  ON public.subscription_collections(collection_id);

CREATE OR REPLACE FUNCTION public.automatic_group_expected_user_ids(
  p_group_type text,
  p_criteria jsonb
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text := COALESCE(NULLIF(p_criteria->>'type', ''), p_group_type);
  v_collection_id uuid;
  v_plan text := NULLIF(p_criteria->>'plan', '');
  v_launch_criteria text := COALESCE(NULLIF(p_criteria->>'criteria', ''), 'all_users');
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_users uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_criteria ? 'collectionId' THEN
    IF (p_criteria->>'collectionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_collection_id := (p_criteria->>'collectionId')::uuid;
    ELSE
      RETURN ARRAY[]::uuid[];
    END IF;
  END IF;

  IF NULLIF(p_criteria->>'dateFrom', '') IS NOT NULL THEN
    BEGIN
      v_date_from := (p_criteria->>'dateFrom')::timestamptz;
    EXCEPTION WHEN others THEN
      v_date_from := NULL;
    END;
  END IF;

  IF NULLIF(p_criteria->>'dateTo', '') IS NOT NULL THEN
    BEGIN
      v_date_to := (p_criteria->>'dateTo')::timestamptz;
    EXCEPTION WHEN others THEN
      v_date_to := NULL;
    END;
  END IF;

  IF v_type = 'assinantes' THEN
    SELECT COALESCE(array_agg(DISTINCT s.user_id), ARRAY[]::uuid[])
      INTO v_users
      FROM public.subscriptions s
     WHERE s.status::text = COALESCE(NULLIF(p_criteria->>'subscriptionStatus', ''), 'active')
       AND (v_plan IS NULL OR s.plan_type::text = v_plan)
       AND (
         v_collection_id IS NULL
         OR s.collection_id = v_collection_id
         OR EXISTS (
           SELECT 1
             FROM public.subscription_collections sc
            WHERE sc.subscription_id = s.id
              AND sc.collection_id = v_collection_id
         )
       );
  ELSIF v_type = 'colecao' THEN
    IF v_collection_id IS NULL THEN
      RETURN ARRAY[]::uuid[];
    END IF;

    SELECT COALESCE(array_agg(DISTINCT s.user_id), ARRAY[]::uuid[])
      INTO v_users
      FROM public.subscriptions s
     WHERE s.status::text = 'active'
       AND (
         s.collection_id = v_collection_id
         OR EXISTS (
           SELECT 1
             FROM public.subscription_collections sc
            WHERE sc.subscription_id = s.id
              AND sc.collection_id = v_collection_id
         )
       );
  ELSIF v_type = 'lancamentos' THEN
    IF v_launch_criteria = 'previous_buyers' THEN
      SELECT COALESCE(array_agg(DISTINCT o.user_id), ARRAY[]::uuid[])
        INTO v_users
        FROM public.orders o
       WHERE o.status::text = 'completed';
    ELSE
      SELECT COALESCE(array_agg(DISTINCT p.id), ARRAY[]::uuid[])
        INTO v_users
        FROM public.profiles p;
    END IF;
  ELSIF v_type = 'pedidos' THEN
    SELECT COALESCE(array_agg(DISTINCT o.user_id), ARRAY[]::uuid[])
      INTO v_users
      FROM public.orders o
     WHERE (
       NOT (p_criteria ? 'status')
       OR o.status::text IN (
         SELECT jsonb_array_elements_text(p_criteria->'status')
       )
     )
       AND (v_date_from IS NULL OR o.created_at >= v_date_from)
       AND (v_date_to IS NULL OR o.created_at <= v_date_to);
  END IF;

  RETURN COALESCE(v_users, ARRAY[]::uuid[]);
END;
$$;

REVOKE ALL ON FUNCTION public.automatic_group_expected_user_ids(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automatic_group_expected_user_ids(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_automatic_group_members(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group record;
  v_expected uuid[] := ARRAY[]::uuid[];
  v_added integer := 0;
  v_removed integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_group_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, type, membership_criteria
    INTO v_group
    FROM public.chat_groups
   WHERE id = p_group_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.type = 'manual' THEN
    RETURN jsonb_build_object(
      'groupId', v_group.id,
      'groupName', v_group.name,
      'added', 0,
      'removed', 0
    );
  END IF;

  v_expected := public.automatic_group_expected_user_ids(
    v_group.type,
    COALESCE(v_group.membership_criteria, '{}'::jsonb)
  );

  WITH expected(user_id) AS (
    SELECT DISTINCT unnest(v_expected)
  ),
  inserted AS (
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT v_group.id, expected.user_id
      FROM expected
     WHERE expected.user_id IS NOT NULL
    ON CONFLICT (group_id, user_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM inserted;

  WITH removed AS (
    DELETE FROM public.chat_group_members member
     WHERE member.group_id = v_group.id
       AND NOT (member.user_id = ANY(v_expected))
    RETURNING 1
  )
  SELECT count(*) INTO v_removed FROM removed;

  RETURN jsonb_build_object(
    'groupId', v_group.id,
    'groupName', v_group.name,
    'added', v_added,
    'removed', v_removed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_automatic_group_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_automatic_group_members(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_all_automatic_groups()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group record;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_total_added integer := 0;
  v_total_removed integer := 0;
  v_errors integer := 0;
  v_groups_processed integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  FOR v_group IN
    SELECT id, name
      FROM public.chat_groups
     WHERE deleted_at IS NULL
       AND type <> 'manual'
     ORDER BY created_at ASC
  LOOP
    v_groups_processed := v_groups_processed + 1;

    BEGIN
      v_result := public.sync_automatic_group_members(v_group.id);
      v_total_added := v_total_added + COALESCE((v_result->>'added')::integer, 0);
      v_total_removed := v_total_removed + COALESCE((v_result->>'removed')::integer, 0);
      v_results := v_results || jsonb_build_array(v_result);
    EXCEPTION WHEN others THEN
      v_errors := v_errors + 1;
      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'groupId', v_group.id,
          'groupName', v_group.name,
          'added', 0,
          'removed', 0,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_groups_processed = 0 THEN 'No automatic groups to sync'
      ELSE 'Auto-sync completed'
    END,
    'summary', jsonb_build_object(
      'groupsProcessed', v_groups_processed,
      'totalAdded', v_total_added,
      'totalRemoved', v_total_removed,
      'errors', v_errors
    ),
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_all_automatic_groups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_all_automatic_groups() TO authenticated, service_role;

COMMENT ON FUNCTION public.sync_automatic_group_members(uuid) IS
  'Admin-only synchronization for one automatic chat group.';

COMMENT ON FUNCTION public.sync_all_automatic_groups() IS
  'Admin/service-role synchronization for all active automatic chat groups.';

NOTIFY pgrst, 'reload schema';
