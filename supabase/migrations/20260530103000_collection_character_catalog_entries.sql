-- Collection entries are presentation records, independent from catalog models.
-- They can point to a catalog model while keeping their own public name,
-- collection image, release month, order, and status.

ALTER TABLE public.collection_characters
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS release_order integer NULL,
  ADD COLUMN IF NOT EXISTS release_month integer NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'released',
  ADD COLUMN IF NOT EXISTS source_model_id uuid NULL REFERENCES public.models(id) ON DELETE SET NULL;

ALTER TABLE public.collection_characters
  DROP CONSTRAINT IF EXISTS collection_characters_release_order_valid,
  ADD CONSTRAINT collection_characters_release_order_valid
    CHECK (release_order IS NULL OR (release_order >= 1 AND release_order <= 10000));

ALTER TABLE public.collection_characters
  DROP CONSTRAINT IF EXISTS collection_characters_release_month_valid,
  ADD CONSTRAINT collection_characters_release_month_valid
    CHECK (release_month IS NULL OR (release_month >= 1 AND release_month <= 12));

ALTER TABLE public.collection_characters
  DROP CONSTRAINT IF EXISTS collection_characters_status_valid,
  ADD CONSTRAINT collection_characters_status_valid
    CHECK (status IN ('upcoming', 'revealed', 'released', 'available', 'archived'));

CREATE INDEX IF NOT EXISTS idx_collection_characters_source_model
  ON public.collection_characters (source_model_id)
  WHERE source_model_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_characters_release
  ON public.collection_characters (collection_id, status, release_month, release_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_characters_collection_model
  ON public.collection_characters (collection_id, source_model_id)
  WHERE source_model_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can view released collection entries" ON public.collection_characters;
CREATE POLICY "Anyone can view released collection entries"
  ON public.collection_characters FOR SELECT
  USING (
    status IN ('released', 'available')
    AND EXISTS (
      SELECT 1
        FROM public.collections c
       WHERE c.id = collection_characters.collection_id
         AND c.is_active = true
         AND c.status = 'active'
    )
  );

COMMENT ON COLUMN public.collection_characters.source_model_id IS
  'Optional published catalog model backing this collection entry. Presentation fields remain independent.';
COMMENT ON COLUMN public.collection_characters.name IS
  'Public display name for this collection entry; may intentionally differ from the catalog model name.';
COMMENT ON COLUMN public.collection_characters.image_url IS
  'Collection-specific public image URL. Admins may override it without changing the catalog model image.';
COMMENT ON COLUMN public.collection_characters.release_month IS
  'Optional launch month used by collection pages and subscriber flows.';

NOTIFY pgrst, 'reload schema';
