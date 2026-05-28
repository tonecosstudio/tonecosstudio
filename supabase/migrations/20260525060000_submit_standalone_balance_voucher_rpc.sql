-- Customer standalone balance voucher submission RPC.
-- Keeps payment approval as an admin-only transition while allowing the owner to
-- submit or replace a voucher before the balance deadline.

CREATE OR REPLACE FUNCTION public.submit_standalone_balance_voucher(
  p_purchase_id uuid,
  p_balance_voucher_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_updated public.standalone_purchases%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_voucher_url text := btrim(COALESCE(p_balance_voucher_url, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_voucher_url = ''
     OR length(v_voucher_url) > 2048
     OR v_voucher_url !~* '^https://[^[:space:]]{1,2040}$' THEN
    RAISE EXCEPTION 'INVALID_BALANCE_VOUCHER_URL' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_purchase.user_id <> v_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_purchase.status::text <> 'awaiting_balance' THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_purchase.status::text USING ERRCODE = '22023';
  END IF;

  IF v_purchase.balance_due_date IS NOT NULL AND now() > v_purchase.balance_due_date THEN
    RAISE EXCEPTION 'BALANCE_DEADLINE_PASSED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.standalone_purchases
     SET payment_voucher_balance_url = v_voucher_url,
         balance_voucher_url = v_voucher_url,
         updated_at = now()
   WHERE id = p_purchase_id
   RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'success', true,
    'purchase', to_jsonb(v_updated),
    'purchaseId', v_updated.id,
    'status', v_updated.status,
    'voucherSubmitted', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_standalone_balance_voucher(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_standalone_balance_voucher(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.submit_standalone_balance_voucher(uuid, text) IS
  'Owner-only standalone balance voucher submission; approval remains admin-only.';

NOTIFY pgrst, 'reload schema';
