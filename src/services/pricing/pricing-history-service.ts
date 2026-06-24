import { supabase } from "@/integrations/supabase/client";
import type { PricingHistory } from "@/types/pricing-tiers";

export interface PricingHistoryFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  changeType?: PricingHistory["change_type"];
  userId?: string;
}

export type PricingHistoryCsvRow = PricingHistory & {
  profiles: {
    id?: string;
    full_name: string | null;
    email: string | null;
  } | null;
  pricing_tiers: {
    id?: string;
    name: string | null;
  } | null;
  collections: {
    id?: string;
    name: string | null;
  } | null;
};

type PricingHistoryQueryError = {
  message: string;
};

interface PricingHistoryQuery extends PromiseLike<{
  data: PricingHistoryCsvRow[] | null;
  error: PricingHistoryQueryError | null;
  count: number | null;
}> {
  eq(column: string, value: string): PricingHistoryQuery;
  gte(column: string, value: string): PricingHistoryQuery;
  lte(column: string, value: string): PricingHistoryQuery;
  order(column: string, options: { ascending: boolean }): PricingHistoryQuery;
  limit(count: number): PricingHistoryQuery;
}

interface PricingHistoryTableClient {
  from(table: "pricing_history"): {
    select(columns: string, options?: { count: "exact" }): PricingHistoryQuery;
  };
}

const pricingHistorySupabase = supabase as unknown as PricingHistoryTableClient;

function applyPricingHistoryFilters(
  query: PricingHistoryQuery,
  filters?: PricingHistoryFilters,
): PricingHistoryQuery {
  let nextQuery = query;

  if (filters?.dateRange) {
    nextQuery = nextQuery
      .gte("changed_at", filters.dateRange.start)
      .lte("changed_at", filters.dateRange.end);
  }

  if (filters?.changeType) {
    nextQuery = nextQuery.eq("change_type", filters.changeType);
  }

  if (filters?.userId) {
    nextQuery = nextQuery.eq("changed_by", filters.userId);
  }

  return nextQuery;
}

export async function listTierPricingHistory(
  tierId: string | null | undefined,
  filters?: PricingHistoryFilters,
): Promise<PricingHistoryCsvRow[]> {
  if (!tierId) return [];

  let query = pricingHistorySupabase
    .from("pricing_history")
    .select(`
      *,
      profiles:changed_by (
        id,
        full_name,
        email
      )
    `)
    .eq("tier_id", tierId)
    .order("changed_at", { ascending: false });

  query = applyPricingHistoryFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar historico do nivel: ${error.message}`);
  }

  return data ?? [];
}

export async function listCollectionPricingHistory(
  collectionId: string | null | undefined,
  filters?: PricingHistoryFilters,
): Promise<PricingHistoryCsvRow[]> {
  if (!collectionId) return [];

  let query = pricingHistorySupabase
    .from("pricing_history")
    .select(`
      *,
      profiles:changed_by (
        id,
        full_name,
        email
      )
    `)
    .eq("collection_id", collectionId)
    .order("changed_at", { ascending: false });

  query = applyPricingHistoryFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar historico da colecao: ${error.message}`);
  }

  return data ?? [];
}

export async function listAllPricingHistory(
  filters?: PricingHistoryFilters,
): Promise<PricingHistoryCsvRow[]> {
  let query = pricingHistorySupabase
    .from("pricing_history")
    .select(`
      *,
      profiles:changed_by (
        id,
        full_name,
        email
      ),
      pricing_tiers (
        id,
        name
      ),
      collections (
        id,
        name
      )
    `)
    .order("changed_at", { ascending: false })
    .limit(100);

  query = applyPricingHistoryFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar historico: ${error.message}`);
  }

  return data ?? [];
}

export async function getPricingHistoryStats(filters?: PricingHistoryFilters) {
  let query = pricingHistorySupabase
    .from("pricing_history")
    .select("change_type", { count: "exact" });

  query = applyPricingHistoryFilters(query, {
    dateRange: filters?.dateRange,
    userId: filters?.userId,
  });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Erro ao buscar estatisticas: ${error.message}`);
  }

  const stats = data?.reduce<Record<string, number>>((acc, item) => {
    acc[item.change_type] = (acc[item.change_type] || 0) + 1;
    return acc;
  }, {});

  return {
    total: count || 0,
    byType: stats || {},
  };
}

export async function exportPricingHistoryToCSV(
  filters?: PricingHistoryFilters,
): Promise<string> {
  let query = pricingHistorySupabase
    .from("pricing_history")
    .select(`
      *,
      profiles:changed_by (
        full_name,
        email
      ),
      pricing_tiers (
        name
      ),
      collections (
        name
      )
    `)
    .order("changed_at", { ascending: false });

  query = applyPricingHistoryFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao exportar historico: ${error.message}`);
  }

  const headers = [
    "Data/Hora",
    "Tipo de Mudanca",
    "Nivel",
    "Colecao",
    "Preco Cheio Anterior",
    "Preco Cheio Novo",
    "Preco PIX Anterior",
    "Preco PIX Novo",
    "Entrada Anterior",
    "Entrada Nova",
    "Alterado Por",
  ];

  const rows = data?.map((item) => [
    new Date(item.changed_at).toLocaleString("pt-BR"),
    item.change_type,
    item.pricing_tiers?.name || "-",
    item.collections?.name || "-",
    item.old_price_full?.toFixed(2) || "-",
    item.new_price_full?.toFixed(2) || "-",
    item.old_price_pix?.toFixed(2) || "-",
    item.new_price_pix?.toFixed(2) || "-",
    item.old_deposit_amount?.toFixed(2) || "-",
    item.new_deposit_amount?.toFixed(2) || "-",
    item.profiles?.full_name || item.profiles?.email || "-",
  ]);

  return [headers, ...(rows || [])].map((row) => row.join(",")).join("\n");
}
