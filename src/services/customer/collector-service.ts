import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { updateCollectorProfileRpc } from "@/services/customer/collector-mutations-service";

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

export async function getMyCollectorProfile(userId: string) {
  await assertCurrentUserId(userId);

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

export async function checkUsernameAvailability(username: string, currentUserId?: string) {
  const query = supabase.from("profiles").select("id").eq("username", username);

  if (currentUserId) {
    query.neq("id", currentUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data === null;
}

export function calculateXPForNextLevel(level: number): number {
  if (level < 2) return 100;
  if (level < 3) return 200;
  if (level < 4) return 300;
  if (level < 5) return 400;
  return 500;
}

export function calculateLevelProgress(xp: number, level: number): number {
  const xpForNext = calculateXPForNextLevel(level);
  const currentLevelXP = xp % xpForNext;
  return (currentLevelXP / xpForNext) * 100;
}
