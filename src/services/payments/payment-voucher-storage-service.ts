import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  generateSecureToken,
  MAX_PAYMENT_PROOF_SIZE,
  sanitizeFilename,
} from "@/lib/security/input-sanitizer";
import { assertCurrentUserId } from "@/services/auth/current-user";

const STORAGE_BUCKET = "payment-vouchers";

export const MAX_PAYMENT_VOUCHER_SIZE = MAX_PAYMENT_PROOF_SIZE;
export const ALLOWED_PAYMENT_VOUCHER_TYPES = ALLOWED_PAYMENT_PROOF_TYPES;

function sanitizePathPrefix(pathPrefix: string): string {
  const sanitizedSegments = pathPrefix
    .split(/[/\\]+/)
    .map((segment) => sanitizeFilename(segment))
    .filter(Boolean);

  return sanitizedSegments.length > 0 ? sanitizedSegments.join("/") : "vouchers";
}

interface UploadPaymentVoucherInput {
  file: File;
  userId?: string;
  pathPrefix: string;
}

export async function uploadPaymentVoucher({
  file,
  userId,
  pathPrefix,
}: UploadPaymentVoucherInput): Promise<string> {
  if (userId) {
    await assertCurrentUserId(userId);
  }

  const sanitizedName = sanitizeFilename(file.name);
  const finalName = sanitizedName || `file-${Date.now()}`;
  const fileExt = finalName.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const randomId = generateSecureToken(8);
  const fileName = userId
    ? `${userId}-${timestamp}-${randomId}.${fileExt}`
    : `${timestamp}-${randomId}.${fileExt}`;
  const filePath = `${sanitizePathPrefix(pathPrefix)}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Falha no upload: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}
