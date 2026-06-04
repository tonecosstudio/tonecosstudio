-- Coin refund mutation SSOT.

CREATE OR REPLACE FUNCTION public.refund_coin_purchase_for_current_user(
  p_item_id text,
  p_item_type text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.coin_require_user();
  v_item_id text := public.coin_validate_text(p_item_id, 'item_id', 80, true);
  v_item_type text := lower(public.coin_validate_text(p_item_type, 'item_type', 20, true));
  v_reason text := public.coin_validate_text(p_reason, 'reason', 500, true);
  v_reference_uuid uuid;
  v_refund_amount integer;
  v_balance integer;
  v_transaction_id uuid;
  v_character_collection_id uuid;
BEGIN
  IF v_item_type NOT IN ('character', 'collection') THEN
    RAISE EXCEPTION 'Invalid item_type' USING ERRCODE = '22023';
  END IF;

  IF v_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_reference_uuid := v_item_id::uuid;
  ELSE
    RAISE EXCEPTION 'Invalid item_id' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    v_user_id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1
  FROM public.user_coins
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_item_type = 'character' THEN
    SELECT uc.price_paid, cc.collection_id
    INTO v_refund_amount, v_character_collection_id
    FROM public.user_characters uc
    JOIN public.collection_characters cc ON cc.id = uc.character_id
    WHERE uc.user_id = v_user_id
      AND uc.character_id = v_reference_uuid
      AND uc.acquisition_type = 'coin_purchase'
    FOR UPDATE OF uc;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase not found' USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.user_collections owned_collection
      WHERE owned_collection.user_id = v_user_id
        AND owned_collection.collection_id = v_character_collection_id
    ) THEN
      RAISE EXCEPTION 'Refund collection before refunding character' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.user_characters
    WHERE user_id = v_user_id
      AND character_id = v_reference_uuid
      AND acquisition_type = 'coin_purchase';
  ELSE
    SELECT price_paid
    INTO v_refund_amount
    FROM public.user_collections
    WHERE user_id = v_user_id
      AND collection_id = v_reference_uuid
      AND acquisition_type = 'coin_purchase'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.user_collections
    WHERE user_id = v_user_id
      AND collection_id = v_reference_uuid
      AND acquisition_type = 'coin_purchase';
  END IF;

  IF COALESCE(v_refund_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Invalid refund amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    v_user_id,
    v_refund_amount,
    0,
    0
  )
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_coins.balance + EXCLUDED.balance,
        total_spent = GREATEST(public.user_coins.total_spent - EXCLUDED.balance, 0),
        updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type,
    balance_after,
    metadata
  )
  VALUES (
    v_user_id,
    v_refund_amount,
    'refund',
    concat('Refund: ', v_reason),
    v_reference_uuid,
    v_item_type,
    v_balance,
    jsonb_build_object('item_type', v_item_type)
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', concat('Refund of ', v_refund_amount, ' coins completed'),
    'new_balance', v_balance,
    'item_id', v_item_id,
    'transaction_id', v_transaction_id::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text) IS
  'Authenticated user-only coin refund with authoritative balance, total_spent reversal, and collection ownership guard.';

NOTIFY pgrst, 'reload schema';
