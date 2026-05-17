import { supabase } from "@/integrations/supabase/client";

export const adminCreditCharactersSupabase = supabase;

export async function fetchCatalogCharacters() {
  const { data, error } = await supabase
    .from("collection_characters")
    .select(`
      *,
      price_categories (
        id,
        name,
        display_name,
        price_coins,
        price_standalone
      )
    `)
    .eq("is_catalog", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchPriceCategories() {
  const { data, error } = await supabase
    .from("price_categories")
    .select("*")
    .order("display_order");

  if (error) throw error;
  return data || [];
}

export async function deleteCatalogCharacterById(id: string) {
  const { error } = await supabase.from("collection_characters").delete().eq("id", id);
  if (error) throw error;
}
