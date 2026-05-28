-- Dedicated Drive/catalog import queue.
-- This separates raw incoming files from published catalog models.

CREATE TABLE IF NOT EXISTS public.catalog_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'google_drive',
  source_folder_id text NULL,
  source_folder_name text NULL,
  source_drive_path text NULL,
  source_file_id text NULL,
  source_file_url text NULL,
  file_name text NOT NULL,
  mime_type text NULL,
  original_size_bytes bigint NULL,
  storage_bucket text NULL,
  storage_path text NULL,
  thumbnail_url text NULL,
  image_hash text NULL,
  status text NOT NULL DEFAULT 'queued',
  proposed_name text NULL,
  character_name text NULL,
  variant_name text NULL,
  variant_type text NOT NULL DEFAULT 'default',
  source_title text NULL,
  media_type text NOT NULL DEFAULT 'other',
  category text NULL,
  subcategory text NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  catalog_visibility text NOT NULL DEFAULT 'hidden',
  collection_id uuid NULL REFERENCES public.collections(id) ON DELETE SET NULL,
  published_model_id uuid NULL REFERENCES public.models(id) ON DELETE SET NULL,
  confidence numeric NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  published_at timestamptz NULL
);

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_source_type_check,
  ADD CONSTRAINT catalog_import_items_source_type_check
    CHECK (source_type IN ('google_drive', 'manual_upload', 'bulk_import', 'other'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_status_check,
  ADD CONSTRAINT catalog_import_items_status_check
    CHECK (status IN ('queued', 'draft', 'review', 'approved', 'published', 'duplicate', 'rejected', 'hidden'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_variant_type_check,
  ADD CONSTRAINT catalog_import_items_variant_type_check
    CHECK (variant_type IN ('default', 'form', 'costume', 'pose', 'scale', 'edition', 'variant', 'other'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_media_type_check,
  ADD CONSTRAINT catalog_import_items_media_type_check
    CHECK (media_type IN ('anime', 'manga', 'movie', 'series', 'game', 'comic', 'tokusatsu', 'original', 'other'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_catalog_visibility_check,
  ADD CONSTRAINT catalog_import_items_catalog_visibility_check
    CHECK (catalog_visibility IN ('general', 'collection', 'both', 'hidden'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_confidence_check,
  ADD CONSTRAINT catalog_import_items_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_import_items_drive_file
  ON public.catalog_import_items (source_file_id)
  WHERE source_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_status
  ON public.catalog_import_items (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_character
  ON public.catalog_import_items (lower(character_name));

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_source_title
  ON public.catalog_import_items (lower(source_title));

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_visibility
  ON public.catalog_import_items (catalog_visibility);

ALTER TABLE public.catalog_import_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_import_items_admin_all ON public.catalog_import_items;
DROP POLICY IF EXISTS catalog_import_items_service_role_all ON public.catalog_import_items;

CREATE POLICY catalog_import_items_admin_all
  ON public.catalog_import_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY catalog_import_items_service_role_all
  ON public.catalog_import_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.catalog_import_items FROM PUBLIC, anon;
GRANT ALL ON public.catalog_import_items TO authenticated, service_role;

COMMENT ON TABLE public.catalog_import_items IS
  'Raw catalog import queue. Items are reviewed before becoming published models or collection characters.';
