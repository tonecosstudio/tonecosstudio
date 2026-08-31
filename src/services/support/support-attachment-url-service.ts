import { createStorageSignedUrl } from "@/services/supabase/storage-client";

const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
const SUPPORT_ATTACHMENT_URL_TTL_SECONDS = 60 * 60;

function validateSupportAttachmentPath(filePath: string): void {
  if (
    !filePath ||
    filePath.length > 500 ||
    filePath.startsWith("/") ||
    filePath.includes("..") ||
    filePath.includes("//") ||
    Array.from(filePath).some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    throw new Error("Invalid support attachment path");
  }
}

export async function getSupportAttachmentSignedUrl(
  filePath: string,
  expiresIn = SUPPORT_ATTACHMENT_URL_TTL_SECONDS,
): Promise<string> {
  validateSupportAttachmentPath(filePath);

  const { data, error } = await createStorageSignedUrl(
    SUPPORT_ATTACHMENTS_BUCKET,
    filePath,
    expiresIn,
  );

  if (error || !data?.signedUrl) {
    throw new Error("Support attachment is unavailable");
  }

  return data.signedUrl;
}
