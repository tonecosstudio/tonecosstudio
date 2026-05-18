import { useQuery } from "@tanstack/react-query";
import { fetchActiveSupportQuickReplies } from "@/services/admin/support-quick-replies-service";

export function useSupportQuickReplies() {
  return useQuery({
    queryKey: ["support-quick-replies", "active"],
    queryFn: fetchActiveSupportQuickReplies,
  });
}
