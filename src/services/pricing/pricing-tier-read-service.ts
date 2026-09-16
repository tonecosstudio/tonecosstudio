import {
  fetchAdminPricingSnapshot,
  type AdminPricingCollectionSnapshotRow,
  type AdminPricingTierSnapshotRow,
  type AdminSubscriptionPlanSnapshotRow,
} from "@/services/admin/pricing/admin-pricing-snapshot-service";
import type {
  PricingTierWithPlans,
  PurchaseMode,
  SubscriptionPlanWithTier,
} from "@/types/pricing-restructure";

export interface AssignmentPricingTier {
  id: string;
  name: string;
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  is_active: boolean;
}

export interface CollectionTierAssignmentWithTier {
  id: string;
  collection_id: string;
  tier_id: string;
  created_at: string;
  pricing_tiers: AssignmentPricingTier | null;
}

export interface CollectionByTierAssignment {
  id: string;
  collection_id: string;
  tier_id: string;
  created_at: string;
  collections: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    is_price_custom: boolean;
  } | null;
}

export interface AvailableCollectionForTier {
  id: string;
  name: string;
  slug: string;
  is_price_custom: boolean;
}

type PlanMode = SubscriptionPlanWithTier["plan_mode"];

function requireText(value: string | null | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Invalid pricing snapshot row: missing ${fieldName}`);
  }

  return value;
}

function normalizePlanMode(value: string | null | undefined): PlanMode {
  switch (value) {
    case "avulso":
    case "standalone":
      return "standalone";
    case "trimestral":
    case "semestral":
    case "anual":
      return value;
    default:
      throw new Error(`Modalidade de plano nao suportada no nivel: ${value ?? "ausente"}`);
  }
}

function buildPurchaseModeMap(rows: PurchaseMode[]): Map<PlanMode, PurchaseMode> {
  return new Map(rows.map((row) => [row.mode_key, row]));
}

function toSubscriptionPlanWithTier(
  row: AdminSubscriptionPlanSnapshotRow,
  purchaseModes: Map<PlanMode, PurchaseMode>,
): SubscriptionPlanWithTier {
  const tierId = requireText(row.pricing_tier_id, "plan.pricing_tier_id");
  const planMode = normalizePlanMode(row.plan_type ?? row.billing_interval);
  const mode = purchaseModes.get(planMode);
  const priceFull = row.price_full ?? row.price;

  return {
    id: row.id,
    tier_id: tierId,
    plan_mode: planMode,
    plan_type: row.plan_type ?? row.billing_interval ?? planMode,
    name: row.name,
    description: row.description,
    price_full: priceFull,
    price_pix: row.price_pix ?? priceFull,
    price_multiplier: mode?.price_multiplier ?? 1,
    collections_count: row.collections_count || mode?.collections_count || 1,
    deliveries_total:
      row.deliveries_total ?? row.deliveries_per_cycle ?? mode?.deliveries_total ?? 1,
    includes_bonus: mode?.includes_bonus ?? false,
    is_active: row.is_active,
    display_order: row.display_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPricingTierWithPlans(
  tier: AdminPricingTierSnapshotRow,
  plans: SubscriptionPlanWithTier[],
  assignedCollectionsCount: number,
  activeSubscriptionsCount: number,
): PricingTierWithPlans {
  const tierPriceBase = tier.price_full ?? tier.price_brl;

  return {
    tier_id: tier.id,
    tier_name: tier.name,
    tier_description: tier.description,
    tier_price_base: tierPriceBase,
    tier_price_pix_base: tier.price_pix ?? tierPriceBase,
    tier_deposit: tier.deposit_amount ?? 0,
    tier_is_active: tier.is_active ?? true,
    tier_is_default: tier.is_default,
    plans,
    assigned_collections_count: assignedCollectionsCount,
    total_active_subscriptions: activeSubscriptionsCount,
  };
}

function requireCollectionSlug(collection: AdminPricingCollectionSnapshotRow): string {
  return requireText(collection.slug, `collection ${collection.id}.slug`);
}

function toAssignmentTier(tier: AdminPricingTierSnapshotRow): AssignmentPricingTier {
  const priceFull = tier.price_full ?? tier.price_brl;

  return {
    id: tier.id,
    name: tier.name,
    price_full: priceFull,
    price_pix: tier.price_pix ?? priceFull,
    deposit_amount: tier.deposit_amount ?? 0,
    is_active: tier.is_active ?? true,
  };
}

export async function getCollectionTierAssignment(
  collectionId: string | null | undefined,
): Promise<CollectionTierAssignmentWithTier | null> {
  if (!collectionId) return null;

  const snapshot = await fetchAdminPricingSnapshot();
  const assignment = snapshot.collection_assignments.find(
    (row) => row.collection_id === collectionId,
  );

  if (!assignment) return null;

  const tier = snapshot.tiers.find((row) => row.id === assignment.tier_id);

  return {
    ...assignment,
    pricing_tiers: tier ? toAssignmentTier(tier) : null,
  };
}

export async function listCollectionsByTier(
  tierId: string | null | undefined,
): Promise<CollectionByTierAssignment[]> {
  if (!tierId) return [];

  const snapshot = await fetchAdminPricingSnapshot(tierId);
  const collectionsById = new Map(snapshot.collections.map((row) => [row.id, row]));

  return snapshot.collection_assignments.map((assignment) => {
    const collection = collectionsById.get(assignment.collection_id);

    return {
      ...assignment,
      collections: collection
        ? {
            id: collection.id,
            name: collection.name,
            slug: requireCollectionSlug(collection),
            is_active: collection.is_active,
            is_price_custom: collection.is_price_custom,
          }
        : null,
    };
  });
}

export async function listAvailableCollectionsForTier(): Promise<AvailableCollectionForTier[]> {
  const snapshot = await fetchAdminPricingSnapshot();

  return snapshot.collections
    .filter((collection) => collection.is_active)
    .map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: requireCollectionSlug(collection),
      is_price_custom: collection.is_price_custom,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getTierWithPlans(
  tierId: string | null | undefined,
): Promise<PricingTierWithPlans | null> {
  if (!tierId) return null;

  const snapshot = await fetchAdminPricingSnapshot(tierId);
  const tier = snapshot.tiers[0];
  if (!tier) return null;

  const purchaseModes = buildPurchaseModeMap(snapshot.purchase_modes);
  const plans = snapshot.plans.map((row) => toSubscriptionPlanWithTier(row, purchaseModes));
  const assignedCollectionsCount = snapshot.assignment_counts[0]?.count ?? 0;
  const activeSubscriptionsByPlan = new Map(
    snapshot.active_subscription_counts.map((row) => [row.plan_id, row.count]),
  );
  const activeSubscriptionsCount = snapshot.plans.reduce(
    (total, row) => total + (activeSubscriptionsByPlan.get(row.id) ?? 0),
    0,
  );

  return toPricingTierWithPlans(
    tier,
    plans,
    assignedCollectionsCount,
    activeSubscriptionsCount,
  );
}

export async function listAllTiersWithPlans(): Promise<PricingTierWithPlans[]> {
  const snapshot = await fetchAdminPricingSnapshot();
  const purchaseModes = buildPurchaseModeMap(snapshot.purchase_modes);
  const plansByTier = new Map<string, SubscriptionPlanWithTier[]>();
  const activeSubscriptionsByPlan = new Map(
    snapshot.active_subscription_counts.map((row) => [row.plan_id, row.count]),
  );
  const activeSubscriptionsByTier = new Map<string, number>();

  for (const row of snapshot.plans) {
    if (!row.pricing_tier_id) continue;

    const plan = toSubscriptionPlanWithTier(row, purchaseModes);
    const tierPlans = plansByTier.get(row.pricing_tier_id) ?? [];
    tierPlans.push(plan);
    plansByTier.set(row.pricing_tier_id, tierPlans);

    const activeCount = activeSubscriptionsByPlan.get(row.id) ?? 0;
    activeSubscriptionsByTier.set(
      row.pricing_tier_id,
      (activeSubscriptionsByTier.get(row.pricing_tier_id) ?? 0) + activeCount,
    );
  }

  const assignedCollectionsByTier = new Map(
    snapshot.assignment_counts.map((row) => [row.tier_id, row.count]),
  );

  return snapshot.tiers.map((tier) =>
    toPricingTierWithPlans(
      tier,
      plansByTier.get(tier.id) ?? [],
      assignedCollectionsByTier.get(tier.id) ?? 0,
      activeSubscriptionsByTier.get(tier.id) ?? 0,
    ),
  );
}
