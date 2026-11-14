BEGIN;

-- Extend the existing bounded customer directory with the fields already
-- present on the canonical profile and its one administrator authority.
CREATE OR REPLACE FUNCTION private_api.tonart_admin_profiles_directory(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_search text := NULLIF(lower(btrim(COALESCE(p_search, ''))), '');
  v_total integer;
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF length(COALESCE(v_search, '')) > 160
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000 THEN
    RAISE EXCEPTION 'Invalid profile directory query' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
    INTO v_total
    FROM public.profiles p
   WHERE v_search IS NULL
      OR position(v_search IN lower(p.email)) > 0
      OR position(v_search IN lower(COALESCE(p.full_name, ''))) > 0;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'email', x.email,
      'fullName', x.full_name,
      'phone', CASE WHEN x.has_quote_contact THEN x.phone END,
      'whatsapp', CASE WHEN x.has_quote_contact THEN x.whatsapp END,
      'cpf', CASE WHEN x.has_quote_contact THEN x.cpf END,
      'profileCompletion', x.profile_completion,
      'isAdmin', x.is_admin,
      'createdAt', x.created_at
    ) ORDER BY x.created_at DESC, x.id DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT p.id, p.email, p.full_name, p.phone, p.whatsapp, p.cpf,
             p.created_at,
             round((
               (CASE WHEN NULLIF(btrim(COALESCE(p.full_name, '')), '') IS NOT NULL THEN 1 ELSE 0 END)
               + (CASE WHEN p.phone IS NOT NULL OR p.whatsapp IS NOT NULL THEN 1 ELSE 0 END)
               + (CASE WHEN p.delivery_address IS NOT NULL THEN 1 ELSE 0 END)
             ) / 3.0 * 100)::integer AS profile_completion,
             EXISTS (
               SELECT 1 FROM public.quotes q WHERE q.user_id = p.id
             ) AS has_quote_contact,
             EXISTS (
               SELECT 1 FROM private_api.admin_users a WHERE a.user_id = p.id
             ) AS is_admin
        FROM public.profiles p
       WHERE v_search IS NULL
          OR position(v_search IN lower(p.email)) > 0
          OR position(v_search IN lower(COALESCE(p.full_name, ''))) > 0
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT p_limit OFFSET p_offset
    ) x;

  RETURN jsonb_build_object(
    'total', v_total, 'limit', p_limit, 'offset', p_offset, 'rows', v_rows
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.tonart_admin_profiles_directory(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.tonart_admin_profiles_directory(p_search, p_limit, p_offset);
$function$;

CREATE OR REPLACE FUNCTION private_api.admin_set_tonecos_admin_access(
  p_target_user_id uuid,
  p_is_admin boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_is_admin boolean;
BEGIN
  IF v_actor_id IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_is_admin IS NULL THEN
    RAISE EXCEPTION 'Target user and admin status are required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_target_user_id) THEN
    RAISE EXCEPTION 'TARGET_PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Serialize role changes so two concurrent removals cannot remove the final
  -- administrator at the same time.
  PERFORM pg_advisory_xact_lock(764220141);
  SELECT EXISTS (
    SELECT 1 FROM private_api.admin_users a WHERE a.user_id = p_target_user_id
  ) INTO v_is_admin;

  IF p_is_admin THEN
    INSERT INTO private_api.admin_users(user_id)
    VALUES (p_target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_is_admin THEN
    IF (SELECT count(*) FROM private_api.admin_users) <= 1 THEN
      RAISE EXCEPTION 'CANNOT_REMOVE_LAST_ADMIN' USING ERRCODE = '23514';
    END IF;
    DELETE FROM private_api.admin_users WHERE user_id = p_target_user_id;
  END IF;

  RETURN jsonb_build_object('id', p_target_user_id, 'isAdmin', p_is_admin);
END;
$function$;

REVOKE ALL ON FUNCTION private_api.admin_set_tonecos_admin_access(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_set_tonecos_admin_access(uuid, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_tonecos_admin_access(
  p_target_user_id uuid,
  p_is_admin boolean
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_set_tonecos_admin_access(p_target_user_id, p_is_admin);
$function$;

REVOKE ALL ON FUNCTION public.admin_set_tonecos_admin_access(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_tonecos_admin_access(uuid, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_set_tonecos_admin_access(uuid, boolean) IS
  'Maintains administrator access in the canonical private_api.admin_users table.';

CREATE OR REPLACE FUNCTION public.tonart_admin_customer_coins_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Customer profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN (
    SELECT pg_catalog.jsonb_build_object(
      'balance', COALESCE(sum(e.delta), 0)::bigint,
      'total_earned', COALESCE(sum(e.delta) FILTER (WHERE e.delta > 0), 0)::bigint,
      'total_spent', COALESCE(-sum(e.delta) FILTER (WHERE e.delta < 0), 0)::bigint,
      'entry_count', count(*)::bigint,
      'updated_at', max(e.created_at)
    )
      FROM public.tonecos_coin_entries e
     WHERE e.user_id = p_user_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tonart_admin_customer_coins_balance(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tonart_admin_customer_coins_balance(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tonart_admin_profile_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_is_admin boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Customer profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM private_api.admin_users a WHERE a.user_id = p_user_id
  ) INTO v_is_admin;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'fullName', v_profile.full_name,
    'phone', v_profile.phone,
    'whatsapp', v_profile.whatsapp,
    'cpf', v_profile.cpf,
    'birthDate', v_profile.birth_date,
    'deliveryAddress', v_profile.delivery_address,
    'preferredContactChannel', v_profile.preferred_contact_channel,
    'quoteUpdates', v_profile.quote_updates,
    'productionUpdates', v_profile.production_updates,
    'marketingEmails', v_profile.marketing_emails,
    'profileCompletion', round((
      (CASE WHEN NULLIF(btrim(COALESCE(v_profile.full_name, '')), '') IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN v_profile.phone IS NOT NULL OR v_profile.whatsapp IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN v_profile.delivery_address IS NOT NULL THEN 1 ELSE 0 END)
    ) / 3.0 * 100)::integer,
    'isAdmin', v_is_admin,
    'createdAt', v_profile.created_at,
    'updatedAt', v_profile.updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tonart_admin_profile_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tonart_admin_profile_detail(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
