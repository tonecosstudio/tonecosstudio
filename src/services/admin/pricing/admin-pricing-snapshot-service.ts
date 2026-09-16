import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type { PurchaseMode } from "@/types/pricing-restructure";

export interface AdminPricingTierSnapshotRow {
  id: string;
  name: string;
  description: string | null;
  price_brl: number;
  price_full: number | null;
  price_pix: number | null;
  deposit_amount: number | null;
  is_active: boolean | null;
  is_default: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSubscriptionPlanSnapshotRow {
  id: string;
  pricing_tier_id: string | null;
  name: string;
  description: string | null;
  price: number;
  price_full: number | null;
  price_pix: number | null;
  plan_type: string | null;
  billing_interval: string | null;
  collections_count: number;
  deliveries_total: number | null;
  deliveries_per_cycle: number | null;
  coins_included: number | null;
  total_credits: number | null;
  slug: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPricingCollectionSnapshotRow {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  is_price_custom: boolean;
}

export interface AdminCollectionTierAssignmentSnapshotRow {
  id: string;
  collection_id: string;
  tier_id: string;
  created_at: string;
}

export interface AdminTierCountSnapshotRow {
  tier_id: string;
  count: number;
}

export interface AdminPlanCountSnapshotRow {
  plan_id: string;
  count: number;
}

export interface AdminPricingSnapshot {
  tiers: AdminPricingTierSnapshotRow[];
  plans: AdminSubscriptionPlanSnapshotRow[];
  purchase_modes: PurchaseMode[];
  collections: AdminPricingCollectionSnapshotRow[];
  collection_assignments: AdminCollectionTierAssignmentSnapshotRow[];
  assignment_counts: AdminTierCountSnapshotRow[];
  active_subscription_counts: AdminPlanCountSnapshotRow[];
}

const PURCHASE_MODE_KEYS = new Set<PurchaseMode["mode_key"]>([
  "standalone",
  "trimestral",
  "semestral",
  "anual",
]);

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requireString(value, label);
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableNumber(value: unknown, label: string): number | null {
  if (value === null) return null;
  return requireNumber(value, label);
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableBoolean(value: unknown, label: string): boolean | null {
  if (value === null) return null;
  return requireBoolean(value, label);
}

function requireNonNegativeInteger(value: unknown, label: string): number {
  const parsed = requireNumber(value, label);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} returned invalid data`);
  }

  return parsed;
}

function requirePositiveInteger(value: unknown, label: string): number {
  const parsed = requireNonNegativeInteger(value, label);
  if (parsed < 1) {
    throw new Error(`${label} returned invalid data`);
  }

  return parsed;
}

function parseTier(value: unknown): AdminPricingTierSnapshotRow {
  const row = requireRecord(value, "Pricing tier snapshot");

  return {
    id: requireString(row.id, "Pricing tier id"),
    name: requireString(row.name, "Pricing tier name"),
    description: requireNullableString(row.description, "Pricing tier description"),
    price_brl: requireNumber(row.price_brl, "Pricing tier price_brl"),
    price_full: requireNullableNumber(row.price_full, "Pricing tier price_full"),
    price_pix: requireNullableNumber(row.price_pix, "Pricing tier price_pix"),
    deposit_amount: requireNullableNumber(row.deposit_amount, "Pricing tier deposit_amount"),
    is_active: requireNullableBoolean(row.is_active, "Pricing tier is_active"),
    is_default: requireBoolean(row.is_default, "Pricing tier is_default"),
    display_order: requireNullableNumber(row.display_order, "Pricing tier display_order"),
    created_at: requireString(row.created_at, "Pricing tier created_at"),
    updated_at: requireString(row.updated_at, "Pricing tier updated_at"),
  };
}

function parsePlan(value: unknown): AdminSubscriptionPlanSnapshotRow {
  const row = requireRecord(value, "Subscription plan snapshot");

  return {
    id: requireString(row.id, "Subscription plan id"),
    pricing_tier_id: requireNullableString(row.pricing_tier_id, "Subscription plan pricing_tier_id"),
    name: requireString(row.name, "Subscription plan name"),
    description: requireNullableString(row.description, "Subscription plan description"),
    price: requireNumber(row.price, "Subscription plan price"),
    price_full: requireNullableNumber(row.price_full, "Subscription plan price_full"),
    price_pix: requireNullableNumber(row.price_pix, "Subscription plan price_pix"),
    plan_type: requireNullableString(row.plan_type, "Subscription plan plan_type"),
    billing_interval: requireNullableString(row.billing_interval, "Subscription plan billing_interval"),
    collections_count: requireNonNegativeInteger(
      row.collections_count,
      "Subscription plan collections_count",
    ),
    deliveries_total: requireNullableNumber(
      row.deliveries_total,
      "Subscription plan deliveries_total",
    ),
    deliveries_per_cycle: requireNullableNumber(
      row.deliveries_per_cycle,
      "Subscription plan deliveries_per_cycle",
    ),
    coins_included: requireNullableNumber(row.coins_included, "Subscription plan coins_included"),
    total_credits: requireNullableNumber(row.total_credits, "Subscription plan total_credits"),
    slug: requireNullableString(row.slug, "Subscription plan slug"),
    is_active: requireBoolean(row.is_active, "Subscription plan is_active"),
    display_order: requireNullableNumber(row.display_order, "Subscription plan display_order"),
    created_at: requireString(row.created_at, "Subscription plan created_at"),
    updated_at: requireString(row.updated_at, "Subscription plan updated_at"),
  };
}

function parsePurchaseMode(value: unknown): PurchaseMode {
  const row = requireRecord(value, "Purchase mode snapshot");
  const modeKey = requireString(row.mode_key, "Purchase mode key") as PurchaseMode["mode_key"];

  if (!PURCHASE_MODE_KEYS.has(modeKey)) {
    throw new Error("Purchase mode snapshot returned invalid mode_key");
  }

  return {
    id: requireString(row.id, "Purchase mode id"),
    mode_key: modeKey,
    name: requireString(row.name, "Purchase mode name"),
    description: requireNullableString(row.description, "Purchase mode description"),
    price_multiplier: requireNumber(row.price_multiplier, "Purchase mode price_multiplier"),
    collections_count: requirePositiveInteger(row.collections_count, "Purchase mode collections_count"),
    deliveries_total: requirePositiveInteger(row.deliveries_total, "Purchase mode deliveries_total"),
    includes_bonus: requireBoolean(row.includes_bonus, "Purchase mode includes_bonus"),
    is_active: requireBoolean(row.is_active, "Purchase mode is_active"),
    display_order: requireNonNegativeInteger(row.display_order, "Purchase mode display_order"),
    created_at: requireString(row.created_at, "Purchase mode created_at"),
    updated_at: requireString(row.updated_at, "Purchase mode updated_at"),
  };
}

function parseCollection(value: unknown): AdminPricingCollectionSnapshotRow {
  const row = requireRecord(value, "Pricing collection snapshot");

  return {
    id: requireString(row.id, "Pricing collection id"),
    name: requireString(row.name, "Pricing collection name"),
    slug: requireNullableString(row.slug, "Pricing collection slug"),
    is_active: requireBoolean(row.is_active, "Pricing collection is_active"),
    is_price_custom: requireBoolean(row.is_price_custom, "Pricing collection is_price_custom"),
  };
}

function parseAssignment(value: unknown): AdminCollectionTierAssignmentSnapshotRow {
  const row = requireRecord(value, "Collection tier assignment snapshot");

  return {
    id: requireString(row.id, "Collection tier assignment id"),
    collection_id: requireString(row.collection_id, "Collection tier assignment collection_id"),
    tier_id: requireString(row.tier_id, "Collection tier assignment tier_id"),
    created_at: requireString(row.created_at, "Collection tier assignment created_at"),
  };
}

function parseTierCount(value: unknown): AdminTierCountSnapshotRow {
  const row = requireRecord(value, "Pricing tier assignment count");
  return {
    tier_id: requireString(row.tier_id, "Pricing tier assignment id"),
    count: requireNonNegativeInteger(row.count, "Pricing tier assignment count"),
  };
}

function parsePlanCount(value: unknown): AdminPlanCountSnapshotRow {
  const row = requireRecord(value, "Pricing tier subscription count");
  return {
    plan_id: requireString(row.plan_id, "Pricing tier subscription plan id"),
    count: requireNonNegativeInteger(row.count, "Pricing tier subscription count"),
  };
}

export function parseAdminPricingSnapshot(value: unknown): AdminPricingSnapshot {
  const snapshot = requireRecord(value, "Pricing snapshot");

  return {
    tiers: requireArray(snapshot.tiers, "Pricing snapshot tiers").map(parseTier),
    plans: requireArray(snapshot.plans, "Pricing snapshot plans").map(parsePlan),
    purchase_modes: requireArray(snapshot.purchase_modes, "Pricing snapshot purchase modes").map(
      parsePurchaseMode,
    ),
    collections: requireArray(snapshot.collections, "Pricing snapshot collections").map(
      parseCollection,
    ),
    collection_assignments: requireArray(
      snapshot.collection_assignments,
      "Pricing snapshot collection assignments",
    ).map(parseAssignment),
    assignment_counts: requireArray(
      snapshot.assignment_counts,
      "Pricing snapshot assignment counts",
    ).map(parseTierCount),
    active_subscription_counts: requireArray(
      snapshot.active_subscription_counts,
      "Pricing snapshot active subscription counts",
    ).map(parsePlanCount),
  };
}

export async function fetchAdminPricingSnapshot(
  tierId?: string | null,
): Promise<AdminPricingSnapshot> {
  const value = await callAdminRpc<unknown>("admin_get_pricing_tiers_snapshot", {
    p_tier_id: tierId ?? null,
  });

  return parseAdminPricingSnapshot(value);
}
