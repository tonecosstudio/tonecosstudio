import { supabase } from "@/integrations/supabase/client";

export interface CharacterMultiplierData {
  character_id: string;
  character_name: string;
  price_multiplier: number | null;
  collection_id: string;
  collection_name: string;
}

type QueryError = { message: string } | null;

interface CharacterWithCollectionRow {
  id: string;
  name: string;
  price_multiplier: number | null;
  collection_id: string;
  collections: {
    name: string;
  } | null;
}

interface CharacterMultiplierSupabaseClient {
  from(table: "characters"): {
    select(columns: string): {
      eq(column: "id", value: string): {
        single(): PromiseLike<{ data: CharacterWithCollectionRow | null; error: QueryError }>;
      };
      not(column: "price_multiplier", operator: "is", value: null): {
        order(column: "price_multiplier", options: { ascending: boolean }): PromiseLike<{
          data: CharacterWithCollectionRow[] | null;
          error: QueryError;
        }>;
      };
    };
  };
}

const characterMultiplierSupabase = supabase as unknown as CharacterMultiplierSupabaseClient;

function toCharacterMultiplierData(row: CharacterWithCollectionRow): CharacterMultiplierData {
  return {
    character_id: row.id,
    character_name: row.name,
    price_multiplier: row.price_multiplier,
    collection_id: row.collection_id,
    collection_name: row.collections?.name ?? "",
  };
}

export async function getCharacterMultiplier(
  characterId: string | null | undefined,
): Promise<CharacterMultiplierData | null> {
  if (!characterId) return null;

  const { data, error } = await characterMultiplierSupabase
    .from("characters")
    .select(`
      id,
      name,
      price_multiplier,
      collection_id,
      collections!inner (
        name
      )
    `)
    .eq("id", characterId)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar multiplicador: ${error.message}`);
  }

  return data ? toCharacterMultiplierData(data) : null;
}

export async function listCharactersWithMultipliers(): Promise<CharacterMultiplierData[]> {
  const { data, error } = await characterMultiplierSupabase
    .from("characters")
    .select(`
      id,
      name,
      price_multiplier,
      collection_id,
      collections!inner (
        name
      )
    `)
    .not("price_multiplier", "is", null)
    .order("price_multiplier", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar personagens: ${error.message}`);
  }

  return (data || []).map(toCharacterMultiplierData);
}
