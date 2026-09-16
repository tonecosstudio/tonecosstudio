import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { getPublicStorageUrl } from "@/services/supabase/storage-client";

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

export async function listWishlistItems(userId: string): Promise<WishlistItem[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("wishlist")
    .select(
      "id, notes, priority, notify_when_available, added_at, models (id, name, image_path, image_bucket, franchise, category, subcategory, tags, character_name, variant_name, source_title, source_type)",
    )
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("added_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row): WishlistItem => ({
    id: row.id,
    notes: row.notes,
    priority: row.priority ?? 0,
    notify_when_available: row.notify_when_available ?? false,
    added_at: row.added_at,
    models: row.models
      ? {
          id: row.models.id,
          name: row.models.name,
          image_path: row.models.image_path,
          image_bucket: row.models.image_bucket,
          franchise: row.models.franchise,
          category: row.models.category,
          subcategory: row.models.subcategory,
          tags: row.models.tags,
          character_name: row.models.character_name,
          variant_name: row.models.variant_name,
          source_title: row.models.source_title,
          source_type: row.models.source_type,
        }
      : null,
  }));
}

export async function removeWishlistItem(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("delete_wishlist_item", {
    p_item_id: id,
  });

  if (error) throw error;
  if (data !== id) {
    throw new Error("Exclusao da wishlist retornou um item inesperado");
  }
}

export async function updateWishlistItem({
  id,
  notes,
  priority,
  notify,
}: UpdateWishlistItemInput): Promise<void> {
  const { data, error } = await supabase.rpc("update_wishlist_item", {
    p_item_id: id,
    p_notes: notes,
    p_priority: priority,
    p_notify_when_available: notify,
  });

  if (error) throw error;
  if (data !== id) {
    throw new Error("Atualizacao da wishlist retornou um item inesperado");
  }
}

export function getWishlistModelImageUrl(model: WishlistModel | null): string | null {
  if (!model?.image_bucket || !model.image_path) {
    return null;
  }

  return getPublicStorageUrl(model.image_bucket, model.image_path);
}
