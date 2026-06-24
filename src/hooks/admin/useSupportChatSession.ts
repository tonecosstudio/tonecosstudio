import { useQuery } from "@tanstack/react-query";
import { fetchSupportChatCurrentUser } from "@/services/admin/support/support-chat-session-service";
import { getSupportAttachmentPublicUrl } from "@/services/support/support-attachment-url-service";

export function useSupportChatCurrentUser() {
  return useQuery({
    queryKey: ["support-chat-current-user"],
    queryFn: fetchSupportChatCurrentUser,
  });
}

export function useSupportAttachmentPublicUrl() {
  return getSupportAttachmentPublicUrl;
}
