-- Adds lightweight pricing metadata to published catalog models.
-- The import/curation queue stays in images_queue; only reviewed items are inserted into models.

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS price_mode text NOT NULL DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS price_category_id uuid NULL REFERENCES public.price_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_standalone_override integer NULL,
  ADD COLUMN IF NOT EXISTS price_coins_override integer NULL;

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_price_mode_check,
  ADD CONSTRAINT models_price_mode_check
    CHECK (price_mode IN ('consultation', 'category', 'fixed'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_price_standalone_override_check,
  ADD CONSTRAINT models_price_standalone_override_check
    CHECK (price_standalone_override IS NULL OR price_standalone_override >= 0);

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_price_coins_override_check,
  ADD CONSTRAINT models_price_coins_override_check
    CHECK (price_coins_override IS NULL OR price_coins_override >= 0);

CREATE INDEX IF NOT EXISTS idx_models_price_mode ON public.models(price_mode);
CREATE INDEX IF NOT EXISTS idx_models_price_category_id ON public.models(price_category_id);

COMMENT ON COLUMN public.models.price_mode IS
  'Catalog pricing mode: consultation, category, or fixed.';
COMMENT ON COLUMN public.models.price_standalone_override IS
  'Fixed standalone price in cents when price_mode is fixed.';
COMMENT ON COLUMN public.models.price_coins_override IS
  'Fixed coin price when price_mode is fixed.';

NOTIFY pgrst, 'reload schema';
