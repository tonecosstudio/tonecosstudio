-- Coin credit reference SSOT.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.coin_transactions
    WHERE reference_type = 'subscription_payment'
      AND reference_id IS NOT NULL
    GROUP BY reference_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SUBSCRIPTION_COIN_CREDIT_REFERENCES_EXIST'
      USING ERRCODE = '23505';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_subscription_payment_reference
  ON public.coin_transactions(reference_id)
  WHERE reference_type = 'subscription_payment'
    AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_add_coins_to_user(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT 'admin_adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_description text := left(NULLIF(btrim(COALESCE(p_description, '')), ''), 500);
  v_reference_type text := COALESCE(
    left(NULLIF(btrim(COALESCE(p_reference_type, '')), ''), 80),
    'admin_adjustment'
  );
  v_reference_uuid uuid;
  v_balance integer;
  v_transaction_type transaction_type := 'adjustment';
BEGIN
  PERFORM public.assert_admin_access();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_COINS_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NULL THEN
    RAISE EXCEPTION 'COINS_DESCRIPTION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_reference_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_reference_uuid := p_reference_id::uuid;
  END IF;

  IF v_reference_type = 'subscription_payment' THEN
    IF v_reference_uuid IS NULL THEN
      RAISE EXCEPTION 'COINS_REFERENCE_ID_REQUIRED' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.coin_transactions existing_transaction
      WHERE existing_transaction.reference_type = 'subscription_payment'
        AND existing_transaction.reference_id = v_reference_uuid
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_COIN_CREDIT_REFERENCE' USING ERRCODE = '23505';
    END IF;

    v_transaction_type := 'subscription_credit';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    p_user_id,
    p_amount,
    p_amount,
    0
  )
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_coins.balance + EXCLUDED.balance,
        total_earned = public.user_coins.total_earned + EXCLUDED.total_earned,
        updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    v_transaction_type,
    v_description,
    v_reference_uuid,
    v_reference_type,
    v_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'amount', p_amount,
    'transaction_type', v_transaction_type::text,
    'new_balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_add_coins_to_user(uuid, integer, text, text, text) IS
  'Admin-only coin credit mutation with authoritative balance, ledger updates, and subscription-payment reference idempotency.';

NOTIFY pgrst, 'reload schema';
