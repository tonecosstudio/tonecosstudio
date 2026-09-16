import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_SERVICE = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "pricing",
  "admin-pricing-snapshot-service.ts",
);
const PRICING_SERVICE = path.join(
  ROOT,
  "src",
  "services",
  "pricing",
  "pricing-tier-read-service.ts",
);
const ADMIN_PURCHASE_MODES_SERVICE = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "pricing",
  "purchase-modes-read-service.ts",
);
const BULK_ASSIGN_SERVICE = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "catalog",
  "collections-for-bulk-assign-service.ts",
);
const LEGACY_PURCHASE_MODES_SERVICE = path.join(
  ROOT,
  "src",
  "services",
  "payments",
  "purchase-modes-service.ts",
);
const ADMIN_RPC_EDGE = path.join(
  ROOT,
  "supabase",
  "functions",
  "admin-rpc",
  "index.ts",
);
const COMPLETE_SNAPSHOT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260916121355_expand_admin_pricing_snapshot_configuration.sql",
);
const BULK_ASSIGN_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260916122121_admin_bulk_assign_collections_snapshot.sql",
);
const SNAPSHOT_SERVICE_TEST = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "pricing",
  "admin-pricing-snapshot-service.test.ts",
);
const PRICING_SERVICE_TEST = path.join(
  ROOT,
  "src",
  "services",
  "pricing",
  "pricing-tier-read-service.test.ts",
);
const PURCHASE_MODES_TEST = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "pricing",
  "purchase-modes-read-service.test.ts",
);
const BULK_ASSIGN_TEST = path.join(
  ROOT,
  "src",
  "services",
  "admin",
  "catalog",
  "collections-for-bulk-assign-service.test.ts",
);

const failures = [];

function requireFile(filePath, label) {
  if (!existsSync(filePath)) {
    failures.push(`${label} is missing: ${path.relative(ROOT, filePath)}`);
    return "";
  }

  return readFileSync(filePath, "utf8");
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidMatch(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const snapshotSource = requireFile(SNAPSHOT_SERVICE, "Admin pricing snapshot service");
const pricingSource = requireFile(PRICING_SERVICE, "Pricing tier read service");
const purchaseModesSource = requireFile(
  ADMIN_PURCHASE_MODES_SERVICE,
  "Admin purchase modes read service",
);
const bulkAssignSource = requireFile(
  BULK_ASSIGN_SERVICE,
  "Bulk collection assignment read service",
);
const edgeSource = requireFile(ADMIN_RPC_EDGE, "Admin RPC edge gateway");
const migrationSource = requireFile(
  COMPLETE_SNAPSHOT_MIGRATION,
  "Complete pricing snapshot migration",
);
const bulkAssignMigrationSource = requireFile(
  BULK_ASSIGN_MIGRATION,
  "Bulk collection assignment snapshot migration",
);
const snapshotTestSource = requireFile(
  SNAPSHOT_SERVICE_TEST,
  "Admin pricing snapshot contract test",
);
const pricingTestSource = requireFile(PRICING_SERVICE_TEST, "Pricing tier read contract test");
const purchaseModesTestSource = requireFile(
  PURCHASE_MODES_TEST,
  "Purchase modes snapshot contract test",
);
const bulkAssignTestSource = requireFile(
  BULK_ASSIGN_TEST,
  "Bulk collection assignment snapshot contract test",
);

if (existsSync(LEGACY_PURCHASE_MODES_SERVICE)) {
  failures.push(
    "Legacy browser purchase-modes-service.ts must not be restored; admin purchase modes belong behind the canonical pricing snapshot",
  );
}

requireMatch(
  snapshotSource,
  /callAdminRpc<[^>]+>\(\s*["']admin_get_pricing_tiers_snapshot["']/,
  "The canonical snapshot service must own the admin_get_pricing_tiers_snapshot gateway call",
);
forbidMatch(
  snapshotSource,
  /@\/integrations\/supabase\/client|\.from\(\s*["'](?:pricing_tiers|subscription_plans|purchase_modes|collection_tier_assignments|collections)["']\s*\)/,
  "The canonical snapshot service must use the admin RPC boundary instead of browser table access",
);

for (const [label, source] of [
  ["Pricing tier read service", pricingSource],
  ["Admin purchase modes read service", purchaseModesSource],
]) {
  requireMatch(
    source,
    /fetchAdminPricingSnapshot/,
    `${label} must consume the canonical fetchAdminPricingSnapshot owner`,
  );
  forbidMatch(
    source,
    /callAdminRpc<[^>]+>\(\s*["']admin_get_pricing_tiers_snapshot["']/,
    `${label} must not create a parallel admin pricing RPC owner`,
  );
  forbidMatch(
    source,
    /@\/integrations\/supabase\/client|\.from\(\s*["'](?:pricing_tiers|subscription_plans|purchase_modes|collection_tier_assignments|collections)["']\s*\)/,
    `${label} must not read canonical admin pricing tables directly from the browser client`,
  );
}

requireMatch(
  bulkAssignSource,
  /callAdminRpc<[^>]+>\(\s*["']admin_get_collections_for_bulk_assign["']/,
  "Bulk collection assignment reads must use admin_get_collections_for_bulk_assign through callAdminRpc",
);
forbidMatch(
  bulkAssignSource,
  /@\/integrations\/supabase\/client|\.from\s*\(/,
  "Bulk collection assignment reads must not access Supabase tables directly from the browser client",
);

for (const rpcName of [
  "admin_get_pricing_tiers_snapshot",
  "admin_get_collections_for_bulk_assign",
]) {
  requireMatch(
    edgeSource,
    new RegExp(`["']${rpcName}["']`),
    `admin-rpc allowlist must include ${rpcName}`,
  );
}

requireMatch(
  migrationSource,
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\(/i,
  "Canonical admin pricing snapshot RPC migration is missing",
);
requireMatch(
  migrationSource,
  /SECURITY\s+DEFINER/i,
  "Canonical admin pricing snapshot RPC must retain its server-authoritative definer boundary",
);
requireMatch(
  migrationSource,
  /SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
  "Canonical admin pricing snapshot RPC must pin search_path",
);
requireMatch(
  migrationSource,
  /PERFORM\s+public\.assert_admin_access\s*\(\s*\)\s*;/i,
  "Canonical admin pricing snapshot RPC must assert admin access",
);
requireMatch(
  migrationSource,
  /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\([^)]*\)\s+FROM\s+authenticated/i,
  "Canonical admin pricing snapshot RPC must not be executable directly by authenticated browser role",
);
requireMatch(
  migrationSource,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\([^)]*\)\s+TO\s+service_role/i,
  "Canonical admin pricing snapshot RPC must be executable only through the service-role edge boundary",
);

for (const requiredFragment of [
  "'tiers'",
  "'plans'",
  "'purchase_modes'",
  "'collections'",
  "'collection_assignments'",
  "'assignment_counts'",
  "'active_subscription_counts'",
  "sp.pricing_tier_id",
  "sp.coins_included",
  "sp.total_credits",
  "FROM public.purchase_modes",
  "FROM public.collection_tier_assignments",
]) {
  if (!migrationSource.includes(requiredFragment)) {
    failures.push(`Complete pricing snapshot migration is missing ${requiredFragment}`);
  }
}

for (const [pattern, message] of [
  [
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_get_collections_for_bulk_assign\s*\(\s*\)/i,
    "Bulk collection assignment snapshot RPC migration is missing",
  ],
  [/SECURITY\s+DEFINER/i, "Bulk collection assignment snapshot RPC must be SECURITY DEFINER"],
  [
    /SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i,
    "Bulk collection assignment snapshot RPC must pin search_path",
  ],
  [
    /PERFORM\s+public\.assert_admin_access\s*\(\s*\)\s*;/i,
    "Bulk collection assignment snapshot RPC must assert admin access",
  ],
  [
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.admin_get_collections_for_bulk_assign\s*\(\s*\)\s+FROM\s+authenticated/i,
    "Bulk collection assignment snapshot RPC must not be executable directly by authenticated browser role",
  ],
  [
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.admin_get_collections_for_bulk_assign\s*\(\s*\)\s+TO\s+service_role/i,
    "Bulk collection assignment snapshot RPC must be executable through service_role only",
  ],
]) {
  requireMatch(bulkAssignMigrationSource, pattern, message);
}

for (const requiredFragment of [
  "default_price_full",
  "FROM public.collections",
  "public.collection_tier_assignments",
  "public.pricing_tiers",
  "c.is_active = true",
]) {
  if (!bulkAssignMigrationSource.includes(requiredFragment)) {
    failures.push(`Bulk collection assignment snapshot migration is missing ${requiredFragment}`);
  }
}

requireMatch(
  snapshotTestSource,
  /parseAdminPricingSnapshot/,
  "Canonical snapshot parser must have a direct contract regression",
);
requireMatch(
  snapshotTestSource,
  /admin_get_pricing_tiers_snapshot/,
  "Canonical snapshot test must verify the RPC name",
);
requireMatch(
  snapshotTestSource,
  /falha fechado|fail[- ]closed/i,
  "Canonical snapshot parser test must retain an invalid-payload fail-closed regression",
);
requireMatch(
  pricingTestSource,
  /falha fechado|fail[- ]closed/i,
  "Pricing tier read test must retain an invalid-payload fail-closed regression",
);
requireMatch(
  purchaseModesTestSource,
  /falha fechado|fail[- ]closed/i,
  "Purchase modes contract test must retain an invalid-payload fail-closed regression",
);
requireMatch(
  bulkAssignTestSource,
  /admin_get_collections_for_bulk_assign/,
  "Bulk collection assignment snapshot test must verify the canonical RPC name",
);
requireMatch(
  bulkAssignTestSource,
  /falha fechado|fail[- ]closed/i,
  "Bulk collection assignment snapshot test must retain an invalid-payload fail-closed regression",
);

if (failures.length > 0) {
  console.error("Pricing read authority audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Pricing read authority audit passed.");
