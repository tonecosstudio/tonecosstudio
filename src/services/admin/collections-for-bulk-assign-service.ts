import { supabase } from "@/integrations/supabase/client";

export interface CollectionForBulkAssign {
  id: string;
  name: string;
  slug: string;
  price_full: number;
  tier_id?: string | null;
  tier_name?: string | null;
}

interface CollectionTierAssignmentRow {
  tier_id: string | null;
  pricing_tiers: {
    name: string | null;
  } | null;
}

interface CollectionQueryRow {
  id: string;
  name: string;
  slug: string;
  price_full: number;
  collection_tier_assignments: CollectionTierAssignmentRow[] | null;
}

export async function fetchCollectionsForBulkAssign(): Promise<CollectionForBulkAssign[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      slug,
      price_full,
      collection_tier_assignments (
        tier_id,
        pricing_tiers (
          name
        )
      )
    `
    )
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return (data as CollectionQueryRow[]).map((col) => ({
    id: col.id,
    name: col.name,
    slug: col.slug,
    price_full: col.price_full,
    tier_id: col.collection_tier_assignments?.[0]?.tier_id || null,
    tier_name: col.collection_tier_assignments?.[0]?.pricing_tiers?.name || null,
  }));
}
