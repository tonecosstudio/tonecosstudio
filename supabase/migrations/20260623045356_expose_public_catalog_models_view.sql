-- Expose catalog models through an explicit public allowlist view instead of
-- granting anonymous users access to the internal models table.

CREATE OR REPLACE VIEW public.public_catalog_models
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  name,
  description,
  thumbnail_url,
  is_active,
  created_at,
  updated_at,
  franchise,
  image_bucket,
  image_path,
  category,
  subcategory,
  tags,
  price_mode,
  price_standalone_override,
  price_coins_override,
  character_name,
  variant_name,
  variant_type,
  source_title,
  source_type,
  catalog_visibility,
  canonical_identity_key,
  duplicate_status,
  duplicate_of_model_id
FROM public.models
WHERE is_active = true
  AND catalog_visibility IN ('general', 'both')
  AND image_path LIKE 'catalog-webp-final/display/%'
  AND (
    duplicate_of_model_id IS NULL
    OR duplicate_status = 'unique'
  );

REVOKE ALL ON public.public_catalog_models FROM PUBLIC;
GRANT SELECT ON public.public_catalog_models TO anon, authenticated;

REVOKE SELECT ON public.models FROM anon;
REVOKE SELECT ON public.models FROM authenticated;

GRANT SELECT (
  id,
  name,
  description,
  thumbnail_url,
  is_active,
  created_at,
  updated_at,
  franchise,
  image_bucket,
  image_path,
  category,
  subcategory,
  tags,
  price_mode,
  price_standalone_override,
  price_coins_override,
  character_name,
  variant_name,
  variant_type,
  source_title,
  source_type,
  catalog_visibility,
  canonical_identity_key,
  duplicate_status,
  duplicate_of_model_id
) ON public.models TO anon, authenticated;

DROP POLICY IF EXISTS models_select_active
  ON public.models;

DROP POLICY IF EXISTS public_catalog_models_select_public
  ON public.models;

DROP POLICY IF EXISTS models_select_authenticated_admin
  ON public.models;

CREATE POLICY models_select_authenticated_admin
  ON public.models
  FOR SELECT
  TO authenticated
  USING (current_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

CREATE POLICY models_select_public_catalog
  ON public.models
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND catalog_visibility IN ('general', 'both')
    AND image_path LIKE 'catalog-webp-final/display/%'
    AND (
      duplicate_of_model_id IS NULL
      OR duplicate_status = 'unique'
    )
  );
