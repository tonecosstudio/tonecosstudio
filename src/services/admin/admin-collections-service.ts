import { supabase } from "@/integrations/supabase/client";
export const adminCollectionsSupabase = supabase;

type CreateCollectionInput = {
  name: string;
  slug: string;
  description: string;
  cover_image_url: string | null;
  rotation_type: string;
  tier_id: string | null;
  is_active: boolean;
};

type CreateCharacterInput = {
  collection_id: string;
  name: string;
  description: string;
  image_url: string | null;
  release_order: number;
  release_month: number | null;
  status: string;
};

export async function fetchCollectionsWithCharacterCount() {
  const { data: collections, error } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!collections) return [];

  const withCount = await Promise.all(
    collections.map(async (collection) => {
      const { count, error: countError } = await supabase
        .from("collection_characters")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", collection.id);

      if (countError) {
        return { ...collection, character_count: 0 };
      }

      return { ...collection, character_count: count || 0 };
    })
  );

  return withCount;
}

export async function fetchCharactersByCollection(collectionId: string) {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("*")
    .eq("collection_id", collectionId)
    .order("release_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCollection(input: CreateCollectionInput) {
  const { data, error } = await supabase.from("collections").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function insertCollectionCharacters(characters: CreateCharacterInput[]) {
  const { error } = await supabase.from("collection_characters").insert(characters);
  if (error) throw error;
}

export async function deleteCollectionById(collectionId: string) {
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);
  if (error) throw error;
}

export async function updateCollectionById(collectionId: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from("collections").update(payload).eq("id", collectionId);
  if (error) throw error;
}

export async function uploadModelImage(filePath: string, file: File) {
  const { error } = await supabase.storage.from("models").upload(filePath, file);
  if (error) throw error;
}

export function getModelPublicUrl(filePath: string) {
  const {
    data: { publicUrl },
  } = supabase.storage.from("models").getPublicUrl(filePath);

  return publicUrl;
}

export async function insertCollectionCharacter(payload: CreateCharacterInput) {
  const { error } = await supabase.from("collection_characters").insert(payload);
  if (error) throw error;
}

export async function updateCollectionCharacterById(
  characterId: string,
  payload: Record<string, unknown>
) {
  const { error } = await supabase.from("collection_characters").update(payload).eq("id", characterId);
  if (error) throw error;
}

export async function deleteCollectionCharacterById(characterId: string) {
  const { error } = await supabase.from("collection_characters").delete().eq("id", characterId);
  if (error) throw error;
}

export async function countActiveFixedCollections() {
  const { count, error } = await supabase
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("rotation_type", "fixed")
    .eq("is_active", true);

  if (error) throw error;
  return count || 0;
}

export async function countCharactersByCollection(collectionId: string) {
  const { count, error } = await supabase
    .from("collection_characters")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  if (error) throw error;
  return count || 0;
}

export async function fetchCollectionsFinancialSummary() {
  const { data, error } = await supabase
    .from("collections_financial_summary")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchCollectionFinancialAnalysis(collectionId: string) {
  const { data, error } = await supabase.rpc("get_collection_financial_analysis", {
    p_collection_id: collectionId,
  });

  if (error) throw error;
  return data?.[0] || null;
}
