import { createStorageSignedUrl } from "@/services/supabase/storage-client";

const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
const SUPPORT_ATTACHMENT_URL_TTL_SECONDS = 60 * 60;
const CACHE_SAFETY_MARGIN_MS = 5 * 60 * 1000;

const signedUrlCache = new Map<
  string,
  {
    url: string;
    expiresAt: number;
  }
>();

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

function cacheSignedUrl(filePath: string, url: string, expiresIn: number): void {
  const ttlMs = Math.max(expiresIn * 1000 - CACHE_SAFETY_MARGIN_MS, 0);
  signedUrlCache.set(filePath, {
    url,
    expiresAt: Date.now() + ttlMs,
  });
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
    signedUrlCache.delete(filePath);
    throw new Error("Support attachment is unavailable");
  }

  cacheSignedUrl(filePath, data.signedUrl, expiresIn);
  return data.signedUrl;
}

/**
 * Backward-compatible synchronous accessor used by existing chat renderers.
 * It never generates a public Storage URL. It only returns an unexpired signed
 * URL previously created through an authenticated, RLS-protected request.
 */
export function getSupportAttachmentPublicUrl(filePath: string): string {
  try {
    validateSupportAttachmentPath(filePath);
  } catch {
    return "";
  }

  const cached = signedUrlCache.get(filePath);
  if (!cached || cached.expiresAt <= Date.now()) {
    signedUrlCache.delete(filePath);
    return "";
  }

  return cached.url;
}
