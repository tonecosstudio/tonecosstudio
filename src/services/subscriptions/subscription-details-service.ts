import { supabase } from "@/integrations/supabase/client";
import {
  fetchActiveSubscriptionSummary,
  type ActiveSubscriptionSummary,
} from "@/services/subscriptions/subscription-summary-service";

export interface SubscriptionCollectionSummary {
  id: string;
  name: string;
  slug: string;
}

export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  price: number;
  billing_interval: string | null;
  deliveries_per_cycle: number | null;
}

export interface ActiveSubscriptionDetails extends ActiveSubscriptionSummary {
  collections_list: SubscriptionCollectionSummary[];
  plan: SubscriptionPlanSummary | null;
}

interface SubscriptionCollectionJoin {
  collections: SubscriptionCollectionSummary | null;
}

export async function fetchActiveSubscriptionDetails(
  userId: string,
): Promise<ActiveSubscriptionDetails | null> {
  const subscription = await fetchActiveSubscriptionSummary(userId);

  if (!subscription) {
    return null;
  }

  const [{ data: subscriptionCollections, error: collectionsError }, planQuery] = await Promise.all([
    supabase
      .from("subscription_collections")
      .select("collection_id, collections(id, name, slug)")
      .eq("subscription_id", subscription.id),
    subscription.plan_id
      ? supabase
          .from("subscription_plans")
          .select("id, name, price, billing_interval, deliveries_per_cycle")
          .eq("id", subscription.plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (collectionsError) {
    throw collectionsError;
  }

  if (planQuery.error) {
    throw planQuery.error;
  }

  return {
    ...subscription,
    collections_list:
      (subscriptionCollections as SubscriptionCollectionJoin[] | null)
        ?.map((item) => item.collections)
        .filter((collection): collection is SubscriptionCollectionSummary => Boolean(collection)) ??
      [],
    plan: planQuery.data,
  };
}
