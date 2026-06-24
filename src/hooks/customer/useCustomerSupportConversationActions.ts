import { useCallback } from "react";

import { getSupportAttachmentPublicUrl } from "@/services/support/support-attachment-url-service";

export function useSupportAttachmentPublicUrl() {
  return useCallback((filePath: string) => getSupportAttachmentPublicUrl(filePath), []);
}
