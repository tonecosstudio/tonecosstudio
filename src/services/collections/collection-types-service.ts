import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { CollectionType } from "@/types/contextual-pricing";

export async function listCollectionTypes(includeInactive = false): Promise<CollectionType[]> {
  let query = supabase
    .from("collection_types")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar tipos de colecao: ${error.message}`);
  }

  return data as CollectionType[];
}

export async function getCollectionType(typeId: string): Promise<CollectionType> {
  const { data, error } = await supabase
    .from("collection_types")
    .select("*")
    .eq("id", typeId)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar tipo de colecao: ${error.message}`);
  }

  return data as CollectionType;
}

export async function checkCollectionTypeNameExists(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabase.from("collection_types").select("id").eq("name", name);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    log.error("Failed to check collection type name", { error, name, excludeId });
    throw new Error(`Erro ao verificar nome do tipo de colecao: ${error.message}`);
  }

  return data && data.length > 0;
}

export async function getNextCollectionTypeSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from("collection_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    log.error("Failed to read next collection type sort order", { error });
    throw new Error(`Erro ao buscar ordem do tipo de colecao: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return 0;
  }

  return (data[0].sort_order ?? 0) + 1;
}
