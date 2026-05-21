export type CatalogModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  image_bucket: string | null;
  image_path: string | null;
  imageUrl: string | null;
  created_at: string;
};

export type CatalogModelDetailsRow = CatalogModelRow & {
  description: string | null;
};
