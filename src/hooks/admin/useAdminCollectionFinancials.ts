import { useQuery } from "@tanstack/react-query";
import {
  fetchCollectionFinancialAnalysis,
  fetchCollectionsFinancialSummary,
} from "@/services/admin/catalog/admin-collections-service";

export function useAdminCollectionsFinancialSummary() {
  return useQuery({
    queryKey: ["collections-financial-summary"],
    queryFn: fetchCollectionsFinancialSummary,
  });
}

export function useAdminCollectionFinancialAnalysis(selectedCollection: string | null) {
  return useQuery({
    queryKey: ["collection-financial-analysis", selectedCollection],
    enabled: Boolean(selectedCollection),
    queryFn: async () => {
      if (!selectedCollection) return null;
      return fetchCollectionFinancialAnalysis(selectedCollection);
    },
  });
}
