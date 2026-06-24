import { useQuery } from "@tanstack/react-query";
import { adminQuickReplyQueryKeys } from "@/hooks/admin/admin-quick-reply-query-keys";
import { fetchActiveQuickReplies } from "@/services/admin/support/quick-replies-service";

export type { QuickReply } from "@/services/admin/support/quick-replies-service";

export function useQuickRepliesSelector(enabled: boolean) {
  return useQuery({
    queryKey: adminQuickReplyQueryKeys.active(),
    queryFn: fetchActiveQuickReplies,
    enabled,
  });
}
