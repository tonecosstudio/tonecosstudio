import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type { PurchaseMode } from "@/types/pricing-restructure";

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

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
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

export async function listAdminPurchaseModes(): Promise<PurchaseMode[]> {
  const value = await callAdminRpc<unknown>("admin_get_pricing_tiers_snapshot", {
    p_tier_id: null,
  });
  const snapshot = requireRecord(value, "Pricing snapshot");

  if (!Array.isArray(snapshot.purchase_modes)) {
    throw new Error("Pricing snapshot returned invalid purchase_modes");
  }

  return snapshot.purchase_modes.map(parsePurchaseMode);
}
