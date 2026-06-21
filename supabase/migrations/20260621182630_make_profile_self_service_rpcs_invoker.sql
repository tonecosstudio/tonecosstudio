-- Profile self-service mutations should run as invoker so RLS remains active.
-- The profile bootstrap helper stays SECURITY DEFINER because it must read
-- auth.users, but it is now bound to auth.uid() for browser callers.

CREATE OR REPLACE FUNCTION public.ensure_profile_row_from_auth_user(p_user_id uuid)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_auth_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_full_name text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
     AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot initialize another user profile' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_auth_user
    FROM auth.users
   WHERE id = p_user_id;

  IF v_auth_user.id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user record not found' USING ERRCODE = 'P0002';
  END IF;

  IF NULLIF(btrim(COALESCE(v_auth_user.email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Authenticated user email is required to initialize profile'
      USING ERRCODE = '22023';
  END IF;

  v_full_name := NULLIF(
    btrim(COALESCE(v_auth_user.raw_user_meta_data->>'full_name', v_auth_user.raw_user_meta_data->>'name', '')),
    ''
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (p_user_id, lower(v_auth_user.email), v_full_name, 'customer')
  ON CONFLICT (id) DO NOTHING;

  SELECT *
    INTO v_profile
    FROM public.profiles
   WHERE id = p_user_id;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile row could not be initialized' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_profile;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_profile_row_from_auth_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_row_from_auth_user(uuid)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.customer_mutation_validate_text(text, text, integer, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_mutation_jsonb_text_array(jsonb)
  TO authenticated;

GRANT UPDATE (
  username,
  display_name,
  bio,
  avatar_url,
  is_public,
  delivery_address,
  preferences_text,
  preference_tags,
  full_name,
  phone,
  whatsapp,
  cpf,
  birth_date,
  email_notifications,
  order_updates,
  marketing_emails,
  updated_at
) ON public.profiles TO authenticated;

ALTER FUNCTION public.update_current_user_collector_profile(jsonb) SECURITY INVOKER;
ALTER FUNCTION public.upsert_current_user_profile(jsonb) SECURITY INVOKER;

COMMENT ON FUNCTION public.ensure_profile_row_from_auth_user(uuid) IS
  'Security definer bootstrap helper restricted to auth.uid() for authenticated callers.';
COMMENT ON FUNCTION public.update_current_user_collector_profile(jsonb) IS
  'Security invoker self-service wrapper; authorization is enforced by profiles RLS and column grants.';
COMMENT ON FUNCTION public.upsert_current_user_profile(jsonb) IS
  'Security invoker self-service wrapper; authorization is enforced by profiles RLS and column grants.';
