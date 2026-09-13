import type { PaymentFile } from "@/types/manual-payment";

interface PaymentFileUploadEnvelope {
  file?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePaymentFileUploadResponse(
  value: unknown,
  expected: {
    paymentId: string;
    userId: string;
  },
): PaymentFile {
  if (!isRecord(value)) {
    throw new Error("Payment proof upload did not return a valid file record");
  }

  const envelope = value as PaymentFileUploadEnvelope;
  if (!isRecord(envelope.file)) {
    throw new Error("Payment proof upload did not return a valid file record");
  }

  const file = envelope.file;
  const expectedPrefix = `${expected.paymentId}/`;

  if (
    typeof file.id !== "string" ||
    file.id.length === 0 ||
    file.payment_id !== expected.paymentId ||
    file.uploaded_by !== expected.userId ||
    typeof file.file_name !== "string" ||
    file.file_name.length === 0 ||
    typeof file.file_path !== "string" ||
    !file.file_path.startsWith(expectedPrefix) ||
    file.file_path.includes("..") ||
    typeof file.file_size !== "number" ||
    !Number.isFinite(file.file_size) ||
    file.file_size <= 0 ||
    typeof file.file_type !== "string" ||
    file.file_type.length === 0 ||
    (file.thumbnail_path !== undefined &&
      file.thumbnail_path !== null &&
      typeof file.thumbnail_path !== "string") ||
    typeof file.created_at !== "string" ||
    file.created_at.length === 0
  ) {
    throw new Error("Payment proof upload did not return a valid file record");
  }

  return file as unknown as PaymentFile;
}
