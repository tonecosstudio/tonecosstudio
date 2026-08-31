import { supabase } from "@/integrations/supabase/client";

export interface StandalonePurchaseCharacter {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
  release_month: number | null;
  status: "upcoming" | "revealed" | "released";
}

export interface StandalonePurchaseCollection {
  id: string;
  name: string;
  slug: string;
  collection_characters?: StandalonePurchaseCharacter[] | null;
}

export async function getStandalonePurchaseCollectionBySlug(
  slug?: string
): Promise<StandalonePurchaseCollection | null> {
  if (!slug) return null;

  const { data, error } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      slug,
      collection_characters (
        id,
        name,
        description,
        image_url,
        release_order,
        release_month,
        status
      )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  return data as StandalonePurchaseCollection | null;
}
