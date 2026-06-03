-- Coin system SSOT schema alignment.
-- Canonical package fields are: amount, bonus, sort_order.

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'subscription_credit';

ALTER TABLE public.coin_packages
  ADD COLUMN IF NOT EXISTS amount integer,
  ADD COLUMN IF NOT EXISTS bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_best_value boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_packages'
      AND column_name = 'coins_amount'
  ) THEN
    UPDATE public.coin_packages
    SET amount = COALESCE(amount, coins_amount)
    WHERE amount IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_packages'
      AND column_name = 'bonus_coins'
  ) THEN
    UPDATE public.coin_packages
    SET bonus = COALESCE(bonus, bonus_coins, 0)
    WHERE bonus IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_packages'
      AND column_name = 'display_order'
  ) THEN
    UPDATE public.coin_packages
    SET sort_order = COALESCE(sort_order, display_order, 0)
    WHERE sort_order IS NULL;
  END IF;

  UPDATE public.coin_packages
  SET bonus = COALESCE(bonus, 0),
      sort_order = COALESCE(sort_order, 0)
  WHERE bonus IS NULL
     OR sort_order IS NULL;

  IF EXISTS (SELECT 1 FROM public.coin_packages WHERE amount IS NULL) THEN
    RAISE EXCEPTION 'coin_packages.amount could not be derived from canonical or legacy columns'
      USING ERRCODE = '23502';
  END IF;
END $$;

ALTER TABLE public.coin_packages
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN bonus SET NOT NULL,
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN is_popular SET NOT NULL,
  ALTER COLUMN is_best_value SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_packages_amount_positive'
      AND conrelid = 'public.coin_packages'::regclass
  ) THEN
    ALTER TABLE public.coin_packages
      ADD CONSTRAINT coin_packages_amount_positive CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_packages_bonus_non_negative'
      AND conrelid = 'public.coin_packages'::regclass
  ) THEN
    ALTER TABLE public.coin_packages
      ADD CONSTRAINT coin_packages_bonus_non_negative CHECK (bonus >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_packages_sort_order_non_negative'
      AND conrelid = 'public.coin_packages'::regclass
  ) THEN
    ALTER TABLE public.coin_packages
      ADD CONSTRAINT coin_packages_sort_order_non_negative CHECK (sort_order >= 0);
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_coin_packages_coins_amount;
DROP INDEX IF EXISTS public.idx_coin_packages_order;
CREATE INDEX IF NOT EXISTS idx_coin_packages_sort_order
  ON public.coin_packages(sort_order);
CREATE INDEX IF NOT EXISTS idx_coin_packages_amount
  ON public.coin_packages(amount);

ALTER TABLE public.coin_packages
  DROP COLUMN IF EXISTS coins_amount,
  DROP COLUMN IF EXISTS bonus_coins,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS display_name;

ALTER TABLE public.pricing_context_multipliers
  ADD COLUMN IF NOT EXISTS user_context text,
  ADD COLUMN IF NOT EXISTS chosen_collection_discount_percentage numeric(5,2) DEFAULT 0;

UPDATE public.pricing_context_multipliers
SET chosen_collection_discount_percentage = COALESCE(chosen_collection_discount_percentage, 0)
WHERE chosen_collection_discount_percentage IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pricing_context_multipliers'
      AND column_name = 'name'
  ) THEN
    UPDATE public.pricing_context_multipliers
    SET user_context = name
    WHERE user_context IS NULL
      AND name IN ('subscribed_chosen', 'subscribed_not_chosen', 'no_subscription');
  END IF;
END $$;

DELETE FROM public.pricing_context_multipliers
WHERE user_context IS NULL;

WITH ranked_contexts AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_context
      ORDER BY is_active DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_rank
  FROM public.pricing_context_multipliers
)
DELETE FROM public.pricing_context_multipliers AS multiplier
USING ranked_contexts
WHERE multiplier.ctid = ranked_contexts.ctid
  AND ranked_contexts.row_rank > 1;

DROP INDEX IF EXISTS public.idx_pricing_context_multipliers_type;
DROP INDEX IF EXISTS public.idx_pricing_context_multipliers_order;

ALTER TABLE public.pricing_context_multipliers
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS context_type,
  DROP COLUMN IF EXISTS display_order;

ALTER TABLE public.pricing_context_multipliers
  ALTER COLUMN user_context SET NOT NULL,
  ALTER COLUMN chosen_collection_discount_percentage SET NOT NULL;

ALTER TABLE public.pricing_context_multipliers
  DROP CONSTRAINT IF EXISTS pricing_context_multipliers_user_context_valid,
  DROP CONSTRAINT IF EXISTS pricing_context_multipliers_user_context_key,
  DROP CONSTRAINT IF EXISTS pricing_context_multipliers_discount_valid,
  ADD CONSTRAINT pricing_context_multipliers_user_context_valid
    CHECK (user_context IN ('subscribed_chosen', 'subscribed_not_chosen', 'no_subscription')),
  ADD CONSTRAINT pricing_context_multipliers_user_context_key UNIQUE (user_context),
  ADD CONSTRAINT pricing_context_multipliers_discount_valid
    CHECK (chosen_collection_discount_percentage BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_pricing_context_multipliers_user_context
  ON public.pricing_context_multipliers(user_context)
  WHERE user_context IS NOT NULL;

INSERT INTO public.pricing_context_multipliers (
  user_context,
  description,
  multiplier,
  chosen_collection_discount_percentage,
  is_active
)
VALUES
  (
    'subscribed_chosen',
    'Preco base para a colecao escolhida pelo assinante.',
    1.00,
    0,
    true
  ),
  (
    'subscribed_not_chosen',
    'Preco para assinante comprar itens fora da colecao escolhida.',
    1.20,
    0,
    true
  ),
  (
    'no_subscription',
    'Preco para usuarios sem assinatura ativa.',
    1.50,
    0,
    true
  )
ON CONFLICT (user_context) DO UPDATE
SET description = EXCLUDED.description,
    multiplier = EXCLUDED.multiplier,
    chosen_collection_discount_percentage = EXCLUDED.chosen_collection_discount_percentage,
    is_active = EXCLUDED.is_active,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
