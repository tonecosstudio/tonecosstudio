-- Coin balance and refund mutation RPCs.
-- Removes client-side writes to coin balances, transactions, and owned-item tables.

ALTER TABLE public.user_coins
  ADD COLUMN IF NOT EXISTS total_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent integer NOT NULL DEFAULT 0;

ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS balance_after integer;

CREATE TABLE IF NOT EXISTS public.user_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  acquisition_type text NOT NULL DEFAULT 'coin_purchase',
  price_paid integer,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, character_id)
);

ALTER TABLE public.user_characters
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS acquisition_type text DEFAULT 'coin_purchase',
  ADD COLUMN IF NOT EXISTS price_paid integer,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  acquisition_type text NOT NULL DEFAULT 'coin_purchase',
  price_paid integer,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection_id)
);

ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS acquisition_type text DEFAULT 'coin_purchase',
  ADD COLUMN IF NOT EXISTS price_paid integer,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_characters_user_id
  ON public.user_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_characters_character_id
  ON public.user_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id
  ON public.user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_collection_id
  ON public.user_collections(collection_id);

ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_characters_select_owner_admin" ON public.user_characters;
CREATE POLICY "user_characters_select_owner_admin"
  ON public.user_characters FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_collections_select_owner_admin" ON public.user_collections;
CREATE POLICY "user_collections_select_owner_admin"
  ON public.user_collections FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.coin_require_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.coin_validate_text(
  p_value text,
  p_field_name text,
  p_max_length integer,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field_name USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length OR translate(v_value, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

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
  v_description text := public.coin_validate_text(p_description, 'description', 500, false);
  v_balance integer;
  v_transaction_id uuid;
  v_is_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF v_amount < 0 THEN
    RAISE EXCEPTION 'Initial amount must be non-negative' USING ERRCODE = '22023';
  END IF;

  IF v_amount > 0 AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can initialize a positive coin balance' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_coins WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a coin balance' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    v_user_id,
    v_amount,
    v_amount,
    0
  )
  RETURNING balance INTO v_balance;

  IF v_amount > 0 THEN
    INSERT INTO public.coin_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      reference_type,
      balance_after,
      metadata
    )
    VALUES (
      v_user_id,
      v_amount,
      'bonus',
      COALESCE(v_description, 'Initial coin balance'),
      'initial_balance',
      v_balance,
      '{}'::jsonb
    )
    RETURNING id INTO v_transaction_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

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
  v_refund_amount integer;
  v_balance integer;
  v_transaction_id uuid;
  v_reference_uuid uuid;
BEGIN
  IF v_item_type NOT IN ('character', 'collection') THEN
    RAISE EXCEPTION 'Invalid item_type' USING ERRCODE = '22023';
  END IF;

  IF v_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_reference_uuid := v_item_id::uuid;
  ELSE
    RAISE EXCEPTION 'Invalid item_id' USING ERRCODE = '22023';
  END IF;

  IF v_item_type = 'character' THEN
    SELECT price_paid
    INTO v_refund_amount
    FROM public.user_characters
    WHERE user_id = v_user_id
      AND character_id::text = v_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.user_characters
    WHERE user_id = v_user_id
      AND character_id::text = v_item_id;
  ELSE
    SELECT price_paid
    INTO v_refund_amount
    FROM public.user_collections
    WHERE user_id = v_user_id
      AND collection_id::text = v_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.user_collections
    WHERE user_id = v_user_id
      AND collection_id::text = v_item_id;
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
    v_refund_amount,
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

REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.user_coins,
  public.coin_transactions,
  public.user_characters,
  public.user_collections
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.user_coins,
  public.coin_transactions,
  public.user_characters,
  public.user_collections
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.coin_require_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.coin_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_current_user_coin_balance(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
