// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

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
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
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

/**
 * Busca o perfil de colecionador do usuário atual
 */
export async function getMyCollectorProfile(userId: string) {
  const { data, error } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as CollectorProfile;
}

/**
 * Busca todos os badges disponíveis
 */
export async function getAllBadges() {
  const { data, error } = await (supabase as any)
    .from("collector_badges")
    .select("*")
    .order("requirement_value", { ascending: true });

  if (error) throw error;
  return data as CollectorBadge[];
}

/**
 * Busca badges conquistados pelo usuário
 */
export async function getUserBadges(userId: string) {
  const { data, error } = await (supabase as any)
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

  return (data || []).map((item: any) => ({
    id: item.collector_badges.id,
    name: item.collector_badges.name,
    description: item.collector_badges.description,
    icon: item.collector_badges.icon,
    rarity: item.collector_badges.rarity,
    earned_at: item.earned_at,
  })) as UserBadge[];
}

/**
 * Busca a coleção pública do usuário
 */
export async function getPublicCollection(userId: string) {
  const { data, error } = await (supabase as any)
    .from("public_collection")
    .select(
      `
      id,
      model_id,
      notes,
      display_order,
      models (
        name,
        image_path,
        image_bucket,
        franchise
      )
    `
    )
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Adiciona um modelo à coleção pública
 */
export async function addToPublicCollection(userId: string, modelId: string, notes?: string) {
  const { data, error } = await (supabase as any)
    .from("public_collection")
    .insert({
      user_id: userId,
      model_id: modelId,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove um modelo da coleção pública
 */
export async function removeFromPublicCollection(collectionId: string) {
  const { error } = await (supabase as any)
    .from("public_collection")
    .delete()
    .eq("id", collectionId);

  if (error) throw error;
}

/**
 * Atualiza notas de um item da coleção
 */
export async function updateCollectionNotes(collectionId: string, notes: string) {
  const { data, error } = await (supabase as any)
    .from("public_collection")
    .update({ notes })
    .eq("id", collectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza a ordem de exibição dos itens
 */
export async function updateCollectionOrder(items: Array<{ id: string; display_order: number }>) {
  const promises = items.map((item) =>
    (supabase as any)
      .from("public_collection")
      .update({ display_order: item.display_order })
      .eq("id", item.id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    throw errors[0].error;
  }
}

/**
 * Verifica se um username está disponível
 */
export async function checkUsernameAvailability(username: string, currentUserId?: string) {
  const query = (supabase as any).from("profiles").select("id").eq("username", username);

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
