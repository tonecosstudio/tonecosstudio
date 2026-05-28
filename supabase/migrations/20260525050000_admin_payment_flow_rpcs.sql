-- Admin payment link and preorder payment RPCs.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_for_final_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_payment_notified_at timestamptz;

DO $$
BEGIN
  IF to_regtype('public.payment_status') IS NOT NULL THEN
    ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'deposit_paid';
    ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'fully_paid';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  payment_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_link text,
  pix_key text,
  instructions text,
  sent_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payment_links_quote_id ON public.payment_links(quote_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_links_payment_type_valid'
      AND conrelid = 'public.payment_links'::regclass
  ) THEN
    ALTER TABLE public.payment_links
      ADD CONSTRAINT payment_links_payment_type_valid
      CHECK (payment_type IN ('voucher', 'deposit', 'final', 'full')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_links_amount_positive'
      AND conrelid = 'public.payment_links'::regclass
  ) THEN
    ALTER TABLE public.payment_links
      ADD CONSTRAINT payment_links_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quote_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  payment_method text NOT NULL DEFAULT 'manual',
  paid_at timestamptz,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_payments
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_quote_payments_quote_id ON public.quote_payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_payments_user_id ON public.quote_payments(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quote_payments_payment_type_valid'
      AND conrelid = 'public.quote_payments'::regclass
  ) THEN
    ALTER TABLE public.quote_payments
      ADD CONSTRAINT quote_payments_payment_type_valid
      CHECK (payment_type IN ('deposit', 'final', 'voucher', 'full')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quote_payments_amount_positive'
      AND conrelid = 'public.quote_payments'::regclass
  ) THEN
    ALTER TABLE public.quote_payments
      ADD CONSTRAINT quote_payments_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_links FROM anon;
REVOKE ALL ON TABLE public.quote_payments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_payments TO authenticated;

DROP POLICY IF EXISTS "payment_links_admin_manage" ON public.payment_links;
CREATE POLICY "payment_links_admin_manage"
  ON public.payment_links
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "quote_payments_select_own_or_admin" ON public.quote_payments;
CREATE POLICY "quote_payments_select_own_or_admin"
  ON public.quote_payments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_payments.quote_id
        AND q.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "quote_payments_admin_manage" ON public.quote_payments;
CREATE POLICY "quote_payments_admin_manage"
  ON public.quote_payments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_validate_payment_text(
  p_value text,
  p_label text,
  p_max_length integer,
  p_required boolean DEFAULT true,
  p_allow_newlines boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
  v_control_check text;
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  v_control_check := CASE
    WHEN p_allow_newlines THEN translate(v_value, E'\n\r\t', '')
    ELSE v_value
  END;

  IF length(v_value) > p_max_length OR v_control_check ~ '[[:cntrl:]]' OR v_value ~ '[<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_validate_payment_url(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text := NULLIF(btrim(COALESCE(p_url, '')), '');
BEGIN
  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF length(v_url) > 2000
    OR v_url ~ '[[:cntrl:]<>]'
    OR lower(v_url) !~ '^https://[a-z0-9][a-z0-9.-]*(/|:|$)' THEN
    RAISE EXCEPTION 'Invalid payment URL' USING ERRCODE = '22023';
  END IF;

  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_send_payment_link(
  p_quote_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_link text DEFAULT NULL,
  p_pix_key text DEFAULT NULL,
  p_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount numeric(10,2) := round(COALESCE(p_amount, 0), 2);
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_payment_link text := public.admin_validate_payment_url(p_payment_link);
  v_pix_key text := public.admin_validate_payment_text(p_pix_key, 'PIX key', 220, false);
  v_instructions text := public.admin_validate_payment_text(p_instructions, 'payment instructions', 4000, true, true);
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote is required' USING ERRCODE = '22023';
  END IF;

  IF v_payment_type NOT IN ('voucher', 'deposit', 'final', 'full') THEN
    RAISE EXCEPTION 'Invalid payment type' USING ERRCODE = '22023';
  END IF;

  IF v_amount <= 0 OR v_amount > 999999.99 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  IF v_payment_link IS NULL AND v_pix_key IS NULL THEN
    RAISE EXCEPTION 'Payment link or PIX key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.payment_links (
    quote_id,
    payment_type,
    amount,
    payment_link,
    pix_key,
    instructions,
    sent_by,
    status,
    updated_at
  )
  VALUES (
    p_quote_id,
    v_payment_type,
    v_amount,
    v_payment_link,
    v_pix_key,
    v_instructions,
    auth.uid(),
    'sent',
    now()
  )
  RETURNING id INTO v_result_id;

  UPDATE public.quotes
  SET payment_link = v_payment_link,
      pix_key = v_pix_key,
      payment_instructions = v_instructions,
      payment_link_sent_at = now(),
      updated_at = now()
  WHERE id = p_quote_id;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_release_preorder_final_payment(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.quotes
  SET ready_for_final_payment = true,
      final_payment_notified_at = now(),
      updated_at = now()
  WHERE id = p_quote_id
    AND COALESCE(is_preorder, false) = true
    AND payment_status = 'deposit_paid'
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Preorder is not ready for final payment release' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_register_preorder_manual_payment(
  p_quote_id uuid,
  p_payment_type text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_amount numeric(10,2) := round(COALESCE(p_amount, 0), 2);
  v_payment_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_payment_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'Invalid preorder payment type' USING ERRCODE = '22023';
  END IF;

  IF v_amount <= 0 OR v_amount > 999999.99 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_quote
  FROM public.quotes
  WHERE id = p_quote_id
    AND COALESCE(is_preorder, false) = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preorder quote not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment_type = 'deposit' AND COALESCE(v_quote.payment_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'Deposit can only be registered for pending preorders' USING ERRCODE = '22023';
  END IF;

  IF v_payment_type = 'final'
    AND (
      COALESCE(v_quote.payment_status, '') <> 'deposit_paid'
      OR COALESCE(v_quote.ready_for_final_payment, false) = false
    ) THEN
    RAISE EXCEPTION 'Final payment can only be registered after release' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quote_payments (
    quote_id,
    user_id,
    payment_type,
    amount,
    status,
    payment_method,
    paid_at,
    recorded_by,
    updated_at
  )
  VALUES (
    p_quote_id,
    v_quote.user_id,
    v_payment_type,
    v_amount,
    'completed',
    'manual',
    now(),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.quotes
  SET payment_status = CASE
        WHEN v_payment_type = 'deposit' THEN 'deposit_paid'
        ELSE 'fully_paid'
      END,
      ready_for_final_payment = CASE
        WHEN v_payment_type = 'final' THEN false
        ELSE ready_for_final_payment
      END,
      updated_at = now()
  WHERE id = p_quote_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_payment_text(text, text, integer, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_validate_payment_url(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_send_payment_link(uuid, numeric, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_release_preorder_final_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_register_preorder_manual_payment(uuid, text, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_send_payment_link(uuid, numeric, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_release_preorder_final_payment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_register_preorder_manual_payment(uuid, text, numeric) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_send_payment_link(uuid, numeric, text, text, text, text) IS
  'Admin-only transactional payment link creation and quote payment instructions update.';
COMMENT ON FUNCTION public.admin_release_preorder_final_payment(uuid) IS
  'Admin-only preorder final payment release.';
COMMENT ON FUNCTION public.admin_register_preorder_manual_payment(uuid, text, numeric) IS
  'Admin-only preorder manual payment registration with quote status transition.';

NOTIFY pgrst, 'reload schema';
