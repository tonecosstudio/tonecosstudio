-- Extend the existing quote payment flow so customers can submit a PIX proof
-- for the unpaid balance of an answered, non-preorder quote. Coins already
-- recorded in quote_payments are included in that balance; this RPC only
-- queues review and never marks the cash portion as paid.
BEGIN;

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
  v_is_preorder boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_quote_id IS NULL OR v_payment_type IS NULL
     OR v_payment_type NOT IN ('deposit', 'final', 'full') THEN
    RAISE EXCEPTION 'Invalid quote payment' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote
    FROM public.quotes
   WHERE id = p_quote_id AND user_id = v_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote is unavailable for payment' USING ERRCODE = '22023';
  END IF;

  v_is_preorder := COALESCE(v_quote.is_preorder, false);
  IF v_is_preorder THEN
    IF v_payment_type = 'deposit' THEN
      IF v_quote.payment_status::text <> 'pending'
         OR COALESCE(v_quote.deposit_amount, 0) <> 50
         OR COALESCE(v_quote.total_amount, 0) <= 50 THEN
        RAISE EXCEPTION 'Pre-order deposit is not available' USING ERRCODE = '22023';
      END IF;
      v_expected_amount := 50;
    ELSIF v_payment_type = 'final' THEN
      IF v_quote.payment_status::text <> 'deposit_paid'
         OR NOT COALESCE(v_quote.ready_for_final_payment, false)
         OR COALESCE(v_quote.remaining_amount, 0) <= 0 THEN
        RAISE EXCEPTION 'Final pre-order payment is not available' USING ERRCODE = '22023';
      END IF;
      v_expected_amount := v_quote.remaining_amount;
    ELSE
      RAISE EXCEPTION 'Pre-order payment must be deposit or final' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF v_payment_type <> 'full'
       OR v_quote.payment_status::text <> 'pending'
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not available' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(sum(payment.amount), 0)::numeric(10,2)
      INTO v_paid_amount
      FROM public.quote_payments AS payment
     WHERE payment.quote_id = p_quote_id
       AND payment.status = 'completed';

    IF v_paid_amount < 0 OR v_paid_amount >= v_quote.total_amount THEN
      RAISE EXCEPTION 'Quote balance is not payable' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := round(v_quote.total_amount - v_paid_amount, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected_amount THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
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

COMMENT ON FUNCTION public.submit_catalog_preorder_voucher_for_current_user(uuid,text,text) IS
  'Queues a customer voucher for a fixed R$50 preorder installment or the remaining cash balance of an answered quote; it never confirms payment.';

NOTIFY pgrst, 'reload schema';
COMMIT;
