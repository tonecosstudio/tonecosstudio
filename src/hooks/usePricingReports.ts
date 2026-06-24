import { useQuery } from "@tanstack/react-query";
import {
  fetchCollectionsByTierReport,
  fetchConversionByTierReport,
  fetchPricingReport,
  fetchRevenueByTierReport,
} from "@/services/pricing/pricing-reports-service";
import type {
  CollectionsByTierReport,
  ConversionByTierReport,
  GetPricingReportsInput,
  RevenueByTierReport,
} from "@/types/pricing-tiers";

type PricingReportCsvData =
  | CollectionsByTierReport[]
  | RevenueByTierReport[]
  | ConversionByTierReport[];

export const pricingReportsKeys = {
  all: ["pricing-reports"] as const,
  collectionsByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "collections-by-tier", dateRange] as const,
  revenueByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "revenue-by-tier", dateRange] as const,
  conversionByTier: (dateRange?: { start: string; end: string }) =>
    [...pricingReportsKeys.all, "conversion-by-tier", dateRange] as const,
};

export function useCollectionsByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.collectionsByTier(dateRange),
    queryFn: () => fetchCollectionsByTierReport(dateRange),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRevenueByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.revenueByTier(dateRange),
    queryFn: () => fetchRevenueByTierReport(dateRange),
    staleTime: 5 * 60 * 1000,
  });
}

export function useConversionByTierReport(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: pricingReportsKeys.conversionByTier(dateRange),
    queryFn: () => fetchConversionByTierReport(dateRange),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePricingReport(input: GetPricingReportsInput) {
  return useQuery({
    queryKey: [...pricingReportsKeys.all, input.reportType, input.dateRange],
    queryFn: () => fetchPricingReport(input),
    staleTime: 5 * 60 * 1000,
  });
}

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

export function exportReportToCSV(
  reportType: "collections_by_tier",
  data: CollectionsByTierReport[],
): string;
export function exportReportToCSV(
  reportType: "revenue_by_tier",
  data: RevenueByTierReport[],
): string;
export function exportReportToCSV(
  reportType: "conversion_by_tier",
  data: ConversionByTierReport[],
): string;
export function exportReportToCSV(
  reportType: "collections_by_tier" | "revenue_by_tier" | "conversion_by_tier",
  data: PricingReportCsvData,
): string {
  if (reportType === "collections_by_tier") {
    const headers = ["Nivel", "Total de Colecoes", "Colecoes Ativas"];
    const rows = (data as CollectionsByTierReport[]).map((item) => [
      item.tier_name,
      item.collection_count.toString(),
      item.active_collection_count.toString(),
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  if (reportType === "revenue_by_tier") {
    const headers = [
      "Nivel",
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
    const headers = ["Nivel", "Visualizacoes", "Compras", "Taxa de Conversao"];
    const rows = (data as ConversionByTierReport[]).map((item) => [
      item.tier_name,
      item.views === null ? "N/A" : item.views.toString(),
      item.purchases.toString(),
      item.conversion_rate === null ? "N/A" : `${item.conversion_rate.toFixed(2)}%`,
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  return "";
}

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
