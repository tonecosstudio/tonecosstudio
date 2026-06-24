import { getCurrentAdminPaymentsUserId } from "@/services/admin/payments/admin-payments-auth-service";

export function useAdminPaymentsAuth() {
  return {
    getCurrentAdminUserId: getCurrentAdminPaymentsUserId,
  };
}
