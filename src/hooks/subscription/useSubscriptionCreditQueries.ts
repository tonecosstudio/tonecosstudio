import { useQuery } from "@tanstack/react-query";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";

export function useSubscriptionCreditTransactions(enabled: boolean) {
  return useQuery({
    queryKey: ["subscription-credit", "transactions"],
    queryFn: () => subscriptionCreditAPI.getCreditTransactions(1, 50),
    enabled,
  });
}

export function useAutomaticSubscriptionOrder(subscriptionId: string) {
  const ordersQuery = useQuery({
    queryKey: ["subscription-credit", "orders", subscriptionId],
    queryFn: () => subscriptionCreditAPI.getUserOrders(),
  });

  const cycleQuery = useQuery({
    queryKey: ["subscription-credit", "current-cycle"],
    queryFn: () => subscriptionCreditAPI.getCurrentCycle(),
  });

  return {
    automaticOrder: ordersQuery.data?.orders.find((order) => order.order_type === "automatic"),
    cycle: cycleQuery.data,
    isLoading: ordersQuery.isLoading || cycleQuery.isLoading,
    error: ordersQuery.error || cycleQuery.error,
  };
}
