import { useCallback } from "react";
import { getGroupAttachmentPublicUrl } from "@/services/groups/group-management-service";

export function useGroupAttachmentPublicUrl() {
  return useCallback((filePath: string) => getGroupAttachmentPublicUrl(filePath), []);
}
