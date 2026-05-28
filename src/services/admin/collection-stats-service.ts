import { supabase } from "@/integrations/supabase/client";

export interface CollectionStatsData {
  totalPiecesSold: number;
  currentMonthSelections: number;
  totalRevenue: number;
  subscriptionDeliveries: number;
  standalonePurchases: number;
}

interface CycleRef {
  month: number;
  year: number;
}

interface DeliveryWithCycle {
  cycles: CycleRef | null;
}

interface PurchaseWithCycle {
  cycles: CycleRef | null;
}

interface PurchaseRow {
  total_amount: number | null;
}

interface CollectionPricingRow {
  price_full: number;
}

interface CollectionStatsQuery<T> extends PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}> {
  eq(column: "collection_id", value: string): CollectionStatsQuery<T>;
  in(column: "status", values: readonly string[]): CollectionStatsQuery<T>;
  neq(column: "status", value: string): CollectionStatsQuery<T>;
}

interface CollectionStatsGateway {
  from(table: "subscription_deliveries"): {
    select(columns: "id, status"): CollectionStatsQuery<{ id: string }>;
    select(columns: "id, cycle_id, cycles!inner(month, year)"): CollectionStatsQuery<DeliveryWithCycle>;
  };
  from(table: "standalone_purchases"): {
    select(columns: "id, status, total_amount"): CollectionStatsQuery<PurchaseRow>;
    select(columns: "id, cycle_id, cycles!inner(month, year)"): CollectionStatsQuery<PurchaseWithCycle>;
  };
}

const collectionStatsGateway = supabase as unknown as CollectionStatsGateway;

async function fetchCollectionPriceFull(collectionId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_collection_pricing", {
    p_collection_id: collectionId,
  });

  if (error) throw error;

  const [pricing] = (data ?? []) as CollectionPricingRow[];
  if (!pricing) {
    throw new Error(`Pricing not found for collection ${collectionId}`);
  }

  return pricing.price_full;
}

export async function fetchCollectionStats(collectionId: string): Promise<CollectionStatsData> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: allDeliveries, error: allDeliveriesError } = await collectionStatsGateway
    .from("subscription_deliveries")
    .select("id, status")
    .eq("collection_id", collectionId)
    .in("status", ["confirmed", "in_production", "shipped", "delivered"]);
  if (allDeliveriesError) throw allDeliveriesError;

  const { data: currentMonthDeliveries, error: currentMonthError } = await collectionStatsGateway
    .from("subscription_deliveries")
    .select("id, cycle_id, cycles!inner(month, year)")
    .eq("collection_id", collectionId)
    .in("status", ["confirmed", "in_production", "shipped", "delivered"]);
  if (currentMonthError) throw currentMonthError;

  const currentMonthCount =
    (currentMonthDeliveries || []).filter((d) => {
      const cycle = d.cycles;
      return cycle && cycle.month === currentMonth && cycle.year === currentYear;
    }).length;

  const { data: allPurchases, error: allPurchasesError } = await collectionStatsGateway
    .from("standalone_purchases")
    .select("id, status, total_amount")
    .eq("collection_id", collectionId)
    .neq("status", "cancelled");
  if (allPurchasesError) throw allPurchasesError;

  const { data: currentMonthPurchases, error: currentMonthPurchasesError } = await collectionStatsGateway
    .from("standalone_purchases")
    .select("id, cycle_id, cycles!inner(month, year)")
    .eq("collection_id", collectionId)
    .neq("status", "cancelled");
  if (currentMonthPurchasesError) throw currentMonthPurchasesError;

  const currentMonthPurchasesCount =
    (currentMonthPurchases || []).filter((p) => {
      const cycle = p.cycles;
      return cycle && cycle.month === currentMonth && cycle.year === currentYear;
    }).length;

  const collectionPrice = await fetchCollectionPriceFull(collectionId);
  const subscriptionDeliveriesCount = allDeliveries?.length || 0;
  const standalonePurchasesCount = allPurchases?.length || 0;
  const totalPiecesSold = subscriptionDeliveriesCount + standalonePurchasesCount;
  const currentMonthSelections = currentMonthCount + currentMonthPurchasesCount;

  const subscriptionRevenue = subscriptionDeliveriesCount * collectionPrice;
  const standaloneRevenue =
    (allPurchases || []).reduce(
      (sum, p) => sum + (p.total_amount || 0),
      0
    );
  const totalRevenue = subscriptionRevenue + standaloneRevenue;

  return {
    totalPiecesSold,
    currentMonthSelections,
    totalRevenue,
    subscriptionDeliveries: subscriptionDeliveriesCount,
    standalonePurchases: standalonePurchasesCount,
  };
}
