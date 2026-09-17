import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { updateCollectorProfileRpc } from "@/services/customer/collector-mutations-service";

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
