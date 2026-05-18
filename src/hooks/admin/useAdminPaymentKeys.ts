import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminPaymentKeys,
  updateAdminPaymentKey,
  type PaymentKey,
} from "@/services/admin/admin-payment-keys-service";

export function useAdminPaymentKeys() {
  return useQuery({
    queryKey: ["payment-keys"],
    queryFn: fetchAdminPaymentKeys,
  });
}

export function useUpdateAdminPaymentKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminPaymentKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-keys"] });
    },
  });
}

export type { PaymentKey };
