-- Catalog duplicate detection and canonical identity metadata.
-- The import queue remains the ingestion boundary; published models keep the
-- same dedupe keys so exact/visual duplicates can be traced after publication.

ALTER TABLE public.catalog_import_items
  ADD COLUMN IF NOT EXISTS original_sha256 text NULL,
  ADD COLUMN IF NOT EXISTS optimized_sha256 text NULL,
  ADD COLUMN IF NOT EXISTS perceptual_hash text NULL,
  ADD COLUMN IF NOT EXISTS perceptual_hash_algorithm text NOT NULL DEFAULT 'dhash64-v1',
  ADD COLUMN IF NOT EXISTS canonical_identity_key text NULL,
  ADD COLUMN IF NOT EXISTS duplicate_status text NOT NULL DEFAULT 'unique',
  ADD COLUMN IF NOT EXISTS duplicate_of_import_item_id uuid NULL REFERENCES public.catalog_import_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_of_model_id uuid NULL REFERENCES public.models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_distance integer NULL,
  ADD COLUMN IF NOT EXISTS image_width integer NULL,
  ADD COLUMN IF NOT EXISTS image_height integer NULL,
  ADD COLUMN IF NOT EXISTS image_format text NULL,
  ADD COLUMN IF NOT EXISTS name_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS visual_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS analysis_notes text NULL,
  ADD COLUMN IF NOT EXISTS detected_labels jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS original_sha256 text NULL,
  ADD COLUMN IF NOT EXISTS optimized_sha256 text NULL,
  ADD COLUMN IF NOT EXISTS perceptual_hash text NULL,
  ADD COLUMN IF NOT EXISTS perceptual_hash_algorithm text NOT NULL DEFAULT 'dhash64-v1',
  ADD COLUMN IF NOT EXISTS canonical_identity_key text NULL,
  ADD COLUMN IF NOT EXISTS duplicate_status text NOT NULL DEFAULT 'unique',
  ADD COLUMN IF NOT EXISTS duplicate_of_model_id uuid NULL REFERENCES public.models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_distance integer NULL,
  ADD COLUMN IF NOT EXISTS image_width integer NULL,
  ADD COLUMN IF NOT EXISTS image_height integer NULL,
  ADD COLUMN IF NOT EXISTS image_format text NULL,
  ADD COLUMN IF NOT EXISTS name_review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS visual_review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS analysis_notes text NULL,
  ADD COLUMN IF NOT EXISTS detected_labels jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.catalog_import_items
   SET original_sha256 = COALESCE(original_sha256, image_hash)
 WHERE image_hash IS NOT NULL
   AND original_sha256 IS NULL;

UPDATE public.models
   SET canonical_identity_key = COALESCE(
         canonical_identity_key,
         lower(regexp_replace(
           COALESCE(source_title, franchise, '') || '|' ||
           COALESCE(character_name, regexp_replace(name, '\s+\([^)]+\)$', ''), name, '') || '|' ||
           COALESCE(variant_name, substring(name from '\(([^)]+)\)$'), ''),
           '[^a-zA-Z0-9]+',
           '-',
           'g'
         ))
       )
 WHERE canonical_identity_key IS NULL;

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_duplicate_status_check,
  ADD CONSTRAINT catalog_import_items_duplicate_status_check
    CHECK (duplicate_status IN ('unique', 'exact_duplicate', 'visual_duplicate', 'identity_duplicate', 'source_duplicate', 'needs_review'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_duplicate_status_check,
  ADD CONSTRAINT models_duplicate_status_check
    CHECK (duplicate_status IN ('unique', 'exact_duplicate', 'visual_duplicate', 'identity_duplicate', 'source_duplicate', 'needs_review'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_duplicate_distance_check,
  ADD CONSTRAINT catalog_import_items_duplicate_distance_check
    CHECK (duplicate_distance IS NULL OR duplicate_distance >= 0);

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_duplicate_distance_check,
  ADD CONSTRAINT models_duplicate_distance_check
    CHECK (duplicate_distance IS NULL OR duplicate_distance >= 0);

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_name_review_status_check,
  ADD CONSTRAINT catalog_import_items_name_review_status_check
    CHECK (name_review_status IN ('pending', 'approved', 'needs_review', 'rejected'));

ALTER TABLE public.catalog_import_items
  DROP CONSTRAINT IF EXISTS catalog_import_items_visual_review_status_check,
  ADD CONSTRAINT catalog_import_items_visual_review_status_check
    CHECK (visual_review_status IN ('pending', 'approved', 'needs_review', 'rejected'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_name_review_status_check,
  ADD CONSTRAINT models_name_review_status_check
    CHECK (name_review_status IN ('pending', 'approved', 'needs_review', 'rejected'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_visual_review_status_check,
  ADD CONSTRAINT models_visual_review_status_check
    CHECK (visual_review_status IN ('pending', 'approved', 'needs_review', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_original_sha256
  ON public.catalog_import_items (original_sha256)
  WHERE original_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_optimized_sha256
  ON public.catalog_import_items (optimized_sha256)
  WHERE optimized_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_perceptual_hash
  ON public.catalog_import_items (perceptual_hash)
  WHERE perceptual_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_identity_key
  ON public.catalog_import_items (canonical_identity_key)
  WHERE canonical_identity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_duplicate_status
  ON public.catalog_import_items (duplicate_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_models_original_sha256
  ON public.models (original_sha256)
  WHERE original_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_optimized_sha256
  ON public.models (optimized_sha256)
  WHERE optimized_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_perceptual_hash
  ON public.models (perceptual_hash)
  WHERE perceptual_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_identity_key
  ON public.models (canonical_identity_key)
  WHERE canonical_identity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_duplicate_status
  ON public.models (duplicate_status, created_at DESC);

COMMENT ON COLUMN public.catalog_import_items.original_sha256 IS
  'SHA-256 of the original source bytes when available. Used for exact duplicate detection.';
COMMENT ON COLUMN public.catalog_import_items.optimized_sha256 IS
  'SHA-256 of the optimized storage object. Used when original source bytes are unavailable.';
COMMENT ON COLUMN public.catalog_import_items.perceptual_hash IS
  '64-bit visual hash for near-duplicate detection. Current algorithm is dhash64-v1.';
COMMENT ON COLUMN public.catalog_import_items.canonical_identity_key IS
  'Normalized source + character + variant key used to group versions professionally.';
COMMENT ON COLUMN public.catalog_import_items.duplicate_status IS
  'Duplicate classification assigned by the import/audit pipeline.';

COMMENT ON COLUMN public.models.canonical_identity_key IS
  'Normalized source + character + variant key copied from curation for search and grouping.';
COMMENT ON COLUMN public.models.duplicate_status IS
  'Duplicate classification for published catalog models.';

NOTIFY pgrst, 'reload schema';
