-- Ensure current-user profile RPCs seed profiles with required auth data.

CREATE OR REPLACE FUNCTION public.ensure_profile_row_from_auth_user(p_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_full_name text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
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
$$;

CREATE OR REPLACE FUNCTION public.submit_order_migration_request(
  p_full_name text,
  p_email text,
  p_phone text,
  p_old_order_number text,
  p_order_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_full_name text := public.customer_mutation_validate_text(p_full_name, 'full_name', 160, true);
  v_email text := public.customer_mutation_validate_email(p_email, 'email', true);
  v_phone text := public.customer_mutation_validate_text(p_phone, 'phone', 40, false);
  v_old_order_number text := public.customer_mutation_validate_text(p_old_order_number, 'old_order_number', 80, false);
  v_order_description text := public.customer_mutation_validate_text(p_order_description, 'order_description', 4000, true);
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF v_phone IS NOT NULL AND v_phone !~ '^[0-9+(). -]{8,40}$' THEN
    RAISE EXCEPTION 'phone is invalid' USING ERRCODE = '22023';
  END IF;

  PERFORM public.ensure_profile_row_from_auth_user(v_user_id);

  INSERT INTO public.order_migrations (
    user_id,
    full_name,
    email,
    phone,
    old_order_number,
    order_description,
    status
  )
  VALUES (
    v_user_id,
    v_full_name,
    v_email,
    v_phone,
    v_old_order_number,
    v_order_description,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_current_user_profile(p_profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_row public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'Profile payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_profile)
  LOOP
    IF v_key NOT IN (
      'delivery_address',
      'preferences_text',
      'preference_tags',
      'full_name',
      'phone',
      'whatsapp',
      'cpf',
      'birth_date',
      'email_notifications',
      'order_updates',
      'marketing_emails'
    ) THEN
      RAISE EXCEPTION 'Unsupported profile field: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'delivery_address'
       AND jsonb_typeof(v_value) NOT IN ('object', 'null') THEN
      RAISE EXCEPTION 'delivery_address must be an object' USING ERRCODE = '22023';
    END IF;

    IF v_key = 'preference_tags' THEN
      PERFORM public.customer_mutation_jsonb_text_array(v_value);
    END IF;

    IF v_key IN ('email_notifications', 'order_updates', 'marketing_emails')
       AND jsonb_typeof(v_value) NOT IN ('boolean', 'null') THEN
      RAISE EXCEPTION '% must be boolean', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  PERFORM public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false);
  PERFORM public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false);

  IF p_profile ? 'cpf'
     AND p_profile->>'cpf' IS NOT NULL
     AND public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false) !~ '^[0-9.\-]{11,20}$' THEN
    RAISE EXCEPTION 'cpf is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_profile ? 'birth_date'
     AND p_profile->>'birth_date' IS NOT NULL
     AND public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'birth_date must use YYYY-MM-DD' USING ERRCODE = '22023';
  END IF;

  PERFORM public.ensure_profile_row_from_auth_user(v_user_id);

  UPDATE public.profiles
     SET delivery_address = CASE WHEN p_profile ? 'delivery_address'
           THEN NULLIF(p_profile->'delivery_address', 'null'::jsonb)
           ELSE delivery_address
         END,
         preferences_text = CASE WHEN p_profile ? 'preferences_text'
           THEN public.customer_mutation_validate_text(p_profile->>'preferences_text', 'preferences_text', 2000, false)
           ELSE preferences_text
         END,
         preference_tags = CASE WHEN p_profile ? 'preference_tags'
           THEN public.customer_mutation_jsonb_text_array(p_profile->'preference_tags')
           ELSE preference_tags
         END,
         full_name = CASE WHEN p_profile ? 'full_name'
           THEN public.customer_mutation_validate_text(p_profile->>'full_name', 'full_name', 160, false)
           ELSE full_name
         END,
         phone = CASE WHEN p_profile ? 'phone'
           THEN public.customer_mutation_validate_text(p_profile->>'phone', 'phone', 40, false)
           ELSE phone
         END,
         whatsapp = CASE WHEN p_profile ? 'whatsapp'
           THEN public.customer_mutation_validate_text(p_profile->>'whatsapp', 'whatsapp', 40, false)
           ELSE whatsapp
         END,
         cpf = CASE WHEN p_profile ? 'cpf'
           THEN public.customer_mutation_validate_text(p_profile->>'cpf', 'cpf', 20, false)
           ELSE cpf
         END,
         birth_date = CASE WHEN p_profile ? 'birth_date'
           THEN public.customer_mutation_validate_text(p_profile->>'birth_date', 'birth_date', 20, false)
           ELSE birth_date
         END,
         email_notifications = CASE WHEN p_profile ? 'email_notifications'
           THEN (p_profile->>'email_notifications')::boolean
           ELSE email_notifications
         END,
         order_updates = CASE WHEN p_profile ? 'order_updates'
           THEN (p_profile->>'order_updates')::boolean
           ELSE order_updates
         END,
         marketing_emails = CASE WHEN p_profile ? 'marketing_emails'
           THEN (p_profile->>'marketing_emails')::boolean
           ELSE marketing_emails
         END,
         updated_at = now()
   WHERE id = v_user_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_collector_profile(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_username text;
  v_row public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required' USING ERRCODE = '28000';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Collector profile payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_updates)
  LOOP
    IF v_key NOT IN ('username', 'display_name', 'bio', 'avatar_url', 'is_public') THEN
      RAISE EXCEPTION 'Unsupported collector profile field: %', v_key USING ERRCODE = '22023';
    END IF;

    IF v_key = 'is_public' AND jsonb_typeof(v_value) <> 'boolean' THEN
      RAISE EXCEPTION 'is_public must be boolean' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_updates ? 'username' THEN
    v_username := lower(public.customer_mutation_validate_text(p_updates->>'username', 'username', 32, false));

    IF v_username IS NOT NULL AND v_username !~ '^[a-z0-9_]{3,32}$' THEN
      RAISE EXCEPTION 'username is invalid' USING ERRCODE = '22023';
    END IF;

    IF v_username IS NOT NULL
       AND EXISTS (
         SELECT 1
           FROM public.profiles
          WHERE lower(username) = v_username
            AND id <> v_user_id
       ) THEN
      RAISE EXCEPTION 'username is already in use' USING ERRCODE = '23505';
    END IF;
  END IF;

  PERFORM public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false);
  PERFORM public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false);
  PERFORM public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false);

  PERFORM public.ensure_profile_row_from_auth_user(v_user_id);

  UPDATE public.profiles
     SET username = CASE WHEN p_updates ? 'username' THEN v_username ELSE username END,
         display_name = CASE WHEN p_updates ? 'display_name'
           THEN public.customer_mutation_validate_text(p_updates->>'display_name', 'display_name', 80, false)
           ELSE display_name
         END,
         bio = CASE WHEN p_updates ? 'bio'
           THEN public.customer_mutation_validate_text(p_updates->>'bio', 'bio', 500, false)
           ELSE bio
         END,
         avatar_url = CASE WHEN p_updates ? 'avatar_url'
           THEN public.customer_mutation_validate_text(p_updates->>'avatar_url', 'avatar_url', 1000, false)
           ELSE avatar_url
         END,
         is_public = CASE WHEN p_updates ? 'is_public'
           THEN (p_updates->>'is_public')::boolean
           ELSE is_public
         END,
         updated_at = now()
   WHERE id = v_user_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile_row_from_auth_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_row_from_auth_user(uuid) TO service_role;

COMMENT ON FUNCTION public.ensure_profile_row_from_auth_user(uuid) IS
  'Initializes the current profile row from auth.users for server-side customer RPCs.';

NOTIFY pgrst, 'reload schema';
