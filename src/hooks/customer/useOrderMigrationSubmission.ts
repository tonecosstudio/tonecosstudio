import { useMutation } from "@tanstack/react-query";
import { submitOrderMigrationRequest } from "@/services/customer/order-migration-service";

export function useOrderMigrationSubmission() {
  return useMutation({
    mutationFn: submitOrderMigrationRequest,
  });
}
