import {
  markProductionComplete,
  cancelStandalonePurchase,
  approvePaymentVoucher,
  rejectPaymentVoucher,
} from "@/services/payments/standalone-purchase-service";

export function useStandalonePurchaseActions() {
  return {
    markProductionComplete,
    cancelStandalonePurchase,
    approvePaymentVoucher,
    rejectPaymentVoucher,
  };
}
