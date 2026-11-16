import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { fetchActiveSubscriptionDetails } from "@/services/subscriptions/subscription-details-service";
import { MAX_CURATED_SUBSCRIPTION_MODELS } from "@/services/subscriptions/subscription-model-selection";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";

type SubscriptionRow = Tables<"subscriptions">;
type DeliveryRow = Tables<"subscription_deliveries">;
type SubscriptionStatus = SubscriptionRow["status"];
const tonart = supabase as unknown as SupabaseClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TonartPlanDelivery = {
  id: string;
  subscriptionId: string;
  status: string;
  deliveryNumber: number;
  trackingCode: string | null;
  modelSlug: string | null;
  productionStartedAt: string | null;
  deliveryDate: string | null;
  shippingDate: string | null;
  expectedDeliveryDate: string | null;
};

export type TonartPlanHistoryEntry = {
  id: string;
  planType: string;
  status: string;
  paymentStatus: string;
  totalPaid: number | null;
  planName: string;
  pieceCount: number | null;
  createdAt: string;
  collectionId: string | null;
  collectionName: string | null;
  selectedModelSlugs: string[];
  collectionModelSlugs: string[];
  snapshot: {
    planName: string;
    pieceCount: number;
    totalPriceBrl: number;
    paymentMethod: string;
    coinBonusPerShipment: number;
    coinBonusCap: number;
    modelChangeCutoffDays: number;
  } | null;
  deliveries: TonartPlanDelivery[];
};

function requireRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function requireSlugArray(value: unknown, code: string): string[] {
  if (!Array.isArray(value) || value.length > MAX_CURATED_SUBSCRIPTION_MODELS) throw new Error(code);
  const slugs = value.filter((item): item is string => typeof item === "string");
  if (slugs.length !== value.length || slugs.some((slug) => !/^[a-z0-9][a-z0-9-]{0,239}$/.test(slug))) {
    throw new Error(code);
  }
  return slugs;
}

function requireNonNegativeCents(value: unknown, code: string): number {
  try {
    const cents = decimalToHundredths(String(value));
    if (cents < 0) throw new Error(code);
    return cents;
  } catch {
    throw new Error(code);
  }
}

/** Reads current contracts and legacy subscription history from the same customer-owned tables. */
export async function listMyTonartPlanHistory(userId: string): Promise<TonartPlanHistoryEntry[]> {
  await assertCurrentUserId(userId);
  const { data, error } = await tonart
    .from("subscriptions")
    .select("id,collection_id,plan_type,status,payment_status,total_paid,deliveries_total,created_at,selected_model_slugs,collection_model_slugs_snapshot,plan_snapshot,collections(name),subscription_plans(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const subscriptionRows = (data ?? []).map((raw: unknown) => {
    const row = requireRecord(raw, "tonart_plan_history_invalid");
    const snapshotValue = row.plan_snapshot == null
      ? null
      : requireRecord(row.plan_snapshot, "tonart_plan_snapshot_invalid");
    const pieceCount = snapshotValue ? Number(snapshotValue.piece_count) : Number(row.deliveries_total);
    const totalPriceCents = snapshotValue
      ? requireNonNegativeCents(snapshotValue.total_price_brl, "tonart_plan_snapshot_invalid")
      : null;
    const cutoff = snapshotValue ? Number(snapshotValue.model_change_cutoff_days) : null;
    const coinBonusPerShipmentCents = snapshotValue
      ? requireNonNegativeCents(snapshotValue.coin_bonus_per_shipment, "tonart_plan_snapshot_invalid")
      : null;
    const coinBonusCapCents = snapshotValue
      ? requireNonNegativeCents(snapshotValue.coin_bonus_cap, "tonart_plan_snapshot_invalid")
      : null;
    const selectedModelSlugs = requireSlugArray(row.selected_model_slugs, "tonart_plan_selection_invalid");
    const collectionModelSlugs = requireSlugArray(row.collection_model_slugs_snapshot, "tonart_plan_curation_invalid");
    if (
      typeof row.id !== "string" || !UUID.test(row.id) ||
      typeof row.plan_type !== "string" || typeof row.status !== "string" ||
      typeof row.payment_status !== "string" || typeof row.created_at !== "string" ||
      (snapshotValue && (!Number.isInteger(pieceCount) || ![1, 3, 6, 12].includes(pieceCount))) ||
      (!snapshotValue && row.deliveries_total != null && (!Number.isInteger(pieceCount) || pieceCount < 1 || pieceCount > 24)) ||
      (totalPriceCents !== null && totalPriceCents <= 0) ||
      (cutoff !== null && (!Number.isInteger(cutoff) || cutoff < 1 || cutoff > 365)) ||
      (snapshotValue && selectedModelSlugs.length !== pieceCount) ||
      (snapshotValue && new Set(selectedModelSlugs).size !== pieceCount) ||
      new Set(collectionModelSlugs).size !== collectionModelSlugs.length ||
      (snapshotValue && selectedModelSlugs.some((slug) => !collectionModelSlugs.includes(slug))) ||
      (snapshotValue && (typeof snapshotValue.plan_name !== "string" || typeof snapshotValue.payment_method !== "string")) ||
      (coinBonusCapCents !== null && coinBonusPerShipmentCents !== null && coinBonusCapCents < coinBonusPerShipmentCents)
    ) {
      throw new Error("tonart_plan_snapshot_invalid");
    }
    const collectionValue = Array.isArray(row.collections) ? row.collections[0] : row.collections;
    const collection = collectionValue && typeof collectionValue === "object"
      ? collectionValue as Record<string, unknown>
      : null;
    const planValue = Array.isArray(row.subscription_plans) ? row.subscription_plans[0] : row.subscription_plans;
    const plan = planValue && typeof planValue === "object" ? planValue as Record<string, unknown> : null;
    return {
      id: row.id,
      collectionId: typeof row.collection_id === "string" ? row.collection_id : null,
      collectionName: typeof collection?.name === "string" ? collection.name : null,
      planType: row.plan_type,
      status: row.status,
      paymentStatus: row.payment_status,
      totalPaid: row.total_paid == null
        ? null
        : requireNonNegativeCents(row.total_paid, "tonart_plan_history_invalid") / 100,
      planName: snapshotValue && typeof snapshotValue.plan_name === "string"
        ? snapshotValue.plan_name
        : typeof plan?.name === "string" ? plan.name : row.plan_type,
      pieceCount: Number.isInteger(pieceCount) && pieceCount > 0 ? pieceCount : null,
      createdAt: row.created_at,
      selectedModelSlugs,
      collectionModelSlugs,
      snapshot: snapshotValue ? {
        planName: snapshotValue.plan_name as string,
        pieceCount,
        totalPriceBrl: (totalPriceCents as number) / 100,
        paymentMethod: snapshotValue.payment_method as string,
        coinBonusPerShipment: (coinBonusPerShipmentCents as number) / 100,
        coinBonusCap: (coinBonusCapCents as number) / 100,
        modelChangeCutoffDays: cutoff as number,
      } : null,
    };
  });
  if (subscriptionRows.length === 0) return [];

  const { data: deliveryData, error: deliveryError } = await tonart
    .from("subscription_deliveries")
    .select("id,subscription_id,status,delivery_number,delivery_order,tracking_code,catalog_model_slug,production_started_at,delivery_date,shipping_date,expected_delivery_date")
    .in("subscription_id", subscriptionRows.map((row) => row.id))
    .order("delivery_number", { ascending: true, nullsFirst: false })
    .order("delivery_order", { ascending: true, nullsFirst: false });
  if (deliveryError) throw deliveryError;

  const deliveriesBySubscription = new Map<string, TonartPlanDelivery[]>();
  for (const raw of deliveryData ?? []) {
    const row = requireRecord(raw, "tonart_plan_delivery_invalid");
    const deliveryNumber = Number(row.delivery_number ?? row.delivery_order);
    if (
      typeof row.id !== "string" || !UUID.test(row.id) ||
      typeof row.subscription_id !== "string" || !UUID.test(row.subscription_id) ||
      typeof row.status !== "string" || !Number.isInteger(deliveryNumber) || deliveryNumber < 1
    ) throw new Error("tonart_plan_delivery_invalid");
    const delivery: TonartPlanDelivery = {
      id: row.id,
      subscriptionId: row.subscription_id,
      status: row.status,
      deliveryNumber,
      trackingCode: typeof row.tracking_code === "string" ? row.tracking_code : null,
      modelSlug: typeof row.catalog_model_slug === "string" ? row.catalog_model_slug : null,
      productionStartedAt: typeof row.production_started_at === "string" ? row.production_started_at : null,
      deliveryDate: typeof row.delivery_date === "string" ? row.delivery_date : null,
      shippingDate: typeof row.shipping_date === "string" ? row.shipping_date : null,
      expectedDeliveryDate: typeof row.expected_delivery_date === "string" ? row.expected_delivery_date : null,
    };
    deliveriesBySubscription.set(row.subscription_id, [
      ...(deliveriesBySubscription.get(row.subscription_id) ?? []),
      delivery,
    ]);
  }

  return subscriptionRows.map((row) => ({
    ...row,
    deliveries: deliveriesBySubscription.get(row.id) ?? [],
  }));
}

/** Calls the server-locked, contract-scoped model-choice RPC. */
export async function changeMyTonartPlanDeliveryModel(input: {
  deliveryId: string;
  modelSlug: string;
}): Promise<{ deliveryId: string; modelSlug: string; idempotent: boolean }> {
  if (!UUID.test(input.deliveryId) || !/^[a-z0-9][a-z0-9-]{0,239}$/.test(input.modelSlug)) {
    throw new Error("tonart_plan_model_change_input_invalid");
  }
  await requireAuthenticatedUserId();
  const { data, error } = await tonart.rpc("change_subscription_delivery_model_for_current_user", {
    p_delivery_id: input.deliveryId,
    p_new_model_slug: input.modelSlug,
    p_ip_address: null,
    p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 500),
  });
  if (error) throw error;
  const result = requireRecord(data, "tonart_plan_model_change_result_invalid");
  const delivery = requireRecord(result.delivery, "tonart_plan_model_change_result_invalid");
  if (delivery.id !== input.deliveryId || delivery.catalog_model_slug !== input.modelSlug) {
    throw new Error("tonart_plan_model_change_result_invalid");
  }
  return {
    deliveryId: input.deliveryId,
    modelSlug: input.modelSlug,
    idempotent: result.idempotent === true,
  };
}

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
