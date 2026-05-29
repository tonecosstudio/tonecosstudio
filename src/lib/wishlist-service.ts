import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";

export interface WishlistModel {
  id: string;
  name: string;
  image_path: string | null;
  image_bucket: string | null;
  franchise: string | null;
  category: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
  character_name?: string | null;
  variant_name?: string | null;
  source_title?: string | null;
  source_type?: string | null;
}

export interface WishlistItem {
  id: string;
  notes: string | null;
  priority: number;
  notify_when_available: boolean;
  added_at: string;
  models: WishlistModel | null;
}

export interface UpdateWishlistItemInput {
  id: string;
  notes: string;
  priority: number;
  notify: boolean;
}

interface WishlistRpcClient {
  rpc(
    fn: "delete_wishlist_item",
    args: { p_item_id: string }
  ): Promise<{ error: { message?: string } | null }>;
  rpc(
    fn: "update_wishlist_item",
    args: {
      p_item_id: string;
      p_notes: string;
      p_priority: number;
      p_notify_when_available: boolean;
    }
  ): Promise<{ error: { message?: string } | null }>;
}

const wishlistRpc = supabase as unknown as WishlistRpcClient;

interface WishlistQuery extends PromiseLike<{
  data: WishlistItem[] | null;
  error: { message: string } | null;
}> {
  eq(column: "user_id", value: string): WishlistQuery;
  order(column: "priority" | "added_at", options: { ascending: boolean }): WishlistQuery;
}

interface WishlistTableClient {
  from(table: "wishlist"): {
    select(columns: string): WishlistQuery;
  };
}

const wishlistTable = supabase as unknown as WishlistTableClient;

export async function listWishlistItems(userId: string): Promise<WishlistItem[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await wishlistTable
    .from("wishlist")
    .select(
      "id, notes, priority, notify_when_available, added_at, models (id, name, image_path, image_bucket, franchise, category, subcategory, tags, character_name, variant_name, source_title, source_type)"
    )
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("added_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function removeWishlistItem(id: string): Promise<void> {
  const { error } = await wishlistRpc.rpc("delete_wishlist_item", {
    p_item_id: id,
  });
  if (error) throw error;
}

export async function updateWishlistItem({
  id,
  notes,
  priority,
  notify,
}: UpdateWishlistItemInput): Promise<void> {
  const { error } = await wishlistRpc.rpc("update_wishlist_item", {
    p_item_id: id,
    p_notes: notes,
    p_priority: priority,
    p_notify_when_available: notify,
  });

  if (error) throw error;
}

export function getWishlistModelImageUrl(model: WishlistModel | null): string | null {
  if (!model?.image_bucket || !model.image_path) {
    return null;
  }

  return supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl;
}
