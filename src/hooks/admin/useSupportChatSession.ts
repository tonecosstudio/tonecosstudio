import { useQuery } from "@tanstack/react-query";
import {
  fetchSupportChatCurrentUser,
  getSupportAttachmentPublicUrl,
} from "@/services/admin/support-chat-session-service";

export function useSupportChatCurrentUser() {
  return useQuery({
    queryKey: ["support-chat-current-user"],
    queryFn: fetchSupportChatCurrentUser,
  });
}

export function useSupportAttachmentPublicUrl() {
  return getSupportAttachmentPublicUrl;
}
