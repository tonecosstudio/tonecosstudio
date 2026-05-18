import { useQuery } from "@tanstack/react-query";
import { fetchActiveQuickReplies } from "@/services/admin/quick-replies-service";

export function useQuickRepliesSelector(enabled: boolean) {
  return useQuery({
    queryKey: ["quick-replies-selector", "active"],
    queryFn: fetchActiveQuickReplies,
    enabled,
  });
}
