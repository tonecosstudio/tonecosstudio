import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
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
const SNAPSHOT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260916114459_admin_pricing_tier_snapshot_rpc.sql",
);
const EXPANDED_SNAPSHOT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260916120926_expand_admin_pricing_snapshot_purchase_modes.sql",
);
const SNAPSHOT_TEST = path.join(
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

const pricingSource = requireFile(PRICING_SERVICE, "Pricing tier read service");
const purchaseModesSource = requireFile(
  ADMIN_PURCHASE_MODES_SERVICE,
  "Admin purchase modes read service",
);
const edgeSource = requireFile(ADMIN_RPC_EDGE, "Admin RPC edge gateway");
const migrationSource = requireFile(SNAPSHOT_MIGRATION, "Pricing snapshot migration");
const expandedMigrationSource = requireFile(
  EXPANDED_SNAPSHOT_MIGRATION,
  "Expanded pricing snapshot migration",
);
const testSource = requireFile(SNAPSHOT_TEST, "Pricing snapshot contract test");
const purchaseModesTestSource = requireFile(
  PURCHASE_MODES_TEST,
  "Purchase modes snapshot contract test",
);

if (existsSync(LEGACY_PURCHASE_MODES_SERVICE)) {
  failures.push(
    "Legacy browser purchase-modes-service.ts must not be restored; admin purchase modes belong behind the canonical pricing snapshot",
  );
}

forbidMatch(
  pricingSource,
  /\.from\(\s*["'](?:pricing_tiers|subscription_plans|purchase_modes)["']\s*\)/,
  "Admin pricing aggregate must not read pricing_tiers, subscription_plans, or purchase_modes directly from the browser client",
);
forbidMatch(
  purchaseModesSource,
  /\.from\(\s*["']purchase_modes["']\s*\)/,
  "Admin purchase modes must not read purchase_modes directly from the browser client",
);
requireMatch(
  pricingSource,
  /callAdminRpc<[^>]+>\(\s*["']admin_get_pricing_tiers_snapshot["']/,
  "Admin pricing aggregate must use admin_get_pricing_tiers_snapshot through callAdminRpc",
);
requireMatch(
  purchaseModesSource,
  /callAdminRpc<[^>]+>\(\s*["']admin_get_pricing_tiers_snapshot["']/,
  "Admin purchase modes must use admin_get_pricing_tiers_snapshot through callAdminRpc",
);
requireMatch(
  edgeSource,
  /["']admin_get_pricing_tiers_snapshot["']/,
  "admin-rpc allowlist must include admin_get_pricing_tiers_snapshot",
);
requireMatch(
  migrationSource,
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\(/i,
  "Canonical admin pricing snapshot RPC migration is missing",
);
requireMatch(
  migrationSource,
  /PERFORM\s+public\.assert_admin_access\s*\(\s*\)\s*;/i,
  "Canonical admin pricing snapshot RPC must assert admin access",
);
requireMatch(
  migrationSource,
  /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\([^)]*\)\s+FROM\s+[^;]*\bauthenticated\b/i,
  "Canonical admin pricing snapshot RPC must not be executable directly by authenticated browser role",
);
requireMatch(
  migrationSource,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.admin_get_pricing_tiers_snapshot\s*\([^)]*\)\s+TO\s+service_role/i,
  "Canonical admin pricing snapshot RPC must be executable by service_role for the edge gateway",
);
for (const field of ["id", "name", "description", "is_active", "created_at", "updated_at"]) {
  requireMatch(
    expandedMigrationSource,
    new RegExp(`\\b${field}\\b`),
    `Expanded pricing snapshot must retain purchase mode field ${field}`,
  );
}
requireMatch(
  expandedMigrationSource,
  /FROM\s+public\.purchase_modes/i,
  "Expanded pricing snapshot must source purchase modes server-side",
);
requireMatch(
  testSource,
  /admin_get_pricing_tiers_snapshot/,
  "Pricing snapshot contract test must exercise the canonical snapshot RPC",
);
requireMatch(
  testSource,
  /falha fechado|fail[- ]closed/i,
  "Pricing snapshot contract test must retain an invalid-payload fail-closed regression",
);
requireMatch(
  purchaseModesTestSource,
  /admin_get_pricing_tiers_snapshot/,
  "Purchase modes contract test must exercise the canonical snapshot RPC",
);
requireMatch(
  purchaseModesTestSource,
  /falha fechado|fail[- ]closed/i,
  "Purchase modes contract test must retain an invalid-payload fail-closed regression",
);

if (failures.length > 0) {
  console.error("Pricing read authority audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Pricing read authority audit passed.");
