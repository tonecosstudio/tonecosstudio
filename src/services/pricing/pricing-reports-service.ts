import { getPricingReportsSchema } from "@/lib/validations/pricing-tiers";
import { fetchPricingTiersWithStats } from "@/services/pricing/pricing-tiers-service";
import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";
import type {
  CollectionsByTierReport,
  ConversionByTierReport,
  GetPricingReportsInput,
  RevenueByTierReport,
} from "@/types/pricing-tiers";

type DateRange = { start: string; end: string };

function toCollectionsByTierReport(): Promise<CollectionsByTierReport[]> {
  return fetchPricingTiersWithStats().then((tiers) =>
    tiers
      .filter((tier) => tier.is_active)
      .map((tier) => ({
        tier_id: tier.id,
        tier_name: tier.name,
        collection_count: tier.collections_count || 0,
        active_collection_count: tier.active_collections_count || 0,
      })),
  );
}

async function callPricingReportsFunction<T>(body: unknown): Promise<T> {
  return callAuthenticatedEdgeFunctionData<T>(
    "get-pricing-reports",
    body,
    "Erro ao buscar relatorio",
  );
}

export function fetchCollectionsByTierReport(
  _dateRange?: DateRange,
): Promise<CollectionsByTierReport[]> {
  return toCollectionsByTierReport();
}

export function fetchRevenueByTierReport(
  dateRange?: DateRange,
): Promise<RevenueByTierReport[]> {
  return callPricingReportsFunction<RevenueByTierReport[]>({
    reportType: "revenue_by_tier",
    dateRange,
  });
}

export function fetchConversionByTierReport(
  dateRange?: DateRange,
): Promise<ConversionByTierReport[]> {
  return callPricingReportsFunction<ConversionByTierReport[]>({
    reportType: "conversion_by_tier",
    dateRange,
  });
}

export async function fetchPricingReport(input: GetPricingReportsInput) {
  const validated = getPricingReportsSchema.parse(input);

  if (validated.reportType === "collections_by_tier") {
    return toCollectionsByTierReport();
  }

  return callPricingReportsFunction(validated);
}
