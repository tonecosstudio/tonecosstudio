import { supabase } from "@/integrations/supabase/client";
import { assignCollectionsToTierRpc } from "@/services/admin/config/admin-config-mutations-service";

export interface CollectionForTierAssignment {
  id: string;
  name: string;
  tier_id: string | null;
}

interface CollectionQueryRow {
  id: string;
  name: string;
  collection_kind?: string;
  collection_tier_assignments: Array<{ tier_id: string | null }> | null;
}

export async function fetchCollectionsForTierAssignment(): Promise<CollectionForTierAssignment[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
      *,
      collection_tier_assignments (
        tier_id
      )
    `
    )
    .order("name");

  if (error) throw error;

  return (data as unknown as CollectionQueryRow[])
    .filter((col) => col.collection_kind !== "internal")
    .map((col) => ({
      id: col.id,
      name: col.name,
      tier_id: col.collection_tier_assignments?.[0]?.tier_id || null,
    }));
}

export async function saveCollectionsForTierAssignment(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<void> {
  await assignCollectionsToTierRpc(input);
}
