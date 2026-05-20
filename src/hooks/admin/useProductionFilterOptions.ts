import { useQuery } from "@tanstack/react-query";
import {
  fetchProductionCollectionFilterOptions,
  fetchProductionTeamMemberFilterOptions,
} from "@/services/admin/production-filter-options-service";

export function useProductionCollectionFilterOptions() {
  return useQuery({
    queryKey: ["production-collection-filter-options"],
    queryFn: fetchProductionCollectionFilterOptions,
  });
}

export function useProductionTeamMemberFilterOptions() {
  return useQuery({
    queryKey: ["production-team-member-filter-options"],
    queryFn: fetchProductionTeamMemberFilterOptions,
  });
}
