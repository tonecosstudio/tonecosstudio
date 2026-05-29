import { supabase } from "@/integrations/supabase/client";

export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  collector_level: number;
  collector_xp: number;
  pieces_owned: number;
}

export interface PublicBadge {
  id: string;
  collector_badges: {
    icon: string | null;
    name: string | null;
  } | null;
}

export interface PublicCollectionModel {
  id: string;
  name: string | null;
  image_bucket: string | null;
  image_path: string | null;
  franchise: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
  character_name?: string | null;
  variant_name?: string | null;
  source_title?: string | null;
  source_type?: string | null;
}

export interface PublicCollectionItem {
  id: string;
  models: PublicCollectionModel | null;
}

type PublicCollectionQueryResult = {
  data: PublicCollectionItem[] | null;
  error: { message?: string } | null;
};

interface PublicCollectionQuery extends PromiseLike<PublicCollectionQueryResult> {
  eq(column: string, value: string): PublicCollectionQuery;
  order(column: string, options: { ascending: boolean }): PublicCollectionQuery;
}

interface PublicProfileCatalogGateway {
  from(table: "public_collection"): {
    select(columns: string): PublicCollectionQuery;
  };
}

const publicProfileCatalogGateway = supabase as unknown as PublicProfileCatalogGateway;

export async function getPublicProfileByUsername(
  username?: string
): Promise<PublicProfile | null> {
  if (!username) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, collector_level, collector_xp, pieces_owned")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  if (error) throw error;

  return data as PublicProfile;
}

export async function listPublicBadges(userId: string): Promise<PublicBadge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("id, collector_badges (icon, name)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data || []) as PublicBadge[];
}

export async function listPublicCollectionItems(userId: string): Promise<PublicCollectionItem[]> {
  const { data, error } = await publicProfileCatalogGateway
    .from("public_collection")
    .select("id, models (id, name, image_bucket, image_path, franchise, category, subcategory, tags, character_name, variant_name, source_title, source_type)")
    .eq("user_id", userId)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data || []) as PublicCollectionItem[];
}

export function getPublicCollectionImageUrl(model: PublicCollectionModel | null): string | null {
  if (!model?.image_bucket || !model.image_path) {
    return null;
  }

  return supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl;
}
