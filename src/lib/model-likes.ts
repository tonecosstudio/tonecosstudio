import { supabase } from "@/integrations/supabase/client";

export type ModelLikeRow = {
  model_id: string;
  user_id: string;
  created_at: string;
};

/**
 * DB expectation (Cloud SQL): table model_likes(user_id uuid, model_id uuid, created_at timestamptz)
 * with unique(user_id, model_id) and RLS so users can read/write only their own likes.
 */
export async function listLikedModelIds(userId: string) {
  const { data, error } = await supabase
    .from("model_likes")
    .select("model_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set(((data ?? []) as Array<{ model_id: string }>).map((r) => r.model_id));
}

export async function likeModel(userId: string, modelId: string) {
  const { error } = await supabase
    .from("model_likes")
    .insert({ user_id: userId, model_id: modelId });
  if (error) throw error;
}

export async function unlikeModel(userId: string, modelId: string) {
  const { error } = await supabase
    .from("model_likes")
    .delete()
    .eq("user_id", userId)
    .eq("model_id", modelId);
  if (error) throw error;
}
