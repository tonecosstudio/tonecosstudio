BEGIN;

-- Complete ordinary quote checkout on the existing quote/payment authority.
-- One TONART Coin covers R$ 1,00 of an answered quote; coins remain virtual
-- credits and can only be spent by their authenticated owner.
ALTER TABLE public.payment_links
  DROP CONSTRAINT IF EXISTS payment_links_payment_type_check,
  ADD CONSTRAINT payment_links_payment_type_check
    CHECK (payment_type IN ('deposit', 'final', 'full'));

ALTER TABLE public.quote_payments
  DROP CONSTRAINT IF EXISTS quote_payments_payment_type_check,
  DROP CONSTRAINT IF EXISTS tonecos_quote_payments_type_valid,
  ADD CONSTRAINT tonecos_quote_payments_type_valid
    CHECK (payment_type IN ('deposit', 'final', 'full', 'coins')) NOT VALID;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS tonecos_quote_payment_voucher_type_valid,
  ADD CONSTRAINT tonecos_quote_payment_voucher_type_valid
    CHECK (payment_voucher_type IS NULL OR payment_voucher_type IN ('deposit', 'final', 'full')) NOT VALID;

CREATE OR REPLACE FUNCTION private_api.admin_send_payment_link(
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
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_link text := NULLIF(btrim(COALESCE(p_payment_link, '')), '');
  v_pix_key text := NULLIF(btrim(COALESCE(p_pix_key, '')), '');
  v_instructions text := NULLIF(btrim(COALESCE(p_instructions, '')), '');
  v_expected_amount numeric(10,2);
  v_paid_amount numeric(10,2);
  v_link_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL
     OR p_payment_type IS NULL OR p_payment_type NOT IN ('deposit', 'final', 'full')
     OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 999999.99
     OR p_amount <> round(p_amount, 2)
     OR (v_payment_link IS NOT NULL AND (
       length(v_payment_link) > 2000
       OR v_payment_link !~* '^https://[^[:space:]]+$'
       OR v_payment_link ~* '^https://[^/]*@'
     ))
     OR (v_pix_key IS NOT NULL AND length(v_pix_key) > 220)
     OR v_instructions IS NULL OR length(v_instructions) > 4000
     OR (v_payment_link IS NULL AND v_pix_key IS NULL) THEN
    RAISE EXCEPTION 'Invalid quote payment instructions' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote is unavailable for payment instructions' USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_type = 'full' THEN
    IF COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status, 'pending') <> 'pending'
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not payable' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid_amount
      FROM public.quote_payments
     WHERE quote_id = p_quote_id AND status = 'completed';
    v_expected_amount := round(v_quote.total_amount - v_paid_amount, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected_amount THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
    IF v_expected_amount <= 0 THEN
      RAISE EXCEPTION 'Quote is already paid' USING ERRCODE = '22023';
    END IF;
  ELSIF p_payment_type = 'deposit' THEN
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status <> 'pending'
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= 50 THEN
      RAISE EXCEPTION 'Pre-order deposit is not payable' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := v_quote.deposit_amount;
  ELSE
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status <> 'deposit_paid'
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.remaining_amount, 0) <= 0
       OR COALESCE(v_quote.total_amount, 0) <= 50
       OR v_quote.remaining_amount <> v_quote.total_amount - v_quote.deposit_amount THEN
      RAISE EXCEPTION 'Pre-order balance is not payable' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := v_quote.remaining_amount;
  END IF;

  IF p_amount <> v_expected_amount THEN
    RAISE EXCEPTION 'Payment amount does not match the quote balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND status = 'sent';

  INSERT INTO public.payment_links (
    quote_id, payment_type, amount, payment_link, pix_key,
    instructions, sent_by, status, updated_at
  ) VALUES (
    p_quote_id, p_payment_type, v_expected_amount, v_payment_link, v_pix_key,
    v_instructions, (SELECT auth.uid()), 'sent', clock_timestamp()
  ) RETURNING id INTO v_link_id;

  UPDATE public.quotes
     SET payment_status = CASE WHEN p_payment_type = 'full' THEN 'pending' ELSE payment_status END,
         remaining_amount = CASE WHEN p_payment_type = 'full' THEN v_expected_amount ELSE remaining_amount END,
         payment_link = v_payment_link,
         pix_key = v_pix_key,
         payment_instructions = v_instructions,
         payment_link_sent_at = clock_timestamp(),
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;

  RETURN v_link_id;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.admin_send_payment_link(uuid,numeric,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_send_payment_link(uuid,numeric,text,text,text,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_send_payment_link(
  p_quote_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_link text DEFAULT NULL,
  p_pix_key text DEFAULT NULL,
  p_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_send_payment_link(
    p_quote_id, p_amount, p_payment_type, p_payment_link, p_pix_key, p_instructions
  );
$function$;
REVOKE ALL ON FUNCTION public.admin_send_payment_link(uuid,numeric,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_payment_link(uuid,numeric,text,text,text,text)
  TO authenticated, service_role;

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
  v_paid_amount numeric(10,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_quote_id IS NULL OR v_payment_type IS NULL
     OR v_payment_type NOT IN ('deposit', 'final', 'full') THEN
    RAISE EXCEPTION 'Invalid quote payment' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes
   WHERE id = p_quote_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment_type = 'full' THEN
    IF COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status, 'pending') <> 'pending'
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not available' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid_amount
      FROM public.quote_payments
     WHERE quote_id = p_quote_id AND status = 'completed';
    v_expected_amount := round(v_quote.total_amount - v_paid_amount, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected_amount THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
    IF v_expected_amount <= 0 THEN
      RAISE EXCEPTION 'Quote is already paid' USING ERRCODE = '22023';
    END IF;
  ELSIF v_payment_type = 'deposit' THEN
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status::text <> 'pending'
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= 50 THEN
      RAISE EXCEPTION 'Pre-order deposit is not available' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := 50;
  ELSE
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status::text <> 'deposit_paid'
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

CREATE OR REPLACE FUNCTION private_api.apply_tonecos_coins_to_quote(
  p_quote_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_quote public.quotes%ROWTYPE;
  v_existing public.tonecos_coin_entries%ROWTYPE;
  v_balance bigint;
  v_paid numeric(10,2);
  v_due numeric(10,2);
  v_remaining numeric(10,2);
  v_reason text;
  v_payment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount < 1 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid coin redemption' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 773042));
  SELECT * INTO v_quote FROM public.quotes
   WHERE id = p_quote_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' OR COALESCE(v_quote.is_preorder, false)
     OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Quote is unavailable for coin payment' USING ERRCODE = '22023';
  END IF;

  v_reason := 'Coins usados no orçamento #' || left(p_quote_id::text, 8);
  SELECT * INTO v_existing FROM public.tonecos_coin_entries
   WHERE user_id = v_user_id AND reference_key = p_quote_id;
  IF FOUND THEN
    IF v_existing.entry_type <> 'purchase_spend'
       OR v_existing.delta <> -p_amount OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION 'Coin redemption reference conflicts with a different request'
        USING ERRCODE = '23505';
    END IF;
    SELECT id INTO v_payment_id FROM public.quote_payments
     WHERE quote_id = p_quote_id AND payment_type = 'coins'
       AND payment_method = 'tonecos_coins' AND amount = p_amount;
    IF v_payment_id IS NULL THEN
      RAISE EXCEPTION 'Coin payment record is inconsistent' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(sum(delta), 0)::bigint INTO v_balance
      FROM public.tonecos_coin_entries WHERE user_id = v_user_id;
    SELECT round(v_quote.total_amount - COALESCE(sum(amount), 0), 2)::numeric(10,2)
      INTO v_remaining FROM public.quote_payments
     WHERE quote_id = p_quote_id AND status = 'completed';
    RETURN jsonb_build_object(
      'quote_id', p_quote_id, 'spent', p_amount, 'balance', v_balance,
      'remaining_amount', GREATEST(COALESCE(v_remaining, v_quote.total_amount - p_amount), 0),
      'idempotent', true
    );
  END IF;

  IF COALESCE(v_quote.payment_status, 'pending') <> 'pending'
     OR v_quote.payment_voucher_path IS NOT NULL THEN
    RAISE EXCEPTION 'Quote is unavailable for coin payment' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid
    FROM public.quote_payments WHERE quote_id = p_quote_id AND status = 'completed';
  v_due := round(v_quote.total_amount - v_paid, 2);
  IF v_due <= 0 OR p_amount::numeric > floor(v_due) THEN
    RAISE EXCEPTION 'Coin amount exceeds the remaining quote balance' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(sum(delta), 0)::bigint INTO v_balance
    FROM public.tonecos_coin_entries WHERE user_id = v_user_id;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tonecos_coin_entries (
    user_id, entry_type, delta, reference_key, reason, created_by
  ) VALUES (
    v_user_id, 'purchase_spend', -p_amount, p_quote_id, v_reason, v_user_id
  );
  INSERT INTO public.quote_payments (
    quote_id, user_id, payment_type, amount, status, payment_method, paid_at, recorded_by
  ) VALUES (
    p_quote_id, v_user_id, 'coins', p_amount, 'completed', 'tonecos_coins',
    clock_timestamp(), v_user_id
  ) RETURNING id INTO v_payment_id;

  v_remaining := round(v_due - p_amount, 2);
  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND payment_type = 'full' AND status = 'sent';
  UPDATE public.quotes
     SET payment_status = CASE WHEN v_remaining = 0 THEN 'fully_paid' ELSE 'pending' END,
         remaining_amount = CASE WHEN v_remaining > 0 THEN v_remaining ELSE NULL END,
         payment_link = NULL,
         pix_key = NULL,
         payment_instructions = NULL,
         payment_link_sent_at = NULL,
         payment_voucher_path = NULL,
         payment_voucher_type = NULL,
         payment_voucher_rejection_reason = NULL,
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;

  RETURN jsonb_build_object(
    'quote_id', p_quote_id, 'spent', p_amount, 'balance', v_balance - p_amount,
    'remaining_amount', v_remaining, 'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION private_api.apply_tonecos_coins_to_quote(uuid,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.apply_tonecos_coins_to_quote(uuid,integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_tonecos_coins_to_quote(
  p_quote_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.apply_tonecos_coins_to_quote(p_quote_id, p_amount);
$function$;
REVOKE ALL ON FUNCTION public.apply_tonecos_coins_to_quote(uuid,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_tonecos_coins_to_quote(uuid,integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.admin_register_preorder_manual_payment(
  p_quote_id uuid,
  p_payment_type text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_amount numeric(10,2) := round(COALESCE(p_amount, 0), 2);
  v_expected numeric(10,2);
  v_paid numeric(10,2);
  v_payment_id uuid;
  v_is_voucher_review boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF v_payment_type IS NULL OR v_payment_type NOT IN ('deposit', 'final', 'full') THEN
    RAISE EXCEPTION 'Invalid quote payment type' USING ERRCODE = '22023';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount <> v_amount
     OR v_amount <= 0 OR v_amount > 999999.99 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote not found' USING ERRCODE = 'P0002';
  END IF;
  v_is_voucher_review := v_quote.payment_status::text = 'under_review';

  IF v_payment_type = 'full' THEN
    IF COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, 'pending') NOT IN ('pending', 'under_review')
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not available' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid
      FROM public.quote_payments WHERE quote_id = p_quote_id AND status = 'completed';
    v_expected := round(v_quote.total_amount - v_paid, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
  ELSIF v_payment_type = 'deposit' THEN
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, '') NOT IN ('pending', 'under_review')
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount THEN
      RAISE EXCEPTION 'Deposit can only be registered for pending preorders' USING ERRCODE = '22023';
    END IF;
    v_expected := v_quote.deposit_amount;
  ELSE
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, '') NOT IN ('deposit_paid', 'under_review')
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount
       OR COALESCE(v_quote.remaining_amount, 0) <> v_quote.total_amount - v_quote.deposit_amount THEN
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
    RAISE EXCEPTION 'Payment amount must match the configured quote amount' USING ERRCODE = '22023';
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

  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND payment_type = v_payment_type AND status = 'sent';

  UPDATE public.quotes
     SET payment_status = CASE WHEN v_payment_type = 'deposit' THEN 'deposit_paid' ELSE 'fully_paid' END,
         remaining_amount = CASE WHEN v_payment_type = 'full' THEN NULL ELSE remaining_amount END,
         ready_for_final_payment = CASE WHEN v_payment_type IN ('final', 'full') THEN false ELSE ready_for_final_payment END,
         payment_voucher_rejection_reason = NULL,
         payment_voucher_reviewed_at = now(),
         payment_voucher_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN v_payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.admin_register_preorder_manual_payment(uuid,text,numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_register_preorder_manual_payment(uuid,text,numeric)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_register_preorder_manual_payment(
  p_quote_id uuid,
  p_payment_type text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_register_preorder_manual_payment(p_quote_id, p_payment_type, p_amount);
$function$;
REVOKE ALL ON FUNCTION public.admin_register_preorder_manual_payment(uuid,text,numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_preorder_manual_payment(uuid,text,numeric)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.admin_reject_preorder_payment_voucher(
  p_quote_id uuid,
  p_rejection_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_reason text := NULLIF(btrim(COALESCE(p_rejection_reason, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL OR v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'A rejection reason of up to 500 characters is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.payment_status::text <> 'under_review'
     OR v_quote.payment_voucher_path IS NULL
     OR v_quote.payment_voucher_type NOT IN ('deposit', 'final', 'full')
     OR (v_quote.payment_voucher_type = 'full' AND COALESCE(v_quote.is_preorder, false))
     OR (v_quote.payment_voucher_type IN ('deposit', 'final') AND NOT COALESCE(v_quote.is_preorder, false)) THEN
    RAISE EXCEPTION 'Quote voucher is not awaiting review' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.quotes
     SET payment_status = CASE WHEN v_quote.payment_voucher_type = 'final' THEN 'deposit_paid' ELSE 'pending' END,
         payment_voucher_rejection_reason = v_reason,
         payment_voucher_reviewed_at = now(),
         payment_voucher_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN p_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION private_api.admin_reject_preorder_payment_voucher(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.admin_reject_preorder_payment_voucher(uuid,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_reject_preorder_payment_voucher(
  p_quote_id uuid,
  p_rejection_reason text
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.admin_reject_preorder_payment_voucher(p_quote_id, p_rejection_reason);
$function$;
REVOKE ALL ON FUNCTION public.admin_reject_preorder_payment_voucher(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_preorder_payment_voucher(uuid,text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.apply_tonecos_coins_to_quote(uuid,integer) IS
  'Spends owner Coins atomically against an answered ordinary quote at R$1 per Coin; this does not convert Coins to cash.';
COMMENT ON FUNCTION public.admin_send_payment_link(uuid,numeric,text,text,text,text) IS
  'Sends PIX instructions for the fixed R$50 preorder deposit, released preorder balance, or remaining balance of an answered ordinary quote.';
COMMENT ON TABLE public.tonecos_coin_entries IS
  'TONART Coins append-only ledger; virtual credits may be used at R$1 per Coin against an eligible answered quote and cannot be withdrawn as cash.';

COMMIT;
NOTIFY pgrst, 'reload schema';
