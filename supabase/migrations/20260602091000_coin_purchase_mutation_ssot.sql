-- Coin purchase mutation SSOT.

CREATE TABLE IF NOT EXISTS public.user_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL,
  acquisition_type text NOT NULL DEFAULT 'coin_purchase',
  price_paid integer,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_characters
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS character_id uuid,
  ADD COLUMN IF NOT EXISTS acquisition_type text DEFAULT 'coin_purchase',
  ADD COLUMN IF NOT EXISTS price_paid integer,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
DECLARE
  v_character_attnum smallint;
  v_constraint_name text;
BEGIN
  SELECT attnum
  INTO v_character_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.user_characters'::regclass
    AND attname = 'character_id'
    AND NOT attisdropped;

  FOR v_constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_characters'::regclass
      AND contype = 'f'
      AND v_character_attnum = ANY(conkey)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.user_characters DROP CONSTRAINT IF EXISTS %I',
      v_constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE public.user_characters
  ADD CONSTRAINT user_characters_character_id_fkey
    FOREIGN KEY (character_id)
    REFERENCES public.collection_characters(id)
    ON DELETE CASCADE
    NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS user_characters_user_id_character_id_key
  ON public.user_characters(user_id, character_id);

ALTER TABLE public.user_characters
  DROP CONSTRAINT IF EXISTS user_characters_acquisition_type_valid,
  DROP CONSTRAINT IF EXISTS user_characters_price_paid_non_negative,
  ADD CONSTRAINT user_characters_acquisition_type_valid
    CHECK (
      acquisition_type IS NOT NULL
      AND acquisition_type IN (
        'coin_purchase',
        'subscription',
        'gift',
        'admin_grant',
        'promotion'
      )
    ) NOT VALID,
  ADD CONSTRAINT user_characters_price_paid_non_negative
    CHECK (price_paid IS NULL OR price_paid >= 0) NOT VALID;

CREATE TABLE IF NOT EXISTS public.user_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  acquisition_type text NOT NULL DEFAULT 'coin_purchase',
  price_paid integer,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS acquisition_type text DEFAULT 'coin_purchase',
  ADD COLUMN IF NOT EXISTS price_paid integer,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS user_collections_user_id_collection_id_key
  ON public.user_collections(user_id, collection_id);

ALTER TABLE public.user_collections
  DROP CONSTRAINT IF EXISTS user_collections_acquisition_type_valid,
  DROP CONSTRAINT IF EXISTS user_collections_price_paid_non_negative,
  ADD CONSTRAINT user_collections_acquisition_type_valid
    CHECK (
      acquisition_type IS NOT NULL
      AND acquisition_type IN (
        'coin_purchase',
        'subscription',
        'gift',
        'admin_grant',
        'promotion'
      )
    ) NOT VALID,
  ADD CONSTRAINT user_collections_price_paid_non_negative
    CHECK (price_paid IS NULL OR price_paid >= 0) NOT VALID;

ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_characters_select_owner_admin" ON public.user_characters;
CREATE POLICY "user_characters_select_owner_admin"
  ON public.user_characters FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "user_collections_select_owner_admin" ON public.user_collections;
CREATE POLICY "user_collections_select_owner_admin"
  ON public.user_collections FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE OR REPLACE FUNCTION public.coin_debit_user_balance(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_reference_id uuid,
  p_reference_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  new_balance integer,
  transaction_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_description text := left(NULLIF(btrim(COALESCE(p_description, '')), ''), 500);
  v_reference_type text := left(NULLIF(btrim(COALESCE(p_reference_type, '')), ''), 80);
  v_balance integer;
  v_transaction_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (v_auth_user_id IS NULL OR v_auth_user_id <> p_user_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_COINS_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NULL THEN
    RAISE EXCEPTION 'COINS_DESCRIPTION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_reference_type IS NULL THEN
    RAISE EXCEPTION 'COINS_REFERENCE_TYPE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    p_user_id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance
  INTO v_balance
  FROM public.user_coins
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'insufficient balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.user_coins
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
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
    p_user_id,
    -p_amount,
    'spend',
    v_description,
    p_reference_id,
    v_reference_type,
    v_balance,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_balance, v_transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coin_debit_user_balance(uuid, integer, text, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coin_debit_user_balance(uuid, integer, text, uuid, text, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.purchase_character_with_coins(
  p_user_id uuid,
  p_character_id uuid
)
RETURNS TABLE(
  success boolean,
  message text,
  new_balance integer,
  transaction_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_collection_character_id uuid;
  v_collection_id uuid;
  v_price integer;
  v_balance integer;
  v_transaction_id uuid;
  v_inserted_character_id uuid;
BEGIN
  IF v_auth_user_id IS NULL OR v_auth_user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_character_id IS NULL THEN
    RAISE EXCEPTION 'character not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    p_user_id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1
  FROM public.user_coins
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT
    cc.id,
    cc.collection_id,
    ROUND(pc.price_coins)::integer
  INTO
    v_collection_character_id,
    v_collection_id,
    v_price
  FROM public.collection_characters cc
  JOIN public.collections c ON c.id = cc.collection_id
  JOIN public.price_categories pc ON pc.id = cc.price_category_id
  WHERE cc.id = p_character_id
    AND c.is_active = true
    AND c.status::text = 'active'
    AND COALESCE(pc.is_active, true) = true
    AND cc.is_catalog = true
    AND cc.status IN ('released', 'available')
  ORDER BY cc.created_at DESC
  LIMIT 1;

  IF v_collection_character_id IS NULL THEN
    RAISE EXCEPTION 'character not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_collections uc
    WHERE uc.user_id = p_user_id
      AND uc.collection_id = v_collection_id
  ) THEN
    RAISE EXCEPTION 'already owns character' USING ERRCODE = '23505';
  END IF;

  IF COALESCE(v_price, 0) <= 0 THEN
    RAISE EXCEPTION 'character price not configured' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_characters (
    user_id,
    character_id,
    acquisition_type,
    price_paid
  )
  VALUES (
    p_user_id,
    v_collection_character_id,
    'coin_purchase',
    v_price
  )
  ON CONFLICT (user_id, character_id) DO NOTHING
  RETURNING id INTO v_inserted_character_id;

  IF v_inserted_character_id IS NULL THEN
    RAISE EXCEPTION 'already owns character' USING ERRCODE = '23505';
  END IF;

  SELECT debit.new_balance, debit.transaction_id
  INTO v_balance, v_transaction_id
  FROM public.coin_debit_user_balance(
    p_user_id,
    v_price,
    'Compra de personagem com coins',
    v_collection_character_id,
    'character_purchase',
    jsonb_build_object('collection_id', v_collection_id)
  ) AS debit;

  RETURN QUERY SELECT
    true,
    'Personagem adquirido com sucesso!'::text,
    v_balance,
    v_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_collection_with_coins(
  p_user_id uuid,
  p_collection_id uuid
)
RETURNS TABLE(
  success boolean,
  message text,
  new_balance integer,
  transaction_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_price integer;
  v_character_count integer;
  v_balance integer;
  v_transaction_id uuid;
  v_inserted_collection_id uuid;
BEGIN
  IF v_auth_user_id IS NULL OR v_auth_user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'collection not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_coins (
    user_id,
    balance,
    total_earned,
    total_spent
  )
  VALUES (
    p_user_id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1
  FROM public.user_coins
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
    FROM public.collections c
    WHERE c.id = p_collection_id
      AND c.is_active = true
      AND c.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'collection not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COALESCE(SUM(ROUND(pc.price_coins)::integer), 0),
    COUNT(*)
  INTO
    v_price,
    v_character_count
  FROM public.collection_characters cc
  JOIN public.price_categories pc ON pc.id = cc.price_category_id
  WHERE cc.collection_id = p_collection_id
    AND COALESCE(pc.is_active, true) = true
    AND cc.is_catalog = true
    AND cc.status IN ('released', 'available')
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_characters uch
      WHERE uch.user_id = p_user_id
        AND uch.character_id = cc.id
    );

  IF COALESCE(v_character_count, 0) <= 0 THEN
    RAISE EXCEPTION 'collection has no purchasable characters' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_price, 0) <= 0 THEN
    RAISE EXCEPTION 'collection price not configured' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_collections (
    user_id,
    collection_id,
    acquisition_type,
    price_paid
  )
  VALUES (
    p_user_id,
    p_collection_id,
    'coin_purchase',
    v_price
  )
  ON CONFLICT (user_id, collection_id) DO NOTHING
  RETURNING id INTO v_inserted_collection_id;

  IF v_inserted_collection_id IS NULL THEN
    RAISE EXCEPTION 'already owns collection' USING ERRCODE = '23505';
  END IF;

  SELECT debit.new_balance, debit.transaction_id
  INTO v_balance, v_transaction_id
  FROM public.coin_debit_user_balance(
    p_user_id,
    v_price,
    'Compra de colecao com coins',
    p_collection_id,
    'collection_purchase',
    jsonb_build_object('character_count', v_character_count)
  ) AS debit;

  RETURN QUERY SELECT
    true,
    'Colecao adquirida com sucesso!'::text,
    v_balance,
    v_transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_character_with_coins(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_collection_with_coins(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_character_with_coins(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_collection_with_coins(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.coin_debit_user_balance(uuid, integer, text, uuid, text, jsonb) IS
  'Internal authoritative coin debit helper. Updates balance, total_spent, and coin ledger atomically.';
COMMENT ON FUNCTION public.purchase_character_with_coins(uuid, uuid) IS
  'Authenticated user-only atomic character purchase with server-side price lookup.';
COMMENT ON FUNCTION public.purchase_collection_with_coins(uuid, uuid) IS
  'Authenticated user-only atomic collection purchase priced as the sum of purchasable collection characters.';

NOTIFY pgrst, 'reload schema';
