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

export async function fetchCollectionStats(collectionId: string): Promise<CollectionStatsData> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: allDeliveries, error: allDeliveriesError } = await supabase
    .from("subscription_deliveries")
    .select("id, status")
    .eq("collection_id", collectionId)
    .in("status", ["confirmed", "in_production", "shipped", "delivered"]);
  if (allDeliveriesError) throw allDeliveriesError;

  const { data: currentMonthDeliveries, error: currentMonthError } = await supabase
    .from("subscription_deliveries")
    .select("id, cycle_id, cycles!inner(month, year)")
    .eq("collection_id", collectionId)
    .in("status", ["confirmed", "in_production", "shipped", "delivered"]);
  if (currentMonthError) throw currentMonthError;

  const currentMonthCount =
    ((currentMonthDeliveries as DeliveryWithCycle[] | null) || []).filter((d) => {
      const cycle = d.cycles;
      return cycle && cycle.month === currentMonth && cycle.year === currentYear;
    }).length;

  const { data: allPurchases, error: allPurchasesError } = await supabase
    .from("standalone_purchases")
    .select("id, status, total_amount")
    .eq("collection_id", collectionId)
    .neq("status", "cancelled");
  if (allPurchasesError) throw allPurchasesError;

  const { data: currentMonthPurchases, error: currentMonthPurchasesError } = await supabase
    .from("standalone_purchases")
    .select("id, cycle_id, cycles!inner(month, year)")
    .eq("collection_id", collectionId)
    .neq("status", "cancelled");
  if (currentMonthPurchasesError) throw currentMonthPurchasesError;

  const currentMonthPurchasesCount =
    ((currentMonthPurchases as PurchaseWithCycle[] | null) || []).filter((p) => {
      const cycle = p.cycles;
      return cycle && cycle.month === currentMonth && cycle.year === currentYear;
    }).length;

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("price_full")
    .eq("id", collectionId)
    .single();
  if (collectionError) throw collectionError;

  const collectionPrice = collection?.price_full || 0;
  const subscriptionDeliveriesCount = allDeliveries?.length || 0;
  const standalonePurchasesCount = allPurchases?.length || 0;
  const totalPiecesSold = subscriptionDeliveriesCount + standalonePurchasesCount;
  const currentMonthSelections = currentMonthCount + currentMonthPurchasesCount;

  const subscriptionRevenue = subscriptionDeliveriesCount * collectionPrice;
  const standaloneRevenue =
    ((allPurchases as PurchaseRow[] | null) || []).reduce(
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

