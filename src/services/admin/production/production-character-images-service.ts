import { supabase } from "@/integrations/supabase/client";

export type ProductionCharacterImageMap = Map<string, string>;

export async function fetchProductionCharacterImages(
  characterIds: string[]
): Promise<ProductionCharacterImageMap> {
  if (characterIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("collection_characters")
    .select("id, image_url")
    .in("id", characterIds);

  if (error) throw error;

  const images = new Map<string, string>();
  data?.forEach((character) => {
    if (character.image_url) {
      images.set(character.id, character.image_url);
    }
  });

  return images;
}
