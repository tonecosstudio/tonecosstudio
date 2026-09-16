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
const SNAPSHOT_TEST = path.join(
  ROOT,
  "src",
  "services",
  "pricing",
  "pricing-tier-read-service.test.ts",
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
const edgeSource = requireFile(ADMIN_RPC_EDGE, "Admin RPC edge gateway");
const migrationSource = requireFile(SNAPSHOT_MIGRATION, "Pricing snapshot migration");
const testSource = requireFile(SNAPSHOT_TEST, "Pricing snapshot contract test");

forbidMatch(
  pricingSource,
  /\.from\(\s*["'](?:pricing_tiers|subscription_plans|purchase_modes)["']\s*\)/,
  "Admin pricing aggregate must not read pricing_tiers, subscription_plans, or purchase_modes directly from the browser client",
);
requireMatch(
  pricingSource,
  /callAdminRpc<[^>]+>\(\s*["']admin_get_pricing_tiers_snapshot["']/,
  "Admin pricing aggregate must use admin_get_pricing_tiers_snapshot through callAdminRpc",
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

if (failures.length > 0) {
  console.error("Pricing read authority audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Pricing read authority audit passed.");
