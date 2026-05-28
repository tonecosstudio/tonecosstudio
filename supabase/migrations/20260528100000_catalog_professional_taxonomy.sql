-- Professional catalog taxonomy and publication controls.
-- Models remain the published item table, but gain canonical character,
-- variant, source, and visibility metadata for scalable curation.

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS character_name text NULL,
  ADD COLUMN IF NOT EXISTS variant_name text NULL,
  ADD COLUMN IF NOT EXISTS variant_type text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS source_title text NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS catalog_visibility text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS collection_id uuid NULL REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_drive_file_id text NULL,
  ADD COLUMN IF NOT EXISTS source_drive_folder_id text NULL,
  ADD COLUMN IF NOT EXISTS source_drive_path text NULL,
  ADD COLUMN IF NOT EXISTS curation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS curation_notes text NULL;

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_variant_type_check,
  ADD CONSTRAINT models_variant_type_check
    CHECK (variant_type IN ('default', 'form', 'costume', 'pose', 'scale', 'edition', 'variant', 'other'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_source_type_check,
  ADD CONSTRAINT models_source_type_check
    CHECK (source_type IN ('anime', 'manga', 'movie', 'series', 'game', 'comic', 'tokusatsu', 'original', 'other'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_catalog_visibility_check,
  ADD CONSTRAINT models_catalog_visibility_check
    CHECK (catalog_visibility IN ('general', 'collection', 'both', 'hidden'));

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_curation_status_check,
  ADD CONSTRAINT models_curation_status_check
    CHECK (curation_status IN ('draft', 'review', 'approved', 'rejected'));

UPDATE public.models
   SET character_name = COALESCE(character_name, regexp_replace(name, '\s+\([^)]+\)$', '')),
       source_title = COALESCE(source_title, franchise),
       curation_status = COALESCE(curation_status, 'approved')
 WHERE character_name IS NULL
    OR source_title IS NULL
    OR curation_status IS NULL;

UPDATE public.models
   SET variant_name = COALESCE(variant_name, substring(name from '\(([^)]+)\)$')),
       variant_type = CASE
         WHEN name ~ '\([^)]+\)$' AND variant_type = 'default' THEN 'variant'
         ELSE variant_type
       END
 WHERE variant_name IS NULL;

UPDATE public.models
   SET source_type = 'series',
       catalog_visibility = 'both'
 WHERE franchise ILIKE 'Thundercats';

CREATE INDEX IF NOT EXISTS idx_models_character_name
  ON public.models (lower(character_name));

CREATE INDEX IF NOT EXISTS idx_models_source_title
  ON public.models (lower(source_title));

CREATE INDEX IF NOT EXISTS idx_models_source_type
  ON public.models (source_type);

CREATE INDEX IF NOT EXISTS idx_models_catalog_visibility
  ON public.models (catalog_visibility);

CREATE INDEX IF NOT EXISTS idx_models_collection_id
  ON public.models (collection_id);

CREATE INDEX IF NOT EXISTS idx_models_source_drive_file_id
  ON public.models (source_drive_file_id);

COMMENT ON COLUMN public.models.character_name IS
  'Canonical character/person name used for grouping searches, e.g. Goku.';
COMMENT ON COLUMN public.models.variant_name IS
  'Specific version/form/variation, e.g. Super Saiyan 3, armor, pose, edition.';
COMMENT ON COLUMN public.models.source_title IS
  'Canonical source/franchise title, e.g. Dragon Ball Z or Thundercats.';
COMMENT ON COLUMN public.models.catalog_visibility IS
  'Publication destination: general catalog, collection page, both, or hidden.';
