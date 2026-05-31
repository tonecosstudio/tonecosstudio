-- Align collection character detail metadata with the generated Supabase types.
-- These columns support the public collection detail page without relying on
-- legacy-query fallbacks when older environments are missing optional fields.

ALTER TABLE public.collection_characters
  ADD COLUMN IF NOT EXISTS display_order integer NULL,
  ADD COLUMN IF NOT EXISTS franchise text NULL,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

UPDATE public.collection_characters
   SET display_order = COALESCE(display_order, release_order)
 WHERE display_order IS NULL
   AND release_order IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_characters_display_order
  ON public.collection_characters(collection_id, display_order);

CREATE INDEX IF NOT EXISTS idx_collection_characters_franchise
  ON public.collection_characters(franchise);

COMMENT ON COLUMN public.collection_characters.display_order IS
  'Optional admin-controlled display order. release_order remains the collection launch sequence.';

COMMENT ON COLUMN public.collection_characters.franchise IS
  'Canonical franchise/source label for collection detail pages and filtering.';

COMMENT ON COLUMN public.collection_characters.stock_quantity IS
  'Available standalone stock quantity when the character can be purchased outside a subscription.';

NOTIFY pgrst, 'reload schema';
