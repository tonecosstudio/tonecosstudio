import { supabase } from "@/integrations/supabase/client";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";

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
    price_full: number | null;
  } | null;
}

interface CollectionQueryRow {
  id: string;
  name: string;
  slug: string;
  collection_tier_assignments: CollectionTierAssignmentRow[] | null;
}

interface BulkAssignCollectionsQuery extends PromiseLike<{
  data: CollectionQueryRow[] | null;
  error: { message: string } | null;
}> {
  eq(column: "is_active", value: boolean): BulkAssignCollectionsQuery;
  order(column: "name"): BulkAssignCollectionsQuery;
}

interface SystemSettingQuery {
  eq(column: "key", value: "default_price_full"): {
    maybeSingle(): Promise<{
      data: { value: string | null } | null;
      error: { message: string } | null;
    }>;
  };
}

interface CollectionsForBulkAssignGateway {
  from(table: "collections"): {
    select(columns: string): BulkAssignCollectionsQuery;
  };
  from(table: "system_settings"): {
    select(columns: "value"): SystemSettingQuery;
  };
}

const collectionsForBulkAssignGateway = supabase as unknown as CollectionsForBulkAssignGateway;

async function fetchDefaultCollectionPriceFull(): Promise<number> {
  const { data, error } = await collectionsForBulkAssignGateway
    .from("system_settings")
    .select("value")
    .eq("key", "default_price_full")
    .maybeSingle();

  if (error) throw error;
  if (!data?.value) {
    throw new Error("Default full price setting is not configured");
  }

  return parseSystemSettingNumber("default_price_full", data.value);
}

export async function fetchCollectionsForBulkAssign(): Promise<CollectionForBulkAssign[]> {
  const [defaultPriceFull, collectionsResponse] = await Promise.all([
    fetchDefaultCollectionPriceFull(),
    collectionsForBulkAssignGateway
      .from("collections")
      .select(
        `
      id,
      name,
      slug,
      collection_tier_assignments (
        tier_id,
        pricing_tiers (
          name,
          price_full
        )
      )
    `
      )
      .eq("is_active", true)
      .order("name"),
  ]);

  const { data, error } = collectionsResponse;
  if (error) throw error;

  return (data || []).map((col) => {
    const assignment = col.collection_tier_assignments?.[0];

    return {
      id: col.id,
      name: col.name,
      slug: col.slug,
      price_full: assignment?.pricing_tiers?.price_full ?? defaultPriceFull,
      tier_id: assignment?.tier_id || null,
      tier_name: assignment?.pricing_tiers?.name || null,
    };
  });
}
