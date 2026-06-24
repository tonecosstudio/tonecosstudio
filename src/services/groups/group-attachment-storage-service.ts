import { createStorageSignedUrl } from "@/services/supabase/storage-client";

const GROUP_ATTACHMENTS_BUCKET = "group-attachments";
const GROUP_ATTACHMENT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;
const GROUP_ATTACHMENT_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/].*/i;

function validateGroupAttachmentPath(filePath: string): void {
  if (
    !filePath ||
    filePath.startsWith("/") ||
    filePath.includes("..") ||
    filePath.includes("//") ||
    !GROUP_ATTACHMENT_PATH_PATTERN.test(filePath) ||
    [...filePath].some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    throw new Error("Invalid group attachment path");
  }
}

export async function createGroupAttachmentSignedUrl(
  filePath: string,
  expiresIn: number = GROUP_ATTACHMENT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  validateGroupAttachmentPath(filePath);

  const { data, error } = await createStorageSignedUrl(
    GROUP_ATTACHMENTS_BUCKET,
    filePath,
    expiresIn,
  );

  if (error || !data?.signedUrl) {
    throw new Error("Failed to generate group attachment access URL");
  }

  return data.signedUrl;
}
