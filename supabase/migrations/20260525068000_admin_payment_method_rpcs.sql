-- Admin payment method management RPCs.
-- Keeps payment method mutations behind the shared admin boundary.

ALTER TABLE public.admin_payment_methods
  ADD COLUMN IF NOT EXISTS account_details jsonb,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

UPDATE public.admin_payment_methods
   SET is_default = false
 WHERE is_default IS NULL;

ALTER TABLE public.admin_payment_methods
  ALTER COLUMN is_default SET DEFAULT false;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY display_order ASC, created_at ASC, id ASC) AS rn
    FROM public.admin_payment_methods
   WHERE is_default = true
)
UPDATE public.admin_payment_methods methods
   SET is_default = false
  FROM ranked
 WHERE methods.id = ranked.id
   AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_payment_methods_single_default
  ON public.admin_payment_methods(is_default)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.admin_validate_payment_method_type(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text := NULLIF(lower(btrim(COALESCE(p_type, ''))), '');
BEGIN
  IF v_type NOT IN (
    'pix',
    'credit_card',
    'debit_card',
    'boleto',
    'payment_link',
    'pagseguro',
    'picpay',
    'paypal',
    'bank_transfer',
    'other'
  ) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_TYPE' USING ERRCODE = '22023';
  END IF;

  RETURN v_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_payment_method(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_data->>'name', '')), '');
  v_type text := public.admin_validate_payment_method_type(p_data->>'type');
  v_instructions text := NULLIF(btrim(COALESCE(p_data->>'instructions', '')), '');
  v_payment_link text := NULLIF(btrim(COALESCE(p_data->>'payment_link', '')), '');
  v_pix_key text := NULLIF(btrim(COALESCE(p_data->>'pix_key', '')), '');
  v_is_active boolean := COALESCE((p_data->>'is_active')::boolean, true);
  v_is_default boolean := COALESCE((p_data->>'is_default')::boolean, false);
  v_display_order integer := COALESCE((p_data->>'display_order')::integer, 0);
  v_method public.admin_payment_methods%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_PAYLOAD_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_name IS NULL OR length(v_name) > 120 OR v_name ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_NAME' USING ERRCODE = '22023';
  END IF;

  IF v_instructions IS NULL OR length(v_instructions) > 4000 OR v_instructions ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_INSTRUCTIONS' USING ERRCODE = '22023';
  END IF;

  IF v_payment_link IS NOT NULL
    AND (length(v_payment_link) > 2048 OR v_payment_link !~* '^https://') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_LINK' USING ERRCODE = '22023';
  END IF;

  IF v_pix_key IS NOT NULL AND length(v_pix_key) > 255 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_PIX_KEY' USING ERRCODE = '22023';
  END IF;

  IF v_display_order < 0 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_ORDER' USING ERRCODE = '22023';
  END IF;

  IF v_is_default THEN
    UPDATE public.admin_payment_methods SET is_default = false WHERE is_default = true;
  END IF;

  INSERT INTO public.admin_payment_methods (
    name,
    type,
    instructions,
    payment_link,
    pix_key,
    account_details,
    is_active,
    is_default,
    display_order
  )
  VALUES (
    v_name,
    v_type,
    v_instructions,
    v_payment_link,
    v_pix_key,
    CASE WHEN p_data ? 'account_details' THEN p_data->'account_details' ELSE NULL END,
    v_is_active,
    v_is_default,
    v_display_order
  )
  RETURNING * INTO v_method;

  RETURN to_jsonb(v_method);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_method(
  p_method_id uuid,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.admin_payment_methods%ROWTYPE;
  v_name text;
  v_type text;
  v_instructions text;
  v_payment_link text;
  v_pix_key text;
  v_account_details jsonb;
  v_is_active boolean;
  v_is_default boolean;
  v_display_order integer;
  v_method public.admin_payment_methods%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_method_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_PAYLOAD_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.admin_payment_methods
   WHERE id = p_method_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_name := CASE WHEN p_data ? 'name' THEN NULLIF(btrim(COALESCE(p_data->>'name', '')), '') ELSE v_existing.name END;
  v_type := CASE WHEN p_data ? 'type' THEN public.admin_validate_payment_method_type(p_data->>'type') ELSE v_existing.type END;
  v_instructions := CASE WHEN p_data ? 'instructions' THEN NULLIF(btrim(COALESCE(p_data->>'instructions', '')), '') ELSE v_existing.instructions END;
  v_payment_link := CASE WHEN p_data ? 'payment_link' THEN NULLIF(btrim(COALESCE(p_data->>'payment_link', '')), '') ELSE v_existing.payment_link END;
  v_pix_key := CASE WHEN p_data ? 'pix_key' THEN NULLIF(btrim(COALESCE(p_data->>'pix_key', '')), '') ELSE v_existing.pix_key END;
  v_account_details := CASE WHEN p_data ? 'account_details' THEN p_data->'account_details' ELSE v_existing.account_details END;
  v_is_active := CASE WHEN p_data ? 'is_active' THEN (p_data->>'is_active')::boolean ELSE v_existing.is_active END;
  v_is_default := CASE WHEN p_data ? 'is_default' THEN (p_data->>'is_default')::boolean ELSE v_existing.is_default END;
  v_display_order := CASE WHEN p_data ? 'display_order' THEN (p_data->>'display_order')::integer ELSE v_existing.display_order END;

  IF v_name IS NULL OR length(v_name) > 120 OR v_name ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_NAME' USING ERRCODE = '22023';
  END IF;

  IF v_instructions IS NULL OR length(v_instructions) > 4000 OR v_instructions ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_INSTRUCTIONS' USING ERRCODE = '22023';
  END IF;

  IF v_payment_link IS NOT NULL
    AND (length(v_payment_link) > 2048 OR v_payment_link !~* '^https://') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_LINK' USING ERRCODE = '22023';
  END IF;

  IF v_pix_key IS NOT NULL AND length(v_pix_key) > 255 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_PIX_KEY' USING ERRCODE = '22023';
  END IF;

  IF v_display_order < 0 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_ORDER' USING ERRCODE = '22023';
  END IF;

  IF v_is_default THEN
    UPDATE public.admin_payment_methods
       SET is_default = false
     WHERE id <> p_method_id
       AND is_default = true;
  END IF;

  UPDATE public.admin_payment_methods
     SET name = v_name,
         type = v_type,
         instructions = v_instructions,
         payment_link = v_payment_link,
         pix_key = v_pix_key,
         account_details = v_account_details,
         is_active = v_is_active,
         is_default = v_is_default,
         display_order = v_display_order,
         updated_at = now()
   WHERE id = p_method_id
   RETURNING * INTO v_method;

  RETURN to_jsonb(v_method);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_default_payment_method(p_method_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_access();

  IF NOT EXISTS (SELECT 1 FROM public.admin_payment_methods WHERE id = p_method_id) THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.admin_payment_methods SET is_default = false WHERE is_default = true;
  UPDATE public.admin_payment_methods
     SET is_default = true,
         updated_at = now()
   WHERE id = p_method_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_payment_method_active(
  p_method_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.admin_payment_methods
     SET is_active = p_is_active,
         is_default = CASE WHEN p_is_active THEN is_default ELSE false END,
         updated_at = now()
   WHERE id = p_method_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_method(p_method_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.admin_payment_methods
   WHERE id = p_method_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_payment_method_type(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_payment_method(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_payment_method(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_default_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_payment_method(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_payment_method(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_method(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_default_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_method(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_create_payment_method(jsonb) IS
  'Admin-only creation for configured payment methods.';

NOTIFY pgrst, 'reload schema';
