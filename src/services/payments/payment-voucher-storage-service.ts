import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  generateSecureToken,
  MAX_PAYMENT_PROOF_SIZE,
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

function getOwnedPathPrefix(pathPrefix: string, userId: string): string {
  if (pathPrefix === SUBSCRIPTIONS_PREFIX) {
    return `${SUBSCRIPTIONS_PREFIX}/${userId.toLowerCase()}`;
  }

  const quoteMatch = /^quotes:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    pathPrefix,
  );
  if (quoteMatch) {
    return `quotes/${userId.toLowerCase()}/${quoteMatch[1].toLowerCase()}`;
  }

  // Keep path parsing allowlisted; caller-controlled path segments are never copied.
  throw new Error("Destino de comprovante não permitido");
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

  const fileExt = file.type === "image/jpeg"
    ? "jpg"
    : file.type === "image/png"
      ? "png"
      : "pdf";
  const timestamp = Date.now();
  const randomId = generateSecureToken(8);
  const fileName = `${timestamp}-${randomId}.${fileExt}`;
  const filePath = `${getOwnedPathPrefix(pathPrefix, authenticatedUserId)}/${fileName}`;

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

/** Remove only a private voucher uploaded under this session's allowed namespace. */
export async function deletePaymentVoucher(
  filePath: string,
  userId?: string,
): Promise<void> {
  const authenticatedUserId = userId
    ? await assertCurrentUserId(userId)
    : await requireAuthenticatedUserId();
  const normalizedPath = filePath.toLowerCase();
  const ownerPrefix = authenticatedUserId.toLowerCase();
  const subscriptionMatch = new RegExp(
    `^subscriptions/${ownerPrefix}/([0-9]{10,16}-[0-9a-f]{16}\\.(jpg|jpeg|png|pdf))$`,
  ).exec(normalizedPath);
  const quoteMatch = new RegExp(
    `^quotes/${ownerPrefix}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([0-9]{10,16}-[0-9a-f]{16}\\.(jpg|jpeg|png|pdf))$`,
  ).exec(normalizedPath);
  if (
    !UUID_PATTERN.test(authenticatedUserId) ||
    (!subscriptionMatch && !quoteMatch)
  ) {
    throw new Error("Destino de comprovante não permitido");
  }

  const { error } = await removeStorageFiles(STORAGE_BUCKET, [filePath]);
  if (error) throw new Error("Falha ao remover comprovante: " + error.message);
}
