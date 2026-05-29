import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import {
  addPublicCollectionItemRpc,
  removePublicCollectionItemRpc,
  updateCollectorProfileRpc,
  updatePublicCollectionNotesRpc,
  updatePublicCollectionOrderRpc,
} from "@/services/collector-mutations-service";

type CollectorBadgeRarity = "common" | "rare" | "epic" | "legendary";

export type CollectorProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  collector_level: number;
  collector_xp: number;
  pieces_owned: number;
  total_spent: number;
};

export type CollectorBadge = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: CollectorBadgeRarity;
};

export type UserBadge = CollectorBadge & {
  earned_at: string;
};

export type PublicCollectionItem = {
  id: string;
  model_id: string;
  notes: string | null;
  display_order: number;
};

export type PublicCollectionModel = {
  id: string;
  name: string;
  image_path: string | null;
  image_bucket: string | null;
  franchise: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
  character_name?: string | null;
  variant_name?: string | null;
  source_title?: string | null;
  source_type?: string | null;
};

export type PublicCollectionEntry = PublicCollectionItem & {
  models: PublicCollectionModel | null;
};

export type AvailablePublicCollectionModel = {
  id: string;
  name: string;
  image_path: string | null;
  image_bucket: string | null;
  franchise: string | null;
  character_name?: string | null;
  source_title?: string | null;
};

type PublicCollectionQueryResult = {
  data: PublicCollectionEntry[] | null;
  error: { message?: string } | null;
};

interface PublicCollectionQuery extends PromiseLike<PublicCollectionQueryResult> {
  eq(column: string, value: string): PublicCollectionQuery;
  order(column: string, options: { ascending: boolean }): PublicCollectionQuery;
}

type AvailableModelsQueryResult = {
  data: AvailablePublicCollectionModel[] | null;
  error: { message?: string } | null;
};

interface AvailableModelsQuery extends PromiseLike<AvailableModelsQueryResult> {
  ilike(column: string, pattern: string): AvailableModelsQuery;
  limit(count: number): AvailableModelsQuery;
  or(filters: string): AvailableModelsQuery;
}

interface CollectorCatalogGateway {
  from(table: "public_collection"): {
    select(columns: string): PublicCollectionQuery;
  };
  from(table: "models"): {
    select(columns: string): AvailableModelsQuery;
  };
}

const collectorCatalogGateway = supabase as unknown as CollectorCatalogGateway;

type UserBadgeQueryRow = {
  earned_at: string;
  collector_badges: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    rarity: string;
  } | null;
};

function normalizeBadgeRarity(rarity: string): CollectorBadgeRarity {
  return ["common", "rare", "epic", "legendary"].includes(rarity)
    ? (rarity as CollectorBadgeRarity)
    : "common";
}

/**
 * Busca o perfil de colecionador do usuário atual
 */
export async function getMyCollectorProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, is_public, collector_level, collector_xp, pieces_owned, total_spent"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as CollectorProfile | null;
}

/**
 * Atualiza configurações públicas do perfil
 */
export async function updateCollectorProfile(
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    is_public?: boolean;
  }
) {
  await assertCurrentUserId(userId);
  const data = await updateCollectorProfileRpc(updates);
  return data as CollectorProfile;
}

/**
 * Busca todos os badges disponíveis
 */
export async function getAllBadges() {
  const { data, error } = await supabase
    .from("collector_badges")
    .select("*")
    .order("requirement_value", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    rarity: normalizeBadgeRarity(badge.rarity),
  }));
}

/**
 * Busca badges conquistados pelo usuário
 */
export async function getUserBadges(userId: string) {
  const { data, error } = await supabase
    .from("user_badges")
    .select(
      `
      earned_at,
      collector_badges (
        id,
        name,
        description,
        icon,
        rarity
      )
    `
    )
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as UserBadgeQueryRow[])
    .filter((item) => item.collector_badges)
    .map((item) => ({
      id: item.collector_badges!.id,
      name: item.collector_badges!.name,
      description: item.collector_badges!.description,
      icon: item.collector_badges!.icon,
      rarity: normalizeBadgeRarity(item.collector_badges!.rarity),
      earned_at: item.earned_at,
    }));
}

/**
 * Busca a coleção pública do usuário
 */
export async function getPublicCollection(userId: string) {
  const { data, error } = await collectorCatalogGateway
    .from("public_collection")
    .select(
      `
      id,
      model_id,
      notes,
      display_order,
      models (
        id,
        name,
        image_path,
        image_bucket,
        franchise,
        category,
        subcategory,
        tags,
        character_name,
        variant_name,
        source_title,
        source_type
      )
    `
    )
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("added_at", { ascending: false });

  if (error) throw error;
  return (data || []) as PublicCollectionEntry[];
}

export async function searchAvailablePublicCollectionModels(
  searchQuery: string
): Promise<AvailablePublicCollectionModel[]> {
  const normalizedQuery = searchQuery.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalizedQuery) return [];
  const pattern = `%${normalizedQuery}%`;

  const { data, error } = await collectorCatalogGateway
    .from("models")
    .select("id, name, image_path, image_bucket, franchise, character_name, source_title")
    .or(`name.ilike.${pattern},character_name.ilike.${pattern},source_title.ilike.${pattern},franchise.ilike.${pattern}`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export function getPublicModelImageUrl(model: PublicCollectionModel): string | null {
  if (!model.image_bucket || !model.image_path) {
    return null;
  }

  return supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl;
}

/**
 * Adiciona um modelo à coleção pública
 */
export async function addToPublicCollection(userId: string, modelId: string, notes?: string) {
  await assertCurrentUserId(userId);
  const data = await addPublicCollectionItemRpc({ modelId, notes });
  return data;
}

/**
 * Remove um modelo da coleção pública
 */
export async function removeFromPublicCollection(collectionId: string) {
  await removePublicCollectionItemRpc(collectionId);
}

/**
 * Atualiza notas de um item da coleção
 */
export async function updateCollectionNotes(collectionId: string, notes: string) {
  return updatePublicCollectionNotesRpc(collectionId, notes);
}

/**
 * Atualiza a ordem de exibição dos itens
 */
export async function updateCollectionOrder(items: Array<{ id: string; display_order: number }>) {
  await updatePublicCollectionOrderRpc(items);
}

/**
 * Verifica se um username está disponível
 */
export async function checkUsernameAvailability(username: string, currentUserId?: string) {
  const query = supabase.from("profiles").select("id").eq("username", username);

  if (currentUserId) {
    query.neq("id", currentUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data === null; // Disponível se não encontrou ninguém
}

/**
 * Calcula XP necessário para o próximo nível
 */
export function calculateXPForNextLevel(level: number): number {
  if (level < 2) return 100;
  if (level < 3) return 200;
  if (level < 4) return 300;
  if (level < 5) return 400;
  return 500;
}

/**
 * Calcula progresso percentual para o próximo nível
 */
export function calculateLevelProgress(xp: number, level: number): number {
  const xpForNext = calculateXPForNextLevel(level);
  const currentLevelXP = xp % xpForNext;
  return (currentLevelXP / xpForNext) * 100;
}
