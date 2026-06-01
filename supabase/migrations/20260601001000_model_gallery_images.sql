-- Adds ordered gallery support for public catalog models.
-- models.image_path remains the primary image used by cards and list views.

CREATE TABLE IF NOT EXISTS public.model_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  source_drive_file_id text NULL,
  storage_bucket text NULL,
  storage_path text NULL,
  thumbnail_url text NULL,
  image_url text NULL,
  alt_text text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  image_role text NOT NULL DEFAULT 'gallery',
  original_sha256 text NULL,
  optimized_sha256 text NULL,
  perceptual_hash text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT model_gallery_images_role_check
    CHECK (image_role IN ('primary_reference', 'gallery', 'angle', 'detail', 'variant_reference')),
  CONSTRAINT model_gallery_images_has_image_check
    CHECK (
      NULLIF(storage_path, '') IS NOT NULL OR
      NULLIF(image_url, '') IS NOT NULL OR
      NULLIF(thumbnail_url, '') IS NOT NULL
    ),
  CONSTRAINT model_gallery_images_sort_order_check
    CHECK (sort_order >= 0 AND sort_order <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_model_gallery_images_model_order
  ON public.model_gallery_images (model_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_model_gallery_images_source_drive_file
  ON public.model_gallery_images (source_drive_file_id)
  WHERE source_drive_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_model_gallery_images_optimized_sha
  ON public.model_gallery_images (optimized_sha256)
  WHERE optimized_sha256 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_gallery_images_model_source_file
  ON public.model_gallery_images (model_id, source_drive_file_id)
  WHERE source_drive_file_id IS NOT NULL;

ALTER TABLE public.model_gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS model_gallery_images_select_public ON public.model_gallery_images;
CREATE POLICY model_gallery_images_select_public
  ON public.model_gallery_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.models AS model
      WHERE model.id = model_gallery_images.model_id
        AND model.is_active = true
        AND model.catalog_visibility IN ('general', 'both')
        AND COALESCE(model.duplicate_status, 'unique') = 'unique'
    )
  );

DROP POLICY IF EXISTS model_gallery_images_select_admin ON public.model_gallery_images;
CREATE POLICY model_gallery_images_select_admin
  ON public.model_gallery_images
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS model_gallery_images_modify_admin ON public.model_gallery_images;
CREATE POLICY model_gallery_images_modify_admin
  ON public.model_gallery_images
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS model_gallery_images_service_role_all ON public.model_gallery_images;
CREATE POLICY model_gallery_images_service_role_all
  ON public.model_gallery_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.model_gallery_images FROM PUBLIC, anon;
GRANT SELECT ON public.model_gallery_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_gallery_images TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at_model_gallery_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_model_gallery_images ON public.model_gallery_images;
CREATE TRIGGER set_updated_at_model_gallery_images
  BEFORE UPDATE ON public.model_gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_model_gallery_images();

COMMENT ON TABLE public.model_gallery_images IS
  'Ordered gallery images for published catalog models. The models table keeps the primary/card image.';

COMMENT ON COLUMN public.model_gallery_images.image_role IS
  'How the gallery image should be presented: gallery, angle, detail, primary_reference, or variant_reference.';
