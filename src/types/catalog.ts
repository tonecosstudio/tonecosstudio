export type CatalogModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  is_active: boolean;
  character_name?: string | null;
  variant_name?: string | null;
  variant_type?: string | null;
  source_title?: string | null;
  source_type?: string | null;
  catalog_visibility?: "general" | "collection" | "both" | "hidden" | null;
  canonical_identity_key?: string | null;
  duplicate_status?: string | null;
  duplicate_of_model_id?: string | null;
  tags: string[] | null;
  content_rating?: string | null;
  image_bucket: string | null;
  image_path: string | null;
  thumbnail_url: string | null;
  price_mode?: "consultation" | "category" | "fixed" | null;
  price_standalone_override?: number | null;
  price_coins_override?: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  created_at: string;
};

export type CatalogModelDetailsRow = CatalogModelRow & {
  description: string | null;
  galleryImages?: CatalogModelGalleryImage[];
};

export type CatalogModelGalleryImage = {
  id: string;
  model_id: string;
  source_drive_file_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  alt_text: string | null;
  metadata?: Record<string, unknown> | null;
  sort_order: number;
  image_role:
    | "primary_reference"
    | "gallery"
    | "angle"
    | "detail"
    | "variant_reference";
  imageUrl: string | null;
  thumbnailUrl: string | null;
};
