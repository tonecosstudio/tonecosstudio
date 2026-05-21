import { useQuery } from "@tanstack/react-query";
import { fetchCustomerOrderProgress } from "@/services/customer/order-progress-service";

export type { CustomerOrderType } from "@/services/customer/order-progress-service";

export function useCustomerOrderProgress(orderId?: string, orderType?: string) {
  return useQuery({
    queryKey: ["customer-order-progress", orderId, orderType],
    queryFn: () => fetchCustomerOrderProgress(orderId ?? "", orderType ?? ""),
    enabled: !!orderId && !!orderType,
    refetchInterval: 30000,
  });
}
