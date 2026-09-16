-- Index only foreign keys with current referenced rows in active catalog tables.
CREATE INDEX IF NOT EXISTS idx_catalog_import_items_collection_id
  ON public.catalog_import_items (collection_id);

CREATE INDEX IF NOT EXISTS idx_catalog_import_items_published_model_id
  ON public.catalog_import_items (published_model_id);

CREATE INDEX IF NOT EXISTS idx_models_duplicate_of_model_id
  ON public.models (duplicate_of_model_id);
