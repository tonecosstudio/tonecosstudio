import { useQuery } from "@tanstack/react-query";
import { listActiveSubscriptionPlans } from "@/services/subscriptions/subscription-plans-service";

export type { PublicSubscriptionPlan } from "@/services/subscriptions/subscription-plans-service";

export function useActiveSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: listActiveSubscriptionPlans,
  });
}
