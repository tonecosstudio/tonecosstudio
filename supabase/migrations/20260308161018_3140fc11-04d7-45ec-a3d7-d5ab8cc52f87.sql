
-- Add release_order and release_month columns to collection_characters
ALTER TABLE public.collection_characters 
  ADD COLUMN IF NOT EXISTS release_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS release_month integer;

-- Add comment explaining the logic
COMMENT ON COLUMN public.collection_characters.release_month IS 'Month number (1-12) when this character becomes available in the collection. NULL means not scheduled yet.';
COMMENT ON COLUMN public.collection_characters.release_order IS 'Order of release within the collection (1, 2, 3...). Used for display sorting.';
COMMENT ON COLUMN public.collection_characters.is_catalog IS 'If true, character is always available in the general catalog. If false, follows the collection drip-release schedule (1 per month).';
