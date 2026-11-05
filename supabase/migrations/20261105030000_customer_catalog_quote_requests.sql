-- Staged only: do not apply before the Tonecos Supabase project is connected,
-- the user-facing account/quotes flow is approved, and RLS is tested there.
-- Quotes remain the single commercial authority. Catalog D1 is read-only here.
BEGIN;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS requested_catalog_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS catalog_requested_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.quotes'::regclass
      AND conname = 'quotes_requested_catalog_models_shape'
  ) THEN
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_requested_catalog_models_shape
      CHECK (jsonb_typeof(requested_catalog_models) = 'array'
        AND jsonb_array_length(requested_catalog_models) <= 50) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_quotes_catalog_recent_user
  ON public.quotes (user_id, catalog_requested_at DESC)
  WHERE catalog_requested_at IS NOT NULL;

-- The privileged writer is isolated from PostgREST's exposed public schema.
-- Never grant browser DML on quotes, nor accept client-provided amount/status/user.
CREATE SCHEMA IF NOT EXISTS private_api;
REVOKE ALL ON SCHEMA private_api FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.submit_catalog_quote_request(
  p_models jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_entry jsonb;
  v_slug text;
  v_quantity_text text;
  v_seen text[] := ARRAY[]::text[];
  v_models jsonb := '[]'::jsonb;
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_quote_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Complete your account profile before requesting a quote'
      USING ERRCODE = '23503';
  END IF;

  IF p_models IS NULL OR jsonb_typeof(p_models) <> 'array'
    OR jsonb_array_length(p_models) < 1 OR jsonb_array_length(p_models) > 50 THEN
    RAISE EXCEPTION 'Select between 1 and 50 models'
      USING ERRCODE = '22023';
  END IF;

  IF length(COALESCE(v_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Quote notes exceed 2000 characters'
      USING ERRCODE = '22023';
  END IF;

  FOR v_entry IN SELECT value FROM jsonb_array_elements(p_models)
  LOOP
    IF jsonb_typeof(v_entry) <> 'object'
      OR NOT (v_entry ? 'slug') OR NOT (v_entry ? 'quantity')
      OR (v_entry - 'slug' - 'quantity') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid quote model'
        USING ERRCODE = '22023';
    END IF;

    v_slug := v_entry ->> 'slug';
    v_quantity_text := v_entry ->> 'quantity';

    IF jsonb_typeof(v_entry -> 'slug') <> 'string'
      OR v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
      OR jsonb_typeof(v_entry -> 'quantity') <> 'number'
      OR v_quantity_text !~ '^(?:[1-9]|10)$' THEN
      RAISE EXCEPTION 'Invalid quote model slug or quantity'
        USING ERRCODE = '22023';
    END IF;

    IF v_slug = ANY(v_seen) THEN
      RAISE EXCEPTION 'Duplicate models are not allowed in a quote'
        USING ERRCODE = '22023';
    END IF;
    v_seen := array_append(v_seen, v_slug);
    v_models := v_models || jsonb_build_array(
      jsonb_build_object('slug', v_slug, 'quantity', v_quantity_text::integer)
    );
  END LOOP;

  -- A short per-account cooldown prevents accidental double submission.
  IF EXISTS (
    SELECT 1 FROM public.quotes
    WHERE user_id = v_user_id
      AND catalog_requested_at > clock_timestamp() - interval '60 seconds'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Wait before sending another quote'
      USING ERRCODE = 'P0001';
  END IF;

  -- Existing quotes.total_amount is NOT NULL: 0 means UNPRICED here, never
  -- a quotation or payment authorization. The admin must price manually.
  INSERT INTO public.quotes (
    user_id, total_amount, status, payment_status, is_preorder,
    requested_catalog_models, catalog_requested_at, notes
  )
  VALUES (
    v_user_id, 0, 'pending', 'pending', false,
    v_models, clock_timestamp(), v_notes
  )
  RETURNING id INTO v_quote_id;

  RETURN v_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.submit_catalog_quote_request(jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.submit_catalog_quote_request(jsonb, text)
  TO authenticated, service_role;

-- Stable public RPC name, but no exposed SECURITY DEFINER body.
CREATE OR REPLACE FUNCTION public.submit_catalog_quote_request(
  p_models jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.submit_catalog_quote_request(p_models, p_notes);
$function$;

REVOKE ALL ON FUNCTION public.submit_catalog_quote_request(jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_catalog_quote_request(jsonb, text)
  TO authenticated, service_role;

-- Preserve existing SELECT own/admin policies and existing quote DML revocations.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quotes FROM authenticated;
COMMENT ON COLUMN public.quotes.requested_catalog_models IS
  'Customer-requested published-catalog slug/quantity references, not verified prices or replicated catalog records.';
COMMENT ON COLUMN public.quotes.catalog_requested_at IS
  'Set only by the authenticated quote intake RPC; null on earlier quotes.';

-- A quote is priced only by an authenticated administrator, never by a visitor.
-- Pricing a request is not payment, payment-link creation, or order acceptance.
CREATE OR REPLACE FUNCTION private_api.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_updated uuid;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_quote_id IS NULL OR p_amount IS NULL
    OR p_amount <= 0 OR p_amount > 99999999.99
    OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Invalid quote amount' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
  SET total_amount = p_amount, status = 'answered'
  WHERE id = p_quote_id
    AND catalog_requested_at IS NOT NULL
    AND status IN ('pending', 'reviewing')
  RETURNING id INTO v_updated;

  IF v_updated IS NULL THEN
    RAISE EXCEPTION 'Catalog quote not found or already answered'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.answer_catalog_quote_request(uuid, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.answer_catalog_quote_request(uuid, numeric)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.answer_catalog_quote_request(p_quote_id, p_amount);
$function$;

REVOKE ALL ON FUNCTION public.answer_catalog_quote_request(uuid, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_catalog_quote_request(uuid, numeric)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
