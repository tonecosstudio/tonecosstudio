import { validateFileUpload } from "@/lib/security/input-sanitizer";
import {
  ALLOWED_PAYMENT_VOUCHER_TYPES,
  MAX_PAYMENT_VOUCHER_SIZE,
  uploadPaymentVoucher,
} from "@/services/payments/payment-voucher-storage-service";

export function usePaymentVoucherStorage({
  userId,
  pathPrefix,
}: {
  userId?: string;
  pathPrefix: string;
}) {
  const validatePaymentVoucherFile = (file: File) =>
    validateFileUpload(file, ALLOWED_PAYMENT_VOUCHER_TYPES, MAX_PAYMENT_VOUCHER_SIZE);

  const uploadPaymentVoucherToStorage = (file: File) =>
    uploadPaymentVoucher({ file, userId, pathPrefix });

  return {
    validatePaymentVoucherFile,
    uploadPaymentVoucherToStorage,
  };
}
