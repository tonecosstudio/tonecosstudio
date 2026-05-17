import { useQuery } from "@tanstack/react-query";
import { fetchOrderStatusHistory } from "@/services/admin/orders-service";

export function useOrderStatusHistory(orderId: string, orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment") {
  return useQuery({
    queryKey: ["order-status-history", orderId, orderType],
    queryFn: () => fetchOrderStatusHistory(orderId, orderType),
    staleTime: 30000,
  });
}

