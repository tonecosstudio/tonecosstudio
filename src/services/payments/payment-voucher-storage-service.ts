import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  sanitizeFilename,
} from "@/lib/security/input-sanitizer";

const STORAGE_BUCKET = "payment-vouchers";

export const MAX_PAYMENT_VOUCHER_SIZE = 5 * 1024 * 1024;
export const ALLOWED_PAYMENT_VOUCHER_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
] as const;

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
  const sanitizedName = sanitizeFilename(file.name);
  const finalName = sanitizedName || `file-${Date.now()}`;
  const fileExt = finalName.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const fileName = userId
    ? `${userId}-${timestamp}-${randomId}.${fileExt}`
    : `${timestamp}-${randomId}.${fileExt}`;
  const filePath = `${pathPrefix}/${fileName}`;

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
