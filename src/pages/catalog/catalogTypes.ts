export type ModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  image_bucket: string;
  image_path: string;
  created_at: string;
};

export const PAGE_SIZE = 24;
