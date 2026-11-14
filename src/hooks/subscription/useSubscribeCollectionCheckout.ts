import { useQuery } from "@tanstack/react-query";
import {
  listSubscribeCollections,
  listSubscribePlans,
} from "@/services/subscriptions/subscription-checkout-service";

export type {
  SubscribeCollectionOption,
  SubscribePlan,
} from "@/services/subscriptions/subscription-checkout-service";

export function useSubscribeCollectionCheckout() {
  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: listSubscribePlans,
  });

  const collectionsQuery = useQuery({
    queryKey: ["active-collections"],
    queryFn: listSubscribeCollections,
  });

  const loadError = plansQuery.error ?? collectionsQuery.error ?? null;

  const retryLoad = () => {
    void plansQuery.refetch();
    void collectionsQuery.refetch();
  };

  return {
    plans: plansQuery.data,
    plansLoading: plansQuery.isLoading,
    collections: collectionsQuery.data,
    collectionsLoading: collectionsQuery.isLoading,
    loadError,
    retryLoad,
  };
}
