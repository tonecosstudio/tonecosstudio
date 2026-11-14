import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  generateSecureToken,
  MAX_PAYMENT_PROOF_SIZE,
  sanitizeFilename,
} from "@/lib/security/input-sanitizer";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";
import {
  removeStorageFiles,
  uploadStorageFile,
} from "@/services/supabase/storage-client";

const STORAGE_BUCKET = "payment-vouchers";
const SUBSCRIPTIONS_PREFIX = "subscriptions";

export const MAX_PAYMENT_VOUCHER_SIZE = MAX_PAYMENT_PROOF_SIZE;
export const ALLOWED_PAYMENT_VOUCHER_TYPES = ALLOWED_PAYMENT_PROOF_TYPES;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePaymentVoucher(file: File): void {
  if (
    file.size <= 0 ||
    file.size > MAX_PAYMENT_VOUCHER_SIZE ||
    !(ALLOWED_PAYMENT_VOUCHER_TYPES as readonly string[]).includes(file.type)
  ) {
    throw new Error("Comprovante inválido. Envie JPG, PNG ou PDF de até 5 MB.");
  }
}

function sanitizePathPrefix(pathPrefix: string): string {
  const sanitizedSegments = pathPrefix
    .split(/[/\\]+/)
    .map((segment) => sanitizeFilename(segment))
    .filter(Boolean);

  const sanitizedPrefix = sanitizedSegments.join("/");
  if (sanitizedPrefix !== SUBSCRIPTIONS_PREFIX) {
    throw new Error("Destino de comprovante não permitido");
  }

  return sanitizedPrefix;
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
  validatePaymentVoucher(file);
  const authenticatedUserId = userId
    ? await assertCurrentUserId(userId)
    : await requireAuthenticatedUserId();

  const sanitizedName = sanitizeFilename(file.name);
  const finalName = sanitizedName || `file-${Date.now()}`;
  const fileExt = finalName.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const randomId = generateSecureToken(8);
  const fileName = `${timestamp}-${randomId}.${fileExt}`;
  const filePath = `${sanitizePathPrefix(pathPrefix)}/${authenticatedUserId}/${fileName}`;

  const { error: uploadError } = await uploadStorageFile(STORAGE_BUCKET, filePath, file, {
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(`Falha no upload: ${uploadError.message}`);
  }

  // Return only the private object path. A public or long-lived signed URL must
  // never be persisted as payment evidence.
  return filePath;
}

/** Remove only a just-uploaded subscription voucher owned by this session. */
export async function deletePaymentVoucher(
  filePath: string,
  userId?: string,
): Promise<void> {
  const authenticatedUserId = userId
    ? await assertCurrentUserId(userId)
    : await requireAuthenticatedUserId();
  const prefix = "subscriptions/" + authenticatedUserId.toLowerCase() + "/";
  const normalizedPath = filePath.toLowerCase();
  const filename = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : "";
  if (
    !UUID_PATTERN.test(authenticatedUserId) ||
    !/^[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$/.test(filename)
  ) {
    throw new Error("Destino de comprovante não permitido");
  }

  const { error } = await removeStorageFiles(STORAGE_BUCKET, [filePath]);
  if (error) throw new Error("Falha ao remover comprovante: " + error.message);
}
