import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { assertCurrentUserId } from "@/services/auth/current-user";

export type ModelLikeRow = Database["public"]["Tables"]["model_likes"]["Row"];

export async function listLikedModelIds(userId: string) {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("model_likes")
    .select("model_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.model_id));
}

export async function likeModel(userId: string, modelId: string) {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase.rpc("like_catalog_model", {
    p_model_id: modelId,
  });
  if (error) throw error;
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("Like model returned an invalid identifier");
  }
}

export async function unlikeModel(userId: string, modelId: string) {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase.rpc("unlike_catalog_model", {
    p_model_id: modelId,
  });
  if (error) throw error;
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("Unlike model returned an invalid identifier");
  }
}
