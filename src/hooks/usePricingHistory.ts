/**
 * Hook para gerenciar histórico de mudanças de preço
 * 
 * Fornece queries para visualizar histórico de mudanças de preço
 * de níveis e coleções com filtros.
 * Requisitos: 8.3, 8.5
 * Tarefa: 8.3
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingHistory } from "@/types/pricing-tiers";

// =====================================================
// TIPOS
// =====================================================

export interface PricingHistoryFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  changeType?: PricingHistory["change_type"];
  userId?: string;
}

type PricingHistoryCsvRow = PricingHistory & {
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

// =====================================================
// QUERY KEYS
// =====================================================

export const pricingHistoryKeys = {
  all: ["pricing-history"] as const,
  lists: () => [...pricingHistoryKeys.all, "list"] as const,
  list: (filters?: PricingHistoryFilters) => [...pricingHistoryKeys.lists(), filters] as const,
  byTier: (tierId: string, filters?: PricingHistoryFilters) =>
    [...pricingHistoryKeys.all, "tier", tierId, filters] as const,
  byCollection: (collectionId: string, filters?: PricingHistoryFilters) =>
    [...pricingHistoryKeys.all, "collection", collectionId, filters] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar histórico de mudanças de um nível específico
 * Requisitos: 8.3, 8.5
 */
export function useTierPricingHistory(
  tierId: string | null | undefined,
  filters?: PricingHistoryFilters
) {
  return useQuery({
    queryKey: pricingHistoryKeys.byTier(tierId || "", filters),
    queryFn: async () => {
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

      // Aplicar filtros
      if (filters?.dateRange) {
        query = query
          .gte("changed_at", filters.dateRange.start)
          .lte("changed_at", filters.dateRange.end);
      }

      if (filters?.changeType) {
        query = query.eq("change_type", filters.changeType);
      }

      if (filters?.userId) {
        query = query.eq("changed_by", filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico do nível: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!tierId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para buscar histórico de mudanças de uma coleção específica
 * Requisitos: 8.3, 8.5
 */
export function useCollectionPricingHistory(
  collectionId: string | null | undefined,
  filters?: PricingHistoryFilters
) {
  return useQuery({
    queryKey: pricingHistoryKeys.byCollection(collectionId || "", filters),
    queryFn: async () => {
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

      // Aplicar filtros
      if (filters?.dateRange) {
        query = query
          .gte("changed_at", filters.dateRange.start)
          .lte("changed_at", filters.dateRange.end);
      }

      if (filters?.changeType) {
        query = query.eq("change_type", filters.changeType);
      }

      if (filters?.userId) {
        query = query.eq("changed_by", filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico da coleção: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!collectionId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para buscar todo o histórico de mudanças de preço
 * (para relatórios e auditoria geral)
 * Requisitos: 8.3, 8.5
 */
export function useAllPricingHistory(filters?: PricingHistoryFilters) {
  return useQuery({
    queryKey: pricingHistoryKeys.list(filters),
    queryFn: async () => {
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
        .limit(100); // Limitar para performance

      // Aplicar filtros
      if (filters?.dateRange) {
        query = query
          .gte("changed_at", filters.dateRange.start)
          .lte("changed_at", filters.dateRange.end);
      }

      if (filters?.changeType) {
        query = query.eq("change_type", filters.changeType);
      }

      if (filters?.userId) {
        query = query.eq("changed_by", filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data ?? [];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para buscar estatísticas de mudanças de preço
 * (contadores por tipo de mudança)
 * Requisitos: 8.5
 */
export function usePricingHistoryStats(filters?: PricingHistoryFilters) {
  return useQuery({
    queryKey: [...pricingHistoryKeys.all, "stats", filters],
    queryFn: async () => {
      let query = pricingHistorySupabase
        .from("pricing_history")
        .select("change_type", { count: "exact" });

      // Aplicar filtros
      if (filters?.dateRange) {
        query = query
          .gte("changed_at", filters.dateRange.start)
          .lte("changed_at", filters.dateRange.end);
      }

      if (filters?.userId) {
        query = query.eq("changed_by", filters.userId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      // Contar por tipo de mudança
      const stats = data?.reduce(
        (acc, item) => {
          acc[item.change_type] = (acc[item.change_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        total: count || 0,
        byType: stats || {},
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Função auxiliar para exportar histórico como CSV
 * Requisitos: 8.7
 */
export async function exportPricingHistoryToCSV(
  filters?: PricingHistoryFilters
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

  // Aplicar filtros
  if (filters?.dateRange) {
    query = query
      .gte("changed_at", filters.dateRange.start)
      .lte("changed_at", filters.dateRange.end);
  }

  if (filters?.changeType) {
    query = query.eq("change_type", filters.changeType);
  }

  if (filters?.userId) {
    query = query.eq("changed_by", filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao exportar histórico: ${error.message}`);
  }

  // Gerar CSV
  const headers = [
    "Data/Hora",
    "Tipo de Mudança",
    "Nível",
    "Coleção",
    "Preço Cheio Anterior",
    "Preço Cheio Novo",
    "Preço PIX Anterior",
    "Preço PIX Novo",
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

  const csv = [headers, ...(rows || [])].map((row) => row.join(",")).join("\n");

  return csv;
}
