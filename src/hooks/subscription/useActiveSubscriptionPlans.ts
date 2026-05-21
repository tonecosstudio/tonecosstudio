import { useQuery } from "@tanstack/react-query";
import { listActiveSubscriptionPlans } from "@/services/subscription-plans-service";

export type { PublicSubscriptionPlan } from "@/services/subscription-plans-service";

export function useActiveSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: listActiveSubscriptionPlans,
  });
}
