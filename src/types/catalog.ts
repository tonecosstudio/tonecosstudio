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
  tags: string[] | null;
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
};
