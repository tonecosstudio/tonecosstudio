BEGIN;

-- Pre-orders stay on the existing authenticated quote record and use the existing
-- quote payment and private payment-voucher storage authorities.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_voucher_path text,
  ADD COLUMN IF NOT EXISTS payment_voucher_type text,
  ADD COLUMN IF NOT EXISTS payment_voucher_rejection_reason text,
  ADD COLUMN IF NOT EXISTS payment_voucher_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_voucher_reviewed_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.quote_payments
  ADD COLUMN IF NOT EXISTS payment_voucher_path text;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS tonecos_quote_payment_voucher_path_safe,
  ADD CONSTRAINT tonecos_quote_payment_voucher_path_safe CHECK (
    payment_voucher_path IS NULL OR (
      length(payment_voucher_path) <= 512
      AND payment_voucher_path ~
        '^quotes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    )
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS tonecos_quote_payment_voucher_type_valid,
  ADD CONSTRAINT tonecos_quote_payment_voucher_type_valid CHECK (
    payment_voucher_type IS NULL OR payment_voucher_type IN ('deposit', 'final')
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS tonecos_quote_payment_voucher_rejection_reason_length,
  ADD CONSTRAINT tonecos_quote_payment_voucher_rejection_reason_length CHECK (
    payment_voucher_rejection_reason IS NULL OR char_length(payment_voucher_rejection_reason) <= 500
  ) NOT VALID;

ALTER TABLE public.quote_payments
  DROP CONSTRAINT IF EXISTS tonecos_quote_payments_voucher_path_safe,
  ADD CONSTRAINT tonecos_quote_payments_voucher_path_safe CHECK (
    payment_voucher_path IS NULL OR (
      length(payment_voucher_path) <= 512
      AND payment_voucher_path ~
        '^quotes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    )
  ) NOT VALID;

-- A customer can opt into the R$50 pre-order flow while creating the same quote
-- record used by the catalog, admin response and customer history.
CREATE OR REPLACE FUNCTION private_api.submit_catalog_preorder_request(
  p_models jsonb,
  p_notes text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_scale text DEFAULT 'a definir',
  p_finishing text DEFAULT 'a definir'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_quote_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  v_quote_id := private_api.submit_catalog_quote_request(
    p_models, p_notes, p_whatsapp, p_postal_code, p_scale, p_finishing
  );

  UPDATE public.quotes
     SET is_preorder = true,
         deposit_amount = 50,
         remaining_amount = NULL,
         payment_status = 'pending',
         updated_at = clock_timestamp()
   WHERE id = v_quote_id
     AND user_id = v_user_id
     AND COALESCE(is_preorder, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pre-order quote could not be initialized' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.submit_catalog_preorder_request(jsonb,text,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.submit_catalog_preorder_request(jsonb,text,text,text,text,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_catalog_preorder_request(
  p_models jsonb,
  p_notes text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_scale text DEFAULT 'a definir',
  p_finishing text DEFAULT 'a definir'
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.submit_catalog_preorder_request(
    p_models, p_notes, p_whatsapp, p_postal_code, p_scale, p_finishing
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_catalog_preorder_request(jsonb,text,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_catalog_preorder_request(jsonb,text,text,text,text,text)
  TO authenticated, service_role;

-- The admin's existing quote response also sets the pre-order balance.
CREATE OR REPLACE FUNCTION private_api.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_previous text;
  v_is_preorder boolean;
  v_deposit numeric(10,2);
  v_updated uuid;
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount <= 0
     OR p_amount > 99999999.99 OR p_amount <> round(p_amount, 2)
     OR length(COALESCE(v_message, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid quote response' USING ERRCODE = '22023';
  END IF;

  SELECT status, COALESCE(is_preorder, false), COALESCE(deposit_amount, 50)
    INTO v_previous, v_is_preorder, v_deposit
    FROM public.quotes
   WHERE id = p_quote_id
   FOR UPDATE;
  IF v_previous IS NULL OR v_previous NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'Quote unavailable for pricing' USING ERRCODE = 'P0002';
  END IF;
  IF v_is_preorder AND (v_deposit <> 50 OR p_amount <= v_deposit) THEN
    RAISE EXCEPTION 'Pre-order total must exceed the R$50 deposit' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
     SET total_amount = p_amount,
         remaining_amount = CASE WHEN v_is_preorder THEN p_amount - v_deposit ELSE remaining_amount END,
         admin_response = v_message,
         status = 'answered',
         updated_at = clock_timestamp()
   WHERE id = p_quote_id
   RETURNING id INTO v_updated;

  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status, amount, response_text
  ) VALUES (
    p_quote_id, (SELECT auth.uid()), 'answered', v_previous, 'answered', p_amount, v_message
  );
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.answer_catalog_quote_request(p_quote_id, p_amount, p_message);
$function$;

REVOKE ALL ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text) TO authenticated, service_role;

-- Keep the existing admin directory but expose the pre-order terms it needs to
-- price and manage the same quote without querying another order system.
CREATE OR REPLACE FUNCTION private_api.tonart_admin_quotes_directory(
  p_quote_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
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
  v_total integer;
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF (p_status IS NOT NULL AND p_status NOT IN ('pending','reviewing','answered','archived'))
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000 THEN
    RAISE EXCEPTION 'Invalid quote directory query' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_total
    FROM public.quotes q
   WHERE q.catalog_requested_at IS NOT NULL
     AND (p_quote_id IS NULL OR q.id = p_quote_id)
     AND (p_status IS NULL OR q.status = p_status);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'userId', x.user_id,
      'customerName', x.full_name,
      'customerEmail', x.email,
      'status', x.status,
      'createdAt', x.created_at,
      'notes', x.notes,
      'quotedAmount', CASE WHEN x.status IN ('answered','archived') AND x.total_amount > 0 THEN x.total_amount ELSE NULL END,
      'responseMessage', x.admin_response,
      'items', x.requested_catalog_models,
      'whatsapp', x.customer_whatsapp,
      'postalCode', x.postal_code,
      'scale', x.desired_scale,
      'finishing', x.finishing,
      'isPreorder', COALESCE(x.is_preorder, false),
      'depositAmount', x.deposit_amount,
      'remainingAmount', x.remaining_amount
    ) ORDER BY x.created_at DESC, x.id DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT q.id, q.user_id, p.full_name, p.email, q.status, q.created_at,
             q.notes, q.total_amount, q.admin_response, q.requested_catalog_models,
             q.customer_whatsapp, q.postal_code, q.desired_scale, q.finishing,
             q.is_preorder, q.deposit_amount, q.remaining_amount
        FROM public.quotes q
        JOIN public.profiles p ON p.id = q.user_id
       WHERE q.catalog_requested_at IS NOT NULL
         AND (p_quote_id IS NULL OR q.id = p_quote_id)
         AND (p_status IS NULL OR q.status = p_status)
       ORDER BY q.created_at DESC, q.id DESC
       LIMIT p_limit OFFSET p_offset
    ) x;

  RETURN jsonb_build_object('total', v_total, 'limit', p_limit, 'offset', p_offset, 'rows', v_rows);
END;
$function$;

REVOKE ALL ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer) TO authenticated, service_role;

-- Customers attach proof only after the admin has priced the pre-order and
-- provided current PIX/link instructions. Payment is never marked paid here.
CREATE OR REPLACE FUNCTION private_api.submit_catalog_preorder_voucher_for_current_user(
  p_quote_id uuid,
  p_payment_type text,
  p_payment_voucher_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_quote public.quotes%ROWTYPE;
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_expected_amount numeric(10,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_quote_id IS NULL OR v_payment_type IS NULL OR v_payment_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'Invalid pre-order payment' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote
    FROM public.quotes
   WHERE id = p_quote_id AND user_id = v_user_id AND COALESCE(is_preorder, false)
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pre-order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment_type = 'deposit' THEN
    IF v_quote.payment_status::text <> 'pending'
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= 50
       OR v_quote.status <> 'answered' THEN
      RAISE EXCEPTION 'Pre-order deposit is not available' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := 50;
  ELSE
    IF v_quote.payment_status::text <> 'deposit_paid'
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.remaining_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Final payment is not available' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := v_quote.remaining_amount;
  END IF;

  IF v_quote.payment_link_sent_at IS NULL
     OR (v_payment_type = 'final' AND (
         v_quote.final_payment_notified_at IS NULL
         OR v_quote.payment_link_sent_at < v_quote.final_payment_notified_at
       ))
     OR (v_quote.payment_link IS NULL AND v_quote.pix_key IS NULL) THEN
    RAISE EXCEPTION 'Payment instructions are not available' USING ERRCODE = '22023';
  END IF;

  IF p_payment_voucher_path IS NULL OR length(p_payment_voucher_path) > 512
     OR p_payment_voucher_path !~ (
       '^quotes/' || v_user_id::text || '/' || p_quote_id::text ||
       '/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
     ) THEN
    RAISE EXCEPTION 'Invalid payment voucher path' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
     SET payment_status = 'under_review',
         payment_voucher_path = p_payment_voucher_path,
         payment_voucher_type = v_payment_type,
         payment_voucher_rejection_reason = NULL,
         payment_voucher_reviewed_at = NULL,
         payment_voucher_reviewed_by = NULL,
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;

  RETURN jsonb_build_object(
    'quote_id', p_quote_id,
    'payment_type', v_payment_type,
    'amount', v_expected_amount,
    'payment_status', 'under_review'
  );
END;
$function$;

REVOKE ALL ON FUNCTION private_api.submit_catalog_preorder_voucher_for_current_user(uuid,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.submit_catalog_preorder_voucher_for_current_user(uuid,text,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_catalog_preorder_voucher_for_current_user(
  p_quote_id uuid,
  p_payment_type text,
  p_payment_voucher_path text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.submit_catalog_preorder_voucher_for_current_user(
    p_quote_id, p_payment_type, p_payment_voucher_path
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_catalog_preorder_voucher_for_current_user(uuid,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_catalog_preorder_voucher_for_current_user(uuid,text,text)
  TO authenticated, service_role;

-- The balance may be released only for a priced, paid deposit with a consistent
-- R$50 split; final PIX instructions are sent after this state transition.
CREATE OR REPLACE FUNCTION public.admin_release_preorder_final_payment(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT * INTO v_quote FROM public.quotes
   WHERE id = p_quote_id AND COALESCE(is_preorder, false) = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preorder quote not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_quote.status <> 'answered'
     OR v_quote.payment_status::text <> 'deposit_paid'
     OR COALESCE(v_quote.ready_for_final_payment, false)
     OR COALESCE(v_quote.deposit_amount, 0) <> 50
     OR COALESCE(v_quote.total_amount, 0) <= 50
     OR COALESCE(v_quote.remaining_amount, 0) <> v_quote.total_amount - v_quote.deposit_amount THEN
    RAISE EXCEPTION 'Preorder is not ready for final payment release' USING ERRCODE = '22023';
  END IF;
  UPDATE public.quotes
     SET ready_for_final_payment = true,
         final_payment_notified_at = now(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN p_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_release_preorder_final_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_release_preorder_final_payment(uuid) TO authenticated, service_role;

-- Approval remains an admin-only state transition. Only verified amounts can
-- move an order from deposit to production or from production to fully paid.
CREATE OR REPLACE FUNCTION public.admin_register_preorder_manual_payment(
  p_quote_id uuid,
  p_payment_type text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_amount numeric(10,2) := round(COALESCE(p_amount, 0), 2);
  v_expected numeric(10,2);
  v_payment_id uuid;
  v_is_voucher_review boolean;
BEGIN
  PERFORM public.assert_admin_access();
  IF v_payment_type IS NULL OR v_payment_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'Invalid preorder payment type' USING ERRCODE = '22023';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount <> v_amount
     OR v_amount <= 0 OR v_amount > 999999.99 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes
   WHERE id = p_quote_id AND COALESCE(is_preorder, false) = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preorder quote not found' USING ERRCODE = 'P0002';
  END IF;

  v_is_voucher_review := v_quote.payment_status::text = 'under_review';
  IF v_payment_type = 'deposit' THEN
    IF COALESCE(v_quote.payment_status::text, '') NOT IN ('pending', 'under_review')
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount
       OR v_quote.status <> 'answered' THEN
      RAISE EXCEPTION 'Deposit can only be registered for pending preorders' USING ERRCODE = '22023';
    END IF;
    v_expected := v_quote.deposit_amount;
  ELSE
    IF COALESCE(v_quote.payment_status::text, '') NOT IN ('deposit_paid', 'under_review')
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount
       OR COALESCE(v_quote.remaining_amount, 0) <> v_quote.total_amount - v_quote.deposit_amount
       OR v_quote.status <> 'answered' THEN
      RAISE EXCEPTION 'Final payment can only be registered after release' USING ERRCODE = '22023';
    END IF;
    v_expected := v_quote.remaining_amount;
  END IF;

  IF v_is_voucher_review AND (
       v_quote.payment_voucher_path IS NULL
       OR v_quote.payment_voucher_type IS DISTINCT FROM v_payment_type
     ) THEN
    RAISE EXCEPTION 'Voucher does not match the pending payment' USING ERRCODE = '22023';
  END IF;
  IF v_amount <> v_expected THEN
    RAISE EXCEPTION 'Payment amount must match the configured pre-order amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quote_payments (
    quote_id, user_id, payment_type, amount, status, payment_method,
    paid_at, recorded_by, payment_voucher_path, updated_at
  ) VALUES (
    p_quote_id, v_quote.user_id, v_payment_type, v_expected, 'completed',
    CASE WHEN v_is_voucher_review THEN 'voucher' ELSE 'manual' END,
    now(), auth.uid(),
    CASE WHEN v_is_voucher_review THEN v_quote.payment_voucher_path ELSE NULL END, now()
  ) RETURNING id INTO v_payment_id;

  UPDATE public.quotes
     SET payment_status = CASE WHEN v_payment_type = 'deposit' THEN 'deposit_paid' ELSE 'fully_paid' END,
         ready_for_final_payment = CASE WHEN v_payment_type = 'final' THEN false ELSE ready_for_final_payment END,
         payment_voucher_rejection_reason = NULL,
         payment_voucher_reviewed_at = now(),
         payment_voucher_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN v_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_preorder_payment_voucher(
  p_quote_id uuid,
  p_rejection_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_reason text := NULLIF(btrim(COALESCE(p_rejection_reason, '')), '');
BEGIN
  PERFORM public.assert_admin_access();
  IF p_quote_id IS NULL OR v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'A rejection reason of up to 500 characters is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_quote FROM public.quotes
   WHERE id = p_quote_id AND COALESCE(is_preorder, false) = true FOR UPDATE;
  IF NOT FOUND OR v_quote.payment_status::text <> 'under_review'
     OR v_quote.payment_voucher_path IS NULL
     OR v_quote.payment_voucher_type IS NULL
     OR v_quote.payment_voucher_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'Preorder voucher is not awaiting review' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.quotes
     SET payment_status = CASE WHEN v_quote.payment_voucher_type = 'deposit' THEN 'pending' ELSE 'deposit_paid' END,
         payment_voucher_rejection_reason = v_reason,
         payment_voucher_reviewed_at = now(),
         payment_voucher_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN p_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_register_preorder_manual_payment(uuid,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_preorder_manual_payment(uuid,text,numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_reject_preorder_payment_voucher(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_preorder_payment_voucher(uuid,text) TO authenticated, service_role;

-- Add quotes/<owner>/<quote>/<file> to the existing private payment-voucher
-- bucket. The customer can upload only for their own eligible pre-order; reading
-- requires the path already be attached to that quote, or current admin access.
DROP POLICY IF EXISTS payment_vouchers_select_owner_or_admin ON storage.objects;
CREATE POLICY payment_vouchers_select_owner_or_admin
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR (
        split_part(name, '/', 1) = 'subscriptions'
        AND split_part(name, '/', 2) = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1 FROM public.quotes q
         WHERE q.user_id = auth.uid()
           AND q.payment_voucher_path = storage.objects.name
      )
    )
  );

DROP POLICY IF EXISTS payment_vouchers_insert_owner ON storage.objects;
CREATE POLICY payment_vouchers_insert_owner
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-vouchers'
    AND (
      (
        split_part(name, '/', 1) = 'subscriptions'
        AND split_part(name, '/', 2) = auth.uid()::text
        AND split_part(name, '/', 3) ~ '^[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
        AND split_part(name, '/', 4) = ''
      )
      OR (
        split_part(name, '/', 1) = 'quotes'
        AND split_part(name, '/', 2) = auth.uid()::text
        AND split_part(name, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND split_part(name, '/', 4) ~ '^[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
        AND split_part(name, '/', 5) = ''
        AND EXISTS (
          SELECT 1 FROM public.quotes q
           WHERE q.id::text = split_part(name, '/', 3)
             AND q.user_id = auth.uid()
             AND COALESCE(q.is_preorder, false)
             AND q.payment_status::text IN ('pending', 'deposit_paid')
             AND q.payment_link_sent_at IS NOT NULL
             AND (q.payment_voucher_path IS NULL OR q.payment_voucher_rejection_reason IS NOT NULL)
             AND (q.payment_status::text <> 'deposit_paid' OR COALESCE(q.ready_for_final_payment, false))
        )
      )
    )
  );

DROP POLICY IF EXISTS payment_vouchers_delete_owner_or_admin ON storage.objects;
CREATE POLICY payment_vouchers_delete_owner_or_admin
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR (
        split_part(name, '/', 1) = 'subscriptions'
        AND split_part(name, '/', 2) = auth.uid()::text
      )
      OR (
        split_part(name, '/', 1) = 'quotes'
        AND split_part(name, '/', 2) = auth.uid()::text
        AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.payment_voucher_path = storage.objects.name)
      )
    )
  );

COMMENT ON FUNCTION public.submit_catalog_preorder_request(jsonb,text,text,text,text,text) IS
  'Creates a catalog pre-order intent in the canonical quote flow with a fixed R$50 deposit; payment is requested only after admin pricing.';
COMMENT ON FUNCTION public.submit_catalog_preorder_voucher_for_current_user(uuid,text,text) IS
  'Attaches a private payment voucher to an eligible quote pre-order without marking the payment as paid.';
COMMENT ON FUNCTION public.admin_reject_preorder_payment_voucher(uuid,text) IS
  'Admin-only rejection that returns a pre-order to the correct unpaid stage and lets its owner resubmit evidence.';

NOTIFY pgrst, 'reload schema';
COMMIT;
