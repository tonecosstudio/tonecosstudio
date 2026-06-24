import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminUserCoinsBalance,
  listAdminUserMonthlySelections,
} from "@/services/admin/users/admin-user-details-service";
import { fetchActiveSubscriptionDetails } from "@/services/subscriptions/subscription-details-service";

interface UseUserSubscriptionProps {
  userId: string | undefined;
}

export function useUserSubscription({ userId }: UseUserSubscriptionProps) {
  const activeSubscriptionQuery = useQuery({
    queryKey: ["admin-user-active-subscription", userId],
    enabled: Boolean(userId),
    queryFn: () => (userId ? fetchActiveSubscriptionDetails(userId) : null),
  });

  const coinsBalanceQuery = useQuery({
    queryKey: ["admin-user-coins-balance", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchAdminUserCoinsBalance(userId),
  });

  const monthlySelectionsQuery = useQuery({
    queryKey: ["admin-user-monthly-selections", userId],
    enabled: Boolean(userId),
    queryFn: () => listAdminUserMonthlySelections(userId),
  });

  return {
    activeSubscription: activeSubscriptionQuery.data,
    coinsBalance: coinsBalanceQuery.data,
    monthlySelections: monthlySelectionsQuery.data || [],
    isLoading:
      activeSubscriptionQuery.isLoading ||
      coinsBalanceQuery.isLoading ||
      monthlySelectionsQuery.isLoading,
  };
}
