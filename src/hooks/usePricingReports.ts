/**
 * Hook para gerenciar relatórios de níveis de preço
 * 
 * Fornece queries para diferentes tipos de relatórios sobre
 * níveis de preço, coleções e receita.
 * Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5
 * Tarefa: 8.5
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  GetPricingReportsInput,
  CollectionsByTierReport,
  RevenueByTierReport,
  ConversionByTierReport,
} from "@/types/pricing-tiers";
import { getPricingReportsSchema } from "@/lib/validations/pricing-tiers";

type PricingReportCsvData =
  | CollectionsByTierReport[]
  | RevenueByTierReport[]
  | ConversionByTierReport[];

// =====================================================
// QUERY KEYS
// =====================================================

export const pricingReportsKeys = {
  all: ["pricing-reports"] as const,
  collectionsByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "collections-by-tier", dateRange] as const,
  revenueByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "revenue-by-tier", dateRange] as const,
  conversionByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "conversion-by-tier", dateRange] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar relatório de contagem de coleções por nível
 * Requisitos: 11.2
 */
export function useCollectionsByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.collectionsByTier(dateRange),
    queryFn: async () => {
      // Buscar níveis com contagem de coleções
      const { data, error } = await supabase
        .from("pricing_tier_stats")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar relatório: ${error.message}`);
      }

      // Transformar para formato do relatório
      const report: CollectionsByTierReport[] = data.map((tier) => ({
        tier_id: tier.id,
        tier_name: tier.name,
        collection_count: tier.collections_count || 0,
        active_collection_count: tier.active_collections_count || 0,
      }));

      return report;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar relatório de receita por nível
 * Requisitos: 11.3
 */
export function useRevenueByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.revenueByTier(dateRange),
    queryFn: async () => {
      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pricing-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reportType: "revenue_by_tier",
            dateRange,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar relatório de receita");
      }

      const result = await response.json();
      return result.data as RevenueByTierReport[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar relatório de taxa de conversão por nível
 * Requisitos: 11.4
 */
export function useConversionByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.conversionByTier(dateRange),
    queryFn: async () => {
      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pricing-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reportType: "conversion_by_tier",
            dateRange,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar relatório de conversão");
      }

      const result = await response.json();
      return result.data as ConversionByTierReport[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook genérico para buscar qualquer tipo de relatório
 * Requisitos: 11.1, 11.5
 */
export function usePricingReport(input: GetPricingReportsInput) {
  return useQuery({
    queryKey: [...pricingReportsKeys.all, input.reportType, input.dateRange],
    queryFn: async () => {
      // Validar input
      const validated = getPricingReportsSchema.parse(input);

      // Para relatório de coleções, usar query direta (mais rápido)
      if (validated.reportType === "collections_by_tier") {
        const { data, error } = await supabase
          .from("pricing_tier_stats")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) {
          throw new Error(`Erro ao buscar relatório: ${error.message}`);
        }

        return data.map((tier) => ({
          tier_id: tier.id,
          tier_name: tier.name,
          collection_count: tier.collections_count || 0,
          active_collection_count: tier.active_collections_count || 0,
        })) as CollectionsByTierReport[];
      }

      // Para outros relatórios, usar Edge Function
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pricing-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(validated),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar relatório");
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar resumo de todos os relatórios
 * (útil para dashboard)
 * Requisitos: 11.5
 */
export function usePricingReportsSummary(dateRange?: { start: string; end: string }) {
  const collectionsByTier = useCollectionsByTierReport(dateRange);
  const revenueByTier = useRevenueByTierReport(dateRange);
  const conversionByTier = useConversionByTierReport(dateRange);

  return {
    collectionsByTier: collectionsByTier.data,
    revenueByTier: revenueByTier.data,
    conversionByTier: conversionByTier.data,
    isLoading:
      collectionsByTier.isLoading || revenueByTier.isLoading || conversionByTier.isLoading,
    isError: collectionsByTier.isError || revenueByTier.isError || conversionByTier.isError,
    error: collectionsByTier.error || revenueByTier.error || conversionByTier.error,
  };
}

/**
 * Função auxiliar para exportar relatório como CSV
 * Requisitos: 11.6
 */
export function exportReportToCSV(
  reportType: "collections_by_tier",
  data: CollectionsByTierReport[]
): string;
export function exportReportToCSV(
  reportType: "revenue_by_tier",
  data: RevenueByTierReport[]
): string;
export function exportReportToCSV(
  reportType: "conversion_by_tier",
  data: ConversionByTierReport[]
): string;
export function exportReportToCSV(
  reportType: "collections_by_tier" | "revenue_by_tier" | "conversion_by_tier",
  data: PricingReportCsvData
): string {
  if (reportType === "collections_by_tier") {
    const headers = ["Nível", "Total de Coleções", "Coleções Ativas"];
    const rows = (data as CollectionsByTierReport[]).map((item) => [
      item.tier_name,
      item.collection_count.toString(),
      item.active_collection_count.toString(),
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  if (reportType === "revenue_by_tier") {
    const headers = [
      "Nível",
      "Receita Total",
      "Receita de Assinaturas",
      "Receita de Compras Avulsas",
    ];
    const rows = (data as RevenueByTierReport[]).map((item) => [
      item.tier_name,
      `R$ ${item.total_revenue.toFixed(2)}`,
      `R$ ${item.subscription_revenue.toFixed(2)}`,
      `R$ ${item.standalone_revenue.toFixed(2)}`,
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  if (reportType === "conversion_by_tier") {
    const headers = ["Nível", "Visualizações", "Compras", "Taxa de Conversão"];
    const rows = (data as ConversionByTierReport[]).map((item) => [
      item.tier_name,
      item.views.toString(),
      item.purchases.toString(),
      `${item.conversion_rate.toFixed(2)}%`,
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  return "";
}

/**
 * Função auxiliar para baixar CSV
 * Requisitos: 11.6
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
