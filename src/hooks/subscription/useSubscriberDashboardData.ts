import { useQuery } from "@tanstack/react-query";
import {
  listActiveSubscriberSubscriptions,
  listSubscriberDeliveries,
} from "@/services/customer/subscriber-dashboard-service";

export type { SubscriberDelivery } from "@/services/customer/subscriber-dashboard-service";

export function useSubscriberDashboardData(userId?: string) {
  const subscriptionsQuery = useQuery({
    queryKey: ["my-subscriptions", userId],
    enabled: Boolean(userId),
    queryFn: () => listActiveSubscriberSubscriptions(userId as string),
  });

  const deliveriesQuery = useQuery({
    queryKey: ["my-deliveries", userId],
    enabled: Boolean(userId) && (subscriptionsQuery.data?.length ?? 0) > 0,
    queryFn: () =>
      listSubscriberDeliveries(subscriptionsQuery.data?.map((subscription) => subscription.id) ?? []),
  });

  const subscription = subscriptionsQuery.data?.[0];
  const deliveries = deliveriesQuery.data || [];
  const completed = deliveries.filter((delivery) => delivery.status === "delivered");
  const upcoming = deliveries.filter((delivery) => delivery.status !== "delivered");
  const nextDelivery = upcoming[0];
  const progress = subscription
    ? Math.round((subscription.deliveries_completed / (subscription.deliveries_total || 1)) * 100)
    : 0;

  return {
    subscription,
    deliveries,
    completed,
    upcoming,
    nextDelivery,
    progress,
    isLoading: subscriptionsQuery.isLoading || deliveriesQuery.isLoading,
  };
}
