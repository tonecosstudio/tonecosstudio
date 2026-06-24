import { supabase } from "@/integrations/supabase/client";

export interface AlternativeCharacter {
  id: string;
  name: string;
  image_url: string;
  stock_quantity: number;
}

export async function fetchCharacterStock(characterId: string): Promise<number> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("stock_quantity")
    .eq("id", characterId)
    .single();

  if (error) throw error;
  return data?.stock_quantity || 0;
}

export async function fetchAlternativeCharacters(input: {
  collectionId: string;
  characterId?: string | null;
}): Promise<AlternativeCharacter[]> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("id, name, image_url, stock_quantity")
    .eq("collection_id", input.collectionId)
    .neq("id", input.characterId || "")
    .gt("stock_quantity", 0)
    .order("name");

  if (error) throw error;
  return (data || []) as AlternativeCharacter[];
}
