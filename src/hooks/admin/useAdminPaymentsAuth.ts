import { getCurrentAdminPaymentsUserId } from "@/services/admin/admin-payments-auth-service";

export function useAdminPaymentsAuth() {
  return {
    getCurrentAdminUserId: getCurrentAdminPaymentsUserId,
  };
}
