import { useQuery } from "@tanstack/react-query";
import { fetchProductionAssignmentTeamMembers } from "@/services/admin/production/production-assignment-options-service";

export function useProductionAssignmentTeamMembers(enabled: boolean) {
  return useQuery({
    queryKey: ["production-assignment-team-members"],
    queryFn: fetchProductionAssignmentTeamMembers,
    enabled,
  });
}
