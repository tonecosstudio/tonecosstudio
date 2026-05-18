import { supabase } from "@/integrations/supabase/client";

export interface CollectionForTierAssignment {
  id: string;
  name: string;
  tier_id: string | null;
}

interface CollectionQueryRow {
  id: string;
  name: string;
  collection_tier_assignments: Array<{ tier_id: string | null }> | null;
}

export async function fetchCollectionsForTierAssignment(): Promise<CollectionForTierAssignment[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      collection_tier_assignments (
        tier_id
      )
    `
    )
    .order("name");

  if (error) throw error;

  return (data as CollectionQueryRow[]).map((col) => ({
    id: col.id,
    name: col.name,
    tier_id: col.collection_tier_assignments?.[0]?.tier_id || null,
  }));
}

export async function saveCollectionsForTierAssignment(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<void> {
  const { error: unassignError } = await supabase
    .from("collection_tier_assignments")
    .delete()
    .eq("tier_id", input.tierId);
  if (unassignError) throw unassignError;

  if (input.collectionIds.length === 0) return;

  const assignments = input.collectionIds.map((collectionId) => ({
    collection_id: collectionId,
    tier_id: input.tierId,
  }));

  const { error: assignError } = await supabase
    .from("collection_tier_assignments")
    .insert(assignments);
  if (assignError) throw assignError;
}
