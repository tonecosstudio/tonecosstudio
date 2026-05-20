import { supabase } from "@/integrations/supabase/client";

export interface WishlistModel {
  id: string;
  name: string;
  image_path: string | null;
  image_bucket: string | null;
  franchise: string | null;
  category: string | null;
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
  const { data, error } = await supabase
    .from("wishlist")
    .select(
      "id, notes, priority, notify_when_available, added_at, models (id, name, image_path, image_bucket, franchise, category)"
    )
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("added_at", { ascending: false });

  if (error) throw error;

  return (data || []) as WishlistItem[];
}

export async function removeWishlistItem(id: string): Promise<void> {
  const { error } = await supabase.from("wishlist").delete().eq("id", id);
  if (error) throw error;
}

export async function updateWishlistItem({
  id,
  notes,
  priority,
  notify,
}: UpdateWishlistItemInput): Promise<void> {
  const { error } = await supabase
    .from("wishlist")
    .update({ notes, priority, notify_when_available: notify })
    .eq("id", id);

  if (error) throw error;
}

export function getWishlistModelImageUrl(model: WishlistModel | null): string | null {
  if (!model?.image_bucket || !model.image_path) {
    return null;
  }

  return supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl;
}
