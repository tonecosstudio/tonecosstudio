import { supabase } from "@/integrations/supabase/client";

export interface CollectionBreakdownData {
  collection_id: string;
  collection_name: string;
  subscription_deliveries: number;
  standalone_purchases: number;
  total: number;
}

interface CollectionRelation {
  name: string;
}

interface DeliveryRow {
  collection_id: string;
  collections: CollectionRelation | null;
}

export async function fetchCollectionBreakdown(
  cycleId: string
): Promise<CollectionBreakdownData[]> {
  const { data: deliveries, error: deliveriesError } = await supabase
    .from("subscription_deliveries")
    .select(
      `
      collection_id,
      collections (
        id,
        name
      )
    `
    )
    .eq("cycle_id", cycleId)
    .not("collection_id", "is", null);
  if (deliveriesError) throw deliveriesError;

  const { data: purchases, error: purchasesError } = await supabase
    .from("standalone_purchases")
    .select(
      `
      collection_id,
      collections (
        id,
        name
      )
    `
    )
    .eq("cycle_id", cycleId)
    .not("status", "eq", "cancelled");
  if (purchasesError) throw purchasesError;

  const collectionMap = new Map<string, CollectionBreakdownData>();

  ((deliveries as DeliveryRow[] | null) || []).forEach((delivery) => {
    const collectionId = delivery.collection_id;
    const collectionName = delivery.collections?.name || "Desconhecida";
    if (!collectionMap.has(collectionId)) {
      collectionMap.set(collectionId, {
        collection_id: collectionId,
        collection_name: collectionName,
        subscription_deliveries: 0,
        standalone_purchases: 0,
        total: 0,
      });
    }
    const item = collectionMap.get(collectionId)!;
    item.subscription_deliveries++;
    item.total++;
  });

  ((purchases as DeliveryRow[] | null) || []).forEach((purchase) => {
    const collectionId = purchase.collection_id;
    const collectionName = purchase.collections?.name || "Desconhecida";
    if (!collectionMap.has(collectionId)) {
      collectionMap.set(collectionId, {
        collection_id: collectionId,
        collection_name: collectionName,
        subscription_deliveries: 0,
        standalone_purchases: 0,
        total: 0,
      });
    }
    const item = collectionMap.get(collectionId)!;
    item.standalone_purchases++;
    item.total++;
  });

  return Array.from(collectionMap.values()).sort((a, b) => b.total - a.total);
}

