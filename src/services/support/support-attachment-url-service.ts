import { getPublicStorageUrl } from "@/services/supabase/storage-client";

const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";

export function getSupportAttachmentPublicUrl(filePath: string): string {
  return getPublicStorageUrl(SUPPORT_ATTACHMENTS_BUCKET, filePath);
}
