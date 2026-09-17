import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { fetchActiveSubscriptionDetails } from "@/services/subscriptions/subscription-details-service";

type SubscriptionRow = Tables<"subscriptions">;
type DeliveryRow = Tables<"subscription_deliveries">;
type SubscriptionStatus = SubscriptionRow["status"];

export interface SubscriberCollectionSummary {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
}

export type SubscriberSubscription = Pick<
  SubscriptionRow,
  | "id"
  | "user_id"
  | "plan_type"
  | "status"
  | "deliveries_completed"
  | "deliveries_total"
  | "total_paid"
> & {
  collections: SubscriberCollectionSummary | null;
};

export type SubscriberDelivery = Pick<
  DeliveryRow,
  "id" | "status" | "delivery_number" | "delivery_order" | "tracking_code"
> & {
  collections: Pick<SubscriberCollectionSummary, "id" | "name"> | null;
  collection_characters: {
    name: string | null;
    description: string | null;
  } | null;
};

type DeliveryQueryRow = Omit<SubscriberDelivery, "collections" | "collection_characters"> & {
  collections:
    | Pick<SubscriberCollectionSummary, "id" | "name">
    | Pick<SubscriberCollectionSummary, "id" | "name">[]
    | null;
  collection_characters:
    | SubscriberDelivery["collection_characters"]
    | NonNullable<SubscriberDelivery["collection_characters"]>[]
    | null;
};

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "expired",
  "active",
  "cancelled",
  "suspended",
  "pending_payment",
]);

function requireSubscriptionStatus(value: string): SubscriptionStatus {
  if (SUBSCRIPTION_STATUSES.has(value as SubscriptionStatus)) {
    return value as SubscriptionStatus;
  }

  throw new Error(`Subscription returned invalid status: ${value}`);
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listActiveSubscriberSubscriptions(userId: string): Promise<SubscriberSubscription[]> {
  await assertCurrentUserId(userId);

  const subscription = await fetchActiveSubscriptionDetails(userId);
  if (!subscription) {
    return [];
  }

  return [
    {
      id: subscription.id,
      user_id: subscription.user_id,
      plan_type: subscription.plan_type,
      status: requireSubscriptionStatus(subscription.status),
      deliveries_completed: subscription.deliveries_completed,
      deliveries_total: subscription.deliveries_total,
      total_paid: subscription.total_paid,
      collections: subscription.collections_list[0] ?? null,
    },
  ];
}

export async function listSubscriberDeliveries(subscriptionIds: string[]): Promise<SubscriberDelivery[]> {
  if (subscriptionIds.length === 0) {
    return [];
  }

  const userId = await requireAuthenticatedUserId();

  const { data: ownedSubscriptions, error: ownedSubscriptionsError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("id", subscriptionIds);

  if (ownedSubscriptionsError) {
    throw ownedSubscriptionsError;
  }

  const ownedSubscriptionIds = (ownedSubscriptions ?? []).map((subscription) => subscription.id);

  if (ownedSubscriptionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("subscription_deliveries")
    .select(`
      id,
      status,
      delivery_number,
      delivery_order,
      tracking_code,
      collection_characters (
        name,
        description
      ),
      collections (
        id,
        name
      )
    `)
    .in("subscription_id", ownedSubscriptionIds)
    .order("delivery_order", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DeliveryQueryRow[]).map((delivery) => ({
    ...delivery,
    collections: firstRelation(delivery.collections),
    collection_characters: firstRelation(delivery.collection_characters),
  }));
}
