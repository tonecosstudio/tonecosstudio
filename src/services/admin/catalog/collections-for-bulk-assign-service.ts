import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

export interface CollectionForBulkAssign {
  id: string;
  name: string;
  slug: string | null;
  price_full: number;
  tier_id: string | null;
  tier_name: string | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(row: UnknownRecord, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid bulk assignment snapshot: ${field}`);
  }
  return value;
}

function nullableString(row: UnknownRecord, field: string): string | null {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Invalid bulk assignment snapshot: ${field}`);
  }
  return value;
}

function requirePrice(row: UnknownRecord): number {
  const value = row.price_full;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Invalid bulk assignment snapshot: price_full");
  }
  return value;
}

function parseCollection(value: unknown): CollectionForBulkAssign {
  if (!isRecord(value)) {
    throw new Error("Invalid bulk assignment snapshot row");
  }

  return {
    id: requireString(value, "id"),
    name: requireString(value, "name"),
    slug: nullableString(value, "slug"),
    price_full: requirePrice(value),
    tier_id: nullableString(value, "tier_id"),
    tier_name: nullableString(value, "tier_name"),
  };
}

export async function fetchCollectionsForBulkAssign(): Promise<CollectionForBulkAssign[]> {
  const snapshot = await callAdminRpc<unknown>("admin_get_collections_for_bulk_assign");

  if (!Array.isArray(snapshot)) {
    throw new Error("Invalid bulk assignment snapshot");
  }

  return snapshot.map(parseCollection);
}
