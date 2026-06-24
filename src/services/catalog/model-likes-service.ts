import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";

export type ModelLikeRow = {
  model_id: string;
  user_id: string;
  created_at: string;
};

interface ModelLikesRpcClient {
  rpc(
    fn: "like_catalog_model" | "unlike_catalog_model",
    args: { p_model_id: string },
  ): Promise<{ error: { message?: string } | null }>;
}

const modelLikesRpc = supabase as unknown as ModelLikesRpcClient;

export async function listLikedModelIds(userId: string) {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("model_likes")
    .select("model_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set(((data ?? []) as Array<{ model_id: string }>).map((r) => r.model_id));
}

export async function likeModel(userId: string, modelId: string) {
  await assertCurrentUserId(userId);

  const { error } = await modelLikesRpc.rpc("like_catalog_model", {
    p_model_id: modelId,
  });
  if (error) throw error;
}

export async function unlikeModel(userId: string, modelId: string) {
  await assertCurrentUserId(userId);

  const { error } = await modelLikesRpc.rpc("unlike_catalog_model", {
    p_model_id: modelId,
  });
  if (error) throw error;
}
