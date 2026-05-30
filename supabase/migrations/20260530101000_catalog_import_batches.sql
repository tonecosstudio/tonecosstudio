-- Import batches make Drive catalog ingestion auditable at scale.
-- Each queue item can be traced to the manifest/run that created or refreshed it.

CREATE TABLE IF NOT EXISTS public.catalog_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'google_drive',
  import_slug text NOT NULL,
  source_folder_id text NULL,
  source_folder_name text NULL,
  source_drive_path text NULL,
  source_title text NULL,
  manifest_path text NULL,
  report_path text NULL,
  status text NOT NULL DEFAULT 'running',
  dry_run boolean NOT NULL DEFAULT false,
  validate_only boolean NOT NULL DEFAULT false,
  manifest_total integer NOT NULL DEFAULT 0,
  valid_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_message text NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_import_batches
  DROP CONSTRAINT IF EXISTS catalog_import_batches_source_type_check,
  ADD CONSTRAINT catalog_import_batches_source_type_check
    CHECK (source_type IN ('google_drive', 'manual_upload', 'bulk_import', 'other'));

ALTER TABLE public.catalog_import_batches
  DROP CONSTRAINT IF EXISTS catalog_import_batches_status_check,
  ADD CONSTRAINT catalog_import_batches_status_check
    CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed', 'dry_run', 'validate_only'));

ALTER TABLE public.catalog_import_batches
  DROP CONSTRAINT IF EXISTS catalog_import_batches_counts_check,
  ADD CONSTRAINT catalog_import_batches_counts_check
    CHECK (
      manifest_total >= 0
      AND valid_count >= 0
      AND rejected_count >= 0
      AND imported_count >= 0
      AND updated_count >= 0
      AND skipped_count >= 0
      AND failed_count >= 0
    );

ALTER TABLE public.catalog_import_items
  ADD COLUMN IF NOT EXISTS import_batch_id uuid NULL REFERENCES public.catalog_import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_started_at
  ON public.catalog_import_batches (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_status
  ON public.catalog_import_batches (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_source_folder
  ON public.catalog_import_batches (source_folder_id, started_at DESC)
  WHERE source_folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_import_batch
  ON public.catalog_import_items (import_batch_id, created_at DESC)
  WHERE import_batch_id IS NOT NULL;

WITH legacy_batch AS (
  INSERT INTO public.catalog_import_batches (
    import_slug,
    source_folder_id,
    source_folder_name,
    source_drive_path,
    source_title,
    manifest_path,
    report_path,
    status,
    manifest_total,
    valid_count,
    rejected_count,
    imported_count,
    updated_count,
    skipped_count,
    failed_count,
    started_at,
    finished_at
  )
  SELECT
    'legacy-catalog',
    NULL,
    'Importacao anterior',
    'catalogo/importacao-anterior',
    NULL,
    NULL,
    NULL,
    'completed',
    COUNT(*)::integer,
    COUNT(*)::integer,
    0,
    COUNT(*) FILTER (WHERE status = 'published')::integer,
    COUNT(*) FILTER (WHERE status <> 'published')::integer,
    0,
    0,
    MIN(created_at),
    MAX(updated_at)
  FROM public.catalog_import_items
  WHERE import_batch_id IS NULL
  HAVING COUNT(*) > 0
  RETURNING id
)
UPDATE public.catalog_import_items AS item
   SET import_batch_id = legacy_batch.id
  FROM legacy_batch
 WHERE item.import_batch_id IS NULL;

ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_import_batches_admin_all ON public.catalog_import_batches;
DROP POLICY IF EXISTS catalog_import_batches_service_role_all ON public.catalog_import_batches;

CREATE POLICY catalog_import_batches_admin_all
  ON public.catalog_import_batches
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY catalog_import_batches_service_role_all
  ON public.catalog_import_batches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.catalog_import_batches FROM PUBLIC, anon;
GRANT ALL ON public.catalog_import_batches TO authenticated, service_role;

COMMENT ON TABLE public.catalog_import_batches IS
  'Auditable catalog import runs. Stores manifest origin, status and item counts for Drive/import pipeline operations.';

COMMENT ON COLUMN public.catalog_import_items.import_batch_id IS
  'Import batch that created or last refreshed this queue item.';

NOTIFY pgrst, 'reload schema';
