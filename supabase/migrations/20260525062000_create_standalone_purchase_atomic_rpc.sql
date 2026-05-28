-- Atomic standalone purchase creation.
-- Replaces Edge-side insert/delete rollback with one database transaction.

CREATE OR REPLACE FUNCTION public.create_standalone_purchase_atomic(
  p_user_id uuid,
  p_collection_id uuid,
  p_cycle_id uuid,
  p_character_id uuid,
  p_deposit_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle record;
  v_collection record;
  v_collection_character_id uuid;
  v_character_id uuid;
  v_total_amount numeric(10,2);
  v_deposit_amount numeric(10,2);
  v_balance_amount numeric(10,2);
  v_voucher_url text := NULLIF(btrim(COALESCE(p_deposit_voucher_url, '')), '');
  v_purchase public.standalone_purchases%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'COLLECTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'CYCLE_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_character_id IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_voucher_url IS NOT NULL
     AND (length(v_voucher_url) > 2048 OR v_voucher_url !~* '^https://[^[:space:]]{1,2040}$') THEN
    RAISE EXCEPTION 'INVALID_DEPOSIT_VOUCHER_URL' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_before_cutoff() THEN
    RAISE EXCEPTION 'CUTOFF_PASSED' USING ERRCODE = '22023';
  END IF;

  SELECT id, status
    INTO v_cycle
    FROM public.cycles
   WHERE id = p_cycle_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CYCLE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_cycle.status::text NOT IN ('active', 'open', 'sales') THEN
    RAISE EXCEPTION 'CYCLE_NOT_OPEN:%', v_cycle.status::text USING ERRCODE = '22023';
  END IF;

  SELECT id, is_active
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT COALESCE(v_collection.is_active, false) THEN
    RAISE EXCEPTION 'COLLECTION_INACTIVE' USING ERRCODE = '22023';
  END IF;

  SELECT cc.id, cc.character_id
    INTO v_collection_character_id, v_character_id
    FROM public.collection_characters cc
   WHERE cc.id = p_character_id
     AND cc.collection_id = p_collection_id
   LIMIT 1;

  IF v_collection_character_id IS NULL THEN
    SELECT cc.id, cc.character_id
      INTO v_collection_character_id, v_character_id
      FROM public.collection_characters cc
     WHERE cc.character_id = p_character_id
       AND cc.collection_id = p_collection_id
     LIMIT 1;
  END IF;

  IF v_collection_character_id IS NULL OR v_character_id IS NULL THEN
    RAISE EXCEPTION 'CHARACTER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT price_full, deposit_amount
    INTO v_total_amount, v_deposit_amount
    FROM public.get_collection_pricing(p_collection_id)
   LIMIT 1;

  IF v_total_amount IS NULL OR v_total_amount <= 0
     OR v_deposit_amount IS NULL OR v_deposit_amount <= 0 THEN
    RAISE EXCEPTION 'PRICING_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_balance_amount := v_total_amount - v_deposit_amount;
  IF v_balance_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_PRICING' USING ERRCODE = '22023';
  END IF;

  PERFORM public.reserve_capacity(p_cycle_id, 1);

  INSERT INTO public.standalone_purchases (
    user_id,
    collection_id,
    cycle_id,
    character_id,
    collection_character_id,
    amount,
    status,
    deposit_amount,
    balance_amount,
    total_amount,
    price_deposit,
    price_balance,
    price_full,
    deposit_paid_at,
    payment_voucher_deposit_url,
    deposit_voucher_url
  )
  VALUES (
    p_user_id,
    p_collection_id,
    p_cycle_id,
    v_character_id,
    v_collection_character_id,
    v_total_amount,
    'deposit_paid',
    v_deposit_amount,
    v_balance_amount,
    v_total_amount,
    v_deposit_amount,
    v_balance_amount,
    v_total_amount,
    now(),
    v_voucher_url,
    v_voucher_url
  )
  RETURNING * INTO v_purchase;

  PERFORM public.increment_monthly_sales(1);

  RETURN jsonb_build_object(
    'success', true,
    'purchase', to_jsonb(v_purchase)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_standalone_purchase_atomic(uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_standalone_purchase_atomic(uuid, uuid, uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.create_standalone_purchase_atomic(uuid, uuid, uuid, uuid, text) IS
  'Service-role only atomic standalone purchase creation with capacity reservation.';

NOTIFY pgrst, 'reload schema';
