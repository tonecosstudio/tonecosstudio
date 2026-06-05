-- Coin balance initialization boundary.
-- Positive credits must use admin_add_coins_to_user so every earned coin has
-- the same authoritative ledger path and reference semantics.

CREATE OR REPLACE FUNCTION public.initialize_current_user_coin_balance(
  p_initial_amount integer DEFAULT 0,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.coin_require_user();
  v_amount integer := COALESCE(p_initial_amount, 0);
  v_balance integer;
BEGIN
  IF v_amount <> 0 THEN
    RAISE EXCEPTION 'INITIAL_COIN_BALANCE_MUST_BE_ZERO' USING ERRCODE = '22023';
  END IF;

  PERFORM public.coin_validate_text(p_description, 'description', 500, false);

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
  ON CONFLICT (user_id) DO NOTHING
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    SELECT balance
      INTO v_balance
      FROM public.user_coins
     WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_balance,
    'transaction_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_current_user_coin_balance(integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_current_user_coin_balance(integer, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.initialize_current_user_coin_balance(integer, text) IS
  'Authenticated user-only zero-balance bootstrap. Positive credits must use admin_add_coins_to_user.';

NOTIFY pgrst, 'reload schema';
