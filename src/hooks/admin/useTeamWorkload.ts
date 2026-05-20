import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignProduction } from "@/services/admin/production-service";
import {
  fetchTeamWorkload,
  type TeamMemberWorkload,
  type TeamWorkloadItem,
} from "@/services/admin/team-workload-service";

export type { TeamMemberWorkload, TeamWorkloadItem };

export const TEAM_WORKLOAD_QUERY_KEY = ["production", "team-workload"] as const;

export function useTeamWorkload() {
  return useQuery({
    queryKey: TEAM_WORKLOAD_QUERY_KEY,
    queryFn: fetchTeamWorkload,
  });
}

export function useReassignProductionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      userId,
      reason,
    }: {
      itemId: string;
      userId: string;
      reason?: string;
    }) => assignProduction(itemId, userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_WORKLOAD_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    },
  });
}
