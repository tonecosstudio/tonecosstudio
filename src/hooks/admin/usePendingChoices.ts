import { useQuery } from "@tanstack/react-query";
import {
  fetchPendingChoices,
  type PendingChoice,
} from "@/services/admin/pending-choices-service";

export type { PendingChoice };

export function usePendingChoices(cycleIds?: string[]) {
  return useQuery({
    queryKey: ["pending-choices", cycleIds],
    queryFn: () => fetchPendingChoices(cycleIds || []),
    enabled: !!cycleIds && cycleIds.length > 0,
  });
}

