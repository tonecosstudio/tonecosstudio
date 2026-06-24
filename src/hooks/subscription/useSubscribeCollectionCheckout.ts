import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSubscriptionCheckout,
  getSubscribeCollectionBySlug,
  listSubscribeCollections,
  listSubscribePlans,
} from "@/services/subscriptions/subscription-checkout-service";

export type {
  SubscribeCollectionOption,
  SubscribePlan,
  SubscriptionPaymentMethod,
} from "@/services/subscriptions/subscription-checkout-service";

export function useSubscribeCollectionCheckout(slug?: string) {
  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: listSubscribePlans,
  });

  const collectionsQuery = useQuery({
    queryKey: ["active-collections"],
    queryFn: listSubscribeCollections,
  });

  const initialCollectionQuery = useQuery({
    queryKey: ["collection", slug],
    enabled: Boolean(slug),
    queryFn: () => getSubscribeCollectionBySlug(slug as string),
  });

  const createCheckout = useMutation({
    mutationFn: createSubscriptionCheckout,
  });

  return {
    plans: plansQuery.data,
    plansLoading: plansQuery.isLoading,
    collections: collectionsQuery.data,
    collectionsLoading: collectionsQuery.isLoading,
    initialCollection: initialCollectionQuery.data,
    createCheckout,
  };
}
