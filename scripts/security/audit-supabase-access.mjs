import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const EDGE_FUNCTIONS_DIR = path.join(ROOT, "supabase", "functions");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const BASELINE_PATH = path.join(
  ROOT,
  "scripts",
  "security",
  "supabase-access-baseline.json",
);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_SEGMENTS = new Set(["node_modules", "dist", "coverage"]);
const DIRECT_CLIENT_IMPORT = /@\/integrations\/supabase\/client/;
const DIRECT_SUPABASE_CALL =
  /\bsupabase\s*\.\s*(from|rpc|storage|functions|auth|channel|removeChannel)\b/;
const DIRECT_SUPABASE_STORAGE = /\bsupabase\s*\.\s*storage\b/;
const DIRECT_SUPABASE_FUNCTIONS = /\bsupabase\s*\.\s*functions\b/;
const DIRECT_SUPABASE_REALTIME = /\bsupabase\s*\.\s*(channel|removeChannel)\b/;
const DIRECT_SUPABASE_AUTH = /\bsupabase\s*\.\s*auth\b/;
const DIRECT_ROLE_RPC = /\.rpc\(\s*["']has_role["']/;
const DIRECT_EMAIL_LOG_RPC =
  /\.rpc\(\s*["'](?:create_email_delivery_log|update_email_delivery_log)["']/;
const FORBIDDEN_BROWSER_SUPABASE_SECRET =
  /\b(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_KEY|service_role|SERVICE_ROLE)\b/;
const FORBIDDEN_PUBLIC_SECRET_ENV =
  /import\.meta\.env\.VITE_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|TOKEN)[A-Z0-9_]*/;
const FORBIDDEN_ARBITRARY_ADMIN_ACCESS_HELPER = /\buserHasAdminAccess\b/;
const EDGE_FUNCTION_URL = /\/functions\/v1\//;
const EDGE_FUNCTION_CLIENT_PATH =
  "src/services/supabase/edge-function-client.ts";
const STORAGE_CLIENT_PATH = "src/services/supabase/storage-client.ts";
const REALTIME_CLIENT_PATH = "src/services/supabase/realtime-client.ts";
const AUTH_SERVICE_DIR = "src/services/auth/";
const CURRENT_USER_SERVICE_PATH = "src/services/auth/current-user.ts";
const EDGE_SUPABASE_SHARED_PATH = "supabase/functions/_shared/supabase.ts";
const EDGE_RATE_LIMIT_SHARED_PATH = "supabase/functions/_shared/rate-limit.ts";
const EDGE_SECRET_RATE_LIMIT_SHARED_PATH =
  "supabase/functions/_shared/secret-rate-limit.ts";
const EDGE_SECRETS_SHARED_PATH = "supabase/functions/_shared/secrets.ts";
const EDGE_DIRECT_SUPABASE_CLIENT =
  /npm:@supabase\/supabase-js|createClient\s*\(/;
const EDGE_DIRECT_SUPABASE_ENV =
  /Deno\.env\.get\(\s*["'](?:SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY)["']\s*\)/;
const EDGE_DIRECT_FUNCTION_URL = /\/functions\/v1\//;
const EDGE_HARDCODED_ADMIN_ROLE_LIST =
  /\[\s*["']admin["']\s*,\s*["']super_admin["']\s*\]/;
const EDGE_RATE_LIMIT_REQUIRED_SOURCE =
  /\b(assertAdmin|getClaims|requireSharedSecret|requireRateLimitedSharedSecret|BOOTSTRAP_ADMIN_SECRET|CRON_SECRET|EMAIL_WEBHOOK_SECRET)\b/;
const EDGE_RATE_LIMIT_APPLIED =
  /\b(checkRateLimit|assertRateLimitedAdmin|requireRateLimitedSharedSecret)\b/;
const EDGE_DIRECT_SHARED_SECRET = /\brequireSharedSecret\b/;
const EDGE_RATE_LIMIT_EXEMPT_FUNCTIONS = new Set([
  // Stripe webhooks must be governed by Stripe signature verification,
  // idempotent event recording, and upstream WAF/provider limits; request bursts can be legitimate retries.
  "stripe-webhook",
]);
const APP_HARDCODED_ADMIN_ROLE_REFERENCE =
  /["']super_admin["']|\[\s*["']admin["']\s*,\s*["']super_admin["']\s*\]/;
const APP_ADMIN_ROLES_PATH = "src/lib/permissions/adminRoles.ts";
const GENERATED_SUPABASE_TYPES_PATH = "src/integrations/supabase/types.ts";
const EDGE_ROLES_SHARED_PATH = "supabase/functions/_shared/roles.ts";
const LEGACY_ROOT_SERVICE_IMPORTS = [
  "audit-trail-service",
  "automatic-maintenance-service",
  "base-pricing-service",
  "batch-calculator-service",
  "business-day-calendar-service",
  "business-days-service",
  "capacity-alert-service",
  "capacity-service",
  "character-multiplier-service",
  "character-pricing-service",
  "coin-packages-service",
  "coins-balance-service",
  "coins-mutations-service",
  "coins-transactions-service",
  "collection-price-service",
  "collection-pricing-service",
  "collection-service",
  "collection-types-service",
  "collector-mutations-service",
  "context-pricing-service",
  "content-settings-service",
  "customer-account-mutations-service",
  "customer-chat-button-service",
  "customer-profile-self-service",
  "cutoff-service",
  "delivery-cycle-mutations-service",
  "delivery-scheduling-service",
  "delivery-service",
  "email-log-mutations-service",
  "email-service",
  "groups-message-service",
  "holiday-mutations-service",
  "holiday-service",
  "migration-service",
  "notification-preferences-service",
  "pause-service",
  "pricing-history-service",
  "pricing-reports-service",
  "pricing-settings-service",
  "pricing-tier-plan-service",
  "pricing-tier-read-service",
  "pricing-tiers-service",
  "production-limit-service",
  "production-mutations-service",
  "purchase-modes-service",
  "realtime-service",
  "reminder-service",
  "shipping-service",
  "standalone-purchase-service",
  "subscriber-dashboard-service",
  "subscription-checkout-service",
  "subscription-credit-admin-api",
  "subscription-credit-api",
  "subscription-credit-mutations-service",
  "subscription-credit-supabase",
  "subscription-details-service",
  "subscription-payment-service",
  "subscription-plans-service",
  "subscription-service",
  "subscription-summary-service",
  "system-settings-service",
  "timezone-service",
];
const LEGACY_ROOT_SERVICE_IMPORT = new RegExp(
  `@/services/(${LEGACY_ROOT_SERVICE_IMPORTS.join("|")})(?![\\w/-])`,
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LEGACY_ADMIN_ROOT_SERVICE_IMPORTS = [
  "admin-analytics-service",
  "admin-coins-gateway",
  "admin-coins-system-service",
  "admin-collections-service",
  "admin-config-mutations-service",
  "admin-credit-characters-service",
  "admin-cycles-service",
  "admin-dashboard-stats-service",
  "admin-financial-overview-service",
  "admin-image-upload-service",
  "admin-notifications-service",
  "admin-order-status-service",
  "admin-payment-keys-service",
  "admin-payments-auth-service",
  "admin-payments-gateway",
  "admin-plans-configuration-service",
  "admin-plans-gateway",
  "admin-preorders-service",
  "admin-production-gateway",
  "admin-production-info-service",
  "admin-production-mutations-service",
  "admin-quotes-service",
  "admin-system-settings-service",
  "admin-user-actions-service",
  "admin-user-details-service",
  "admin-users-service",
  "blocked-production-service",
  "bonus-piece-service",
  "bulk-delivery-status-update-service",
  "bulk-operations-service",
  "catalog-curation-service",
  "choice-approval-modal-service",
  "choice-service",
  "coins-pricing-admin-service",
  "collection-breakdown-service",
  "collection-form-pricing-tiers-service",
  "collection-limit-config-service",
  "collection-pricing-manager-service",
  "collection-stats-service",
  "collection-tier-assignment-dialog-service",
  "collections-for-bulk-assign-service",
  "contacts-service",
  "contextual-pricing-history-service",
  "credits-dashboard-service",
  "customer-profile-service",
  "customer-relationship-service",
  "customer-sidebar-service",
  "delivery-detail-service",
  "email-analytics-service",
  "historical-cycles-service",
  "label-service",
  "notification-center-service",
  "orders-counts-service",
  "orders-export",
  "orders-service",
  "orders-transformer",
  "orders-validator",
  "pending-choices-service",
  "photo-metadata-service",
  "pricing-hierarchy-service",
  "production-assignment-options-service",
  "production-character-images-service",
  "production-deadlines-settings-service",
  "production-filter-options-service",
  "production-global-limit-settings-service",
  "production-history-service",
  "production-photo-storage-service",
  "production-service",
  "quick-replies-service",
  "send-payment-link-service",
  "stage-service",
  "stage-types",
  "stage-validation",
  "standalone-pricing-admin-service",
  "support-chat-session-service",
  "support-dashboard-metrics-service",
  "support-quick-replies-service",
  "team-workload-service",
];
const LEGACY_ADMIN_ROOT_SERVICE_IMPORT = new RegExp(
  `@/services/admin/(${LEGACY_ADMIN_ROOT_SERVICE_IMPORTS.map(escapeRegExp).join("|")})(?![\\w/-])`,
);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_SEGMENTS.has(entry)) continue;

    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

function edgeFunctionName(repoPath) {
  const [, , functionName] = repoPath.split("/");
  return functionName ?? "";
}

function isTestPath(repoPath) {
  return (
    repoPath.startsWith("src/test/") ||
    repoPath.includes("/__tests__/") ||
    /\.test\.[cm]?[tj]sx?$/.test(repoPath) ||
    /\.spec\.[cm]?[tj]sx?$/.test(repoPath)
  );
}

function layerFor(repoPath) {
  const [, topLevel, secondLevel] = repoPath.split("/");

  if (topLevel === "services") {
    return secondLevel && !secondLevel.includes(".")
      ? `services/${secondLevel}`
      : "services";
  }
  if (topLevel === "lib") {
    return secondLevel === "services" ? "lib/services" : "lib";
  }
  return topLevel ?? "unknown";
}

function isRootAdminService(repoPath) {
  return /^src\/services\/admin\/[^/]+\.[cm]?[tj]sx?$/.test(repoPath);
}

function isRootService(repoPath) {
  return /^src\/services\/[^/]+\.[cm]?[tj]sx?$/.test(repoPath);
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function formatCounts(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `  ${key}: ${count}`)
    .join("\n");
}

const sourceFiles = walk(SRC_DIR).map((filePath) => ({
  filePath,
  repoPath: toRepoPath(filePath),
}));

const productionFiles = sourceFiles.filter(
  ({ repoPath }) => !isTestPath(repoPath),
);
const edgeFunctionFiles = existsSync(EDGE_FUNCTIONS_DIR)
  ? walk(EDGE_FUNCTIONS_DIR)
      .map((filePath) => ({
        filePath,
        repoPath: toRepoPath(filePath),
      }))
      .filter(({ repoPath }) => !isTestPath(repoPath))
  : [];
const migrationSource = existsSync(MIGRATIONS_DIR)
  ? readdirSync(MIGRATIONS_DIR)
      .filter((entry) => entry.endsWith(".sql"))
      .map((entry) => readFileSync(path.join(MIGRATIONS_DIR, entry), "utf8"))
      .join("\n\n")
  : "";

if (
  !/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.rate_limits/i.test(
    migrationSource,
  )
) {
  missingRateLimitMigrationRequirements.push(
    "public.rate_limits table migration",
  );
}

if (
  !/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.check_rate_limit\s*\(/i.test(
    migrationSource,
  )
) {
  missingRateLimitMigrationRequirements.push(
    "public.check_rate_limit RPC migration",
  );
}

if (
  !/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.check_rate_limit\s*\([^)]*\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i.test(
    migrationSource,
  )
) {
  missingRateLimitMigrationRequirements.push(
    "public.check_rate_limit RPC revoke from browser roles",
  );
}

const clientImportFiles = [];
const directCallFiles = [];
const forbiddenRootServiceFiles = [];
const forbiddenRootAdminServiceFiles = [];
const forbiddenPresentationImports = [];
const forbiddenPresentationDirectCalls = [];
const forbiddenRootServiceImports = [];
const forbiddenAdminRootServiceImports = [];
const forbiddenManualEdgeFunctionUrls = [];
const forbiddenDirectStorageAccess = [];
const forbiddenDirectFunctionInvokes = [];
const forbiddenDirectRealtimeAccess = [];
const forbiddenDirectAuthAccess = [];
const forbiddenDirectRoleRpc = [];
const forbiddenDirectEmailLogRpc = [];
const forbiddenBrowserSupabaseSecretRefs = [];
const forbiddenPublicSecretEnvRefs = [];
const forbiddenArbitraryAdminAccessHelperRefs = [];
const forbiddenAppHardcodedAdminRoleRefs = [];
const forbiddenEdgeDirectSupabaseClient = [];
const forbiddenEdgeDirectSupabaseEnv = [];
const forbiddenEdgeDirectFunctionUrls = [];
const forbiddenEdgeHardcodedAdminRoleLists = [];
const forbiddenEdgeRateLimitFailOpen = [];
const forbiddenEdgeMissingRateLimit = [];
const forbiddenEdgeDirectSharedSecret = [];
const missingRateLimitMigrationRequirements = [];
const importCountsByLayer = new Map();
const directCallCountsByLayer = new Map();

for (const file of sourceFiles) {
  const source = readFileSync(file.filePath, "utf8");

  if (LEGACY_ROOT_SERVICE_IMPORT.test(source)) {
    forbiddenRootServiceImports.push(file.repoPath);
  }

  if (LEGACY_ADMIN_ROOT_SERVICE_IMPORT.test(source)) {
    forbiddenAdminRootServiceImports.push(file.repoPath);
  }
}

for (const file of productionFiles) {
  const source = readFileSync(file.filePath, "utf8");
  const hasClientImport = DIRECT_CLIENT_IMPORT.test(source);
  const hasDirectCall = DIRECT_SUPABASE_CALL.test(source);
  const hasDirectStorageAccess = DIRECT_SUPABASE_STORAGE.test(source);
  const hasDirectFunctionInvoke = DIRECT_SUPABASE_FUNCTIONS.test(source);
  const hasDirectRealtimeAccess = DIRECT_SUPABASE_REALTIME.test(source);
  const hasDirectAuthAccess = DIRECT_SUPABASE_AUTH.test(source);
  const hasDirectRoleRpc = DIRECT_ROLE_RPC.test(source);
  const hasDirectEmailLogRpc = DIRECT_EMAIL_LOG_RPC.test(source);
  const hasBrowserSupabaseSecretRef =
    FORBIDDEN_BROWSER_SUPABASE_SECRET.test(source);
  const hasPublicSecretEnvRef = FORBIDDEN_PUBLIC_SECRET_ENV.test(source);
  const hasArbitraryAdminAccessHelperRef =
    FORBIDDEN_ARBITRARY_ADMIN_ACCESS_HELPER.test(source);
  const hasEdgeFunctionUrl = EDGE_FUNCTION_URL.test(source);

  if (isRootService(file.repoPath)) {
    forbiddenRootServiceFiles.push(file.repoPath);
  }

  if (isRootAdminService(file.repoPath)) {
    forbiddenRootAdminServiceFiles.push(file.repoPath);
  }

  if (hasClientImport) {
    clientImportFiles.push(file.repoPath);
    increment(importCountsByLayer, layerFor(file.repoPath));
  }

  if (hasDirectCall) {
    directCallFiles.push(file.repoPath);
    increment(directCallCountsByLayer, layerFor(file.repoPath));
  }

  if (
    hasClientImport &&
    (file.repoPath.startsWith("src/components/") ||
      file.repoPath.startsWith("src/pages/") ||
      file.repoPath.startsWith("src/hooks/"))
  ) {
    forbiddenPresentationImports.push(file.repoPath);
  }

  if (
    hasDirectCall &&
    (file.repoPath.startsWith("src/components/") ||
      file.repoPath.startsWith("src/pages/") ||
      file.repoPath.startsWith("src/hooks/"))
  ) {
    forbiddenPresentationDirectCalls.push(file.repoPath);
  }

  if (hasEdgeFunctionUrl && file.repoPath !== EDGE_FUNCTION_CLIENT_PATH) {
    forbiddenManualEdgeFunctionUrls.push(file.repoPath);
  }

  if (hasDirectStorageAccess && file.repoPath !== STORAGE_CLIENT_PATH) {
    forbiddenDirectStorageAccess.push(file.repoPath);
  }

  if (hasDirectFunctionInvoke && file.repoPath !== EDGE_FUNCTION_CLIENT_PATH) {
    forbiddenDirectFunctionInvokes.push(file.repoPath);
  }

  if (hasDirectRealtimeAccess && file.repoPath !== REALTIME_CLIENT_PATH) {
    forbiddenDirectRealtimeAccess.push(file.repoPath);
  }

  if (hasDirectAuthAccess && !file.repoPath.startsWith(AUTH_SERVICE_DIR)) {
    forbiddenDirectAuthAccess.push(file.repoPath);
  }

  if (hasDirectRoleRpc && file.repoPath !== CURRENT_USER_SERVICE_PATH) {
    forbiddenDirectRoleRpc.push(file.repoPath);
  }

  if (hasDirectEmailLogRpc) {
    forbiddenDirectEmailLogRpc.push(file.repoPath);
  }

  if (hasBrowserSupabaseSecretRef) {
    forbiddenBrowserSupabaseSecretRefs.push(file.repoPath);
  }

  if (hasPublicSecretEnvRef) {
    forbiddenPublicSecretEnvRefs.push(file.repoPath);
  }

  if (hasArbitraryAdminAccessHelperRef) {
    forbiddenArbitraryAdminAccessHelperRefs.push(file.repoPath);
  }

  if (
    APP_HARDCODED_ADMIN_ROLE_REFERENCE.test(source) &&
    file.repoPath !== APP_ADMIN_ROLES_PATH &&
    file.repoPath !== GENERATED_SUPABASE_TYPES_PATH
  ) {
    forbiddenAppHardcodedAdminRoleRefs.push(file.repoPath);
  }
}

for (const file of edgeFunctionFiles) {
  if (file.repoPath === EDGE_RATE_LIMIT_SHARED_PATH) {
    const source = readFileSync(file.filePath, "utf8");

    if (/fail\s+open/i.test(source) || !/RATE_LIMIT_UNAVAILABLE/.test(source)) {
      forbiddenEdgeRateLimitFailOpen.push(file.repoPath);
    }
  }

  if (file.repoPath === EDGE_SUPABASE_SHARED_PATH) {
    const source = readFileSync(file.filePath, "utf8");

    if (EDGE_HARDCODED_ADMIN_ROLE_LIST.test(source)) {
      forbiddenEdgeHardcodedAdminRoleLists.push(file.repoPath);
    }

    continue;
  }

  const source = readFileSync(file.filePath, "utf8");
  const functionName = edgeFunctionName(file.repoPath);

  if (
    file.repoPath.endsWith("/index.ts") &&
    EDGE_RATE_LIMIT_REQUIRED_SOURCE.test(source) &&
    !EDGE_RATE_LIMIT_APPLIED.test(source) &&
    !EDGE_RATE_LIMIT_EXEMPT_FUNCTIONS.has(functionName)
  ) {
    forbiddenEdgeMissingRateLimit.push(file.repoPath);
  }

  if (
    EDGE_DIRECT_SHARED_SECRET.test(source) &&
    file.repoPath !== EDGE_SECRET_RATE_LIMIT_SHARED_PATH &&
    file.repoPath !== EDGE_SECRETS_SHARED_PATH
  ) {
    forbiddenEdgeDirectSharedSecret.push(file.repoPath);
  }

  if (EDGE_DIRECT_SUPABASE_CLIENT.test(source)) {
    forbiddenEdgeDirectSupabaseClient.push(file.repoPath);
  }

  if (EDGE_DIRECT_SUPABASE_ENV.test(source)) {
    forbiddenEdgeDirectSupabaseEnv.push(file.repoPath);
  }

  if (EDGE_DIRECT_FUNCTION_URL.test(source)) {
    forbiddenEdgeDirectFunctionUrls.push(file.repoPath);
  }

  if (
    EDGE_HARDCODED_ADMIN_ROLE_LIST.test(source) &&
    file.repoPath !== EDGE_ROLES_SHARED_PATH
  ) {
    forbiddenEdgeHardcodedAdminRoleLists.push(file.repoPath);
  }
}

console.log("Supabase access audit");
console.log("=====================");
console.log(`Production files scanned: ${productionFiles.length}`);
console.log(`Edge Function files scanned: ${edgeFunctionFiles.length}`);
console.log(`Files importing Supabase client: ${clientImportFiles.length}`);
console.log(`Files with direct Supabase calls: ${directCallFiles.length}`);
console.log("");
console.log("Client imports by layer:");
console.log(formatCounts(importCountsByLayer) || "  none");
console.log("");
console.log("Direct calls by layer:");
console.log(formatCounts(directCallCountsByLayer) || "  none");

if (existsSync(BASELINE_PATH)) {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

  if (clientImportFiles.length > baseline.maxClientImportFiles) {
    console.error("");
    console.error(
      `Supabase client imports increased: ${clientImportFiles.length} > ${baseline.maxClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (directCallFiles.length > baseline.maxDirectCallFiles) {
    console.error("");
    console.error(
      `Direct Supabase calls increased: ${directCallFiles.length} > ${baseline.maxDirectCallFiles}`,
    );
    process.exitCode = 1;
  }

  const hookClientImportFiles = importCountsByLayer.get("hooks") ?? 0;
  const hookDirectCallFiles = directCallCountsByLayer.get("hooks") ?? 0;
  const libClientImportFiles = importCountsByLayer.get("lib") ?? 0;
  const libDirectCallFiles = directCallCountsByLayer.get("lib") ?? 0;
  const libServicesClientImportFiles =
    importCountsByLayer.get("lib/services") ?? 0;
  const libServicesDirectCallFiles =
    directCallCountsByLayer.get("lib/services") ?? 0;
  const rootServicesClientImportFiles =
    importCountsByLayer.get("services") ?? 0;
  const rootServicesDirectCallFiles =
    directCallCountsByLayer.get("services") ?? 0;
  const rootAdminClientImportFiles =
    clientImportFiles.filter(isRootAdminService).length;
  const rootAdminDirectCallFiles =
    directCallFiles.filter(isRootAdminService).length;

  if (hookClientImportFiles > baseline.maxHookClientImportFiles) {
    console.error("");
    console.error(
      `Hook Supabase client imports increased: ${hookClientImportFiles} > ${baseline.maxHookClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (hookDirectCallFiles > baseline.maxHookDirectCallFiles) {
    console.error("");
    console.error(
      `Hook direct Supabase calls increased: ${hookDirectCallFiles} > ${baseline.maxHookDirectCallFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxLibClientImportFiles) &&
    libClientImportFiles > baseline.maxLibClientImportFiles
  ) {
    console.error("");
    console.error(
      `Lib Supabase client imports increased: ${libClientImportFiles} > ${baseline.maxLibClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxLibDirectCallFiles) &&
    libDirectCallFiles > baseline.maxLibDirectCallFiles
  ) {
    console.error("");
    console.error(
      `Lib direct Supabase calls increased: ${libDirectCallFiles} > ${baseline.maxLibDirectCallFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxLibServicesClientImportFiles) &&
    libServicesClientImportFiles > baseline.maxLibServicesClientImportFiles
  ) {
    console.error("");
    console.error(
      `Lib services Supabase client imports increased: ${libServicesClientImportFiles} > ${baseline.maxLibServicesClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxLibServicesDirectCallFiles) &&
    libServicesDirectCallFiles > baseline.maxLibServicesDirectCallFiles
  ) {
    console.error("");
    console.error(
      `Lib services direct Supabase calls increased: ${libServicesDirectCallFiles} > ${baseline.maxLibServicesDirectCallFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxRootServicesClientImportFiles) &&
    rootServicesClientImportFiles > baseline.maxRootServicesClientImportFiles
  ) {
    console.error("");
    console.error(
      `Root services Supabase client imports increased: ${rootServicesClientImportFiles} > ${baseline.maxRootServicesClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxRootServicesDirectCallFiles) &&
    rootServicesDirectCallFiles > baseline.maxRootServicesDirectCallFiles
  ) {
    console.error("");
    console.error(
      `Root services direct Supabase calls increased: ${rootServicesDirectCallFiles} > ${baseline.maxRootServicesDirectCallFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxRootAdminClientImportFiles) &&
    rootAdminClientImportFiles > baseline.maxRootAdminClientImportFiles
  ) {
    console.error("");
    console.error(
      `Root admin Supabase client imports increased: ${rootAdminClientImportFiles} > ${baseline.maxRootAdminClientImportFiles}`,
    );
    process.exitCode = 1;
  }

  if (
    Number.isFinite(baseline.maxRootAdminDirectCallFiles) &&
    rootAdminDirectCallFiles > baseline.maxRootAdminDirectCallFiles
  ) {
    console.error("");
    console.error(
      `Root admin direct Supabase calls increased: ${rootAdminDirectCallFiles} > ${baseline.maxRootAdminDirectCallFiles}`,
    );
    process.exitCode = 1;
  }
}

if (forbiddenPresentationImports.length > 0) {
  console.error("");
  console.error("Forbidden presentation Supabase imports:");
  for (const repoPath of forbiddenPresentationImports) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenPresentationDirectCalls.length > 0) {
  console.error("");
  console.error("Forbidden presentation direct Supabase calls:");
  for (const repoPath of forbiddenPresentationDirectCalls) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenRootServiceFiles.length > 0) {
  console.error("");
  console.error("Forbidden production files directly under src/services:");
  for (const repoPath of forbiddenRootServiceFiles) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenRootAdminServiceFiles.length > 0) {
  console.error("");
  console.error(
    "Forbidden production files directly under src/services/admin:",
  );
  for (const repoPath of forbiddenRootAdminServiceFiles) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenRootServiceImports.length > 0) {
  console.error("");
  console.error(
    "Forbidden production imports from legacy root service wrappers:",
  );
  for (const repoPath of forbiddenRootServiceImports) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenAdminRootServiceImports.length > 0) {
  console.error("");
  console.error(
    "Forbidden production imports from legacy admin root service wrappers:",
  );
  for (const repoPath of forbiddenAdminRootServiceImports) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenManualEdgeFunctionUrls.length > 0) {
  console.error("");
  console.error(
    "Forbidden manual Edge Function URLs outside the shared client:",
  );
  for (const repoPath of forbiddenManualEdgeFunctionUrls) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectStorageAccess.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase Storage access outside the shared client:",
  );
  for (const repoPath of forbiddenDirectStorageAccess) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectFunctionInvokes.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase Edge Function access outside the shared client:",
  );
  for (const repoPath of forbiddenDirectFunctionInvokes) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectRealtimeAccess.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase Realtime access outside the shared client:",
  );
  for (const repoPath of forbiddenDirectRealtimeAccess) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectAuthAccess.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase Auth access outside the auth service:",
  );
  for (const repoPath of forbiddenDirectAuthAccess) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectRoleRpc.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct has_role RPC calls outside the current-user service:",
  );
  for (const repoPath of forbiddenDirectRoleRpc) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenDirectEmailLogRpc.length > 0) {
  console.error("");
  console.error(
    "Forbidden browser email-log RPC usage. Email delivery logs are internal telemetry and must be written by Edge Functions with service_role:",
  );
  for (const repoPath of forbiddenDirectEmailLogRpc) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenBrowserSupabaseSecretRefs.length > 0) {
  console.error("");
  console.error(
    "Forbidden Supabase service-role/secret references in browser source:",
  );
  for (const repoPath of forbiddenBrowserSupabaseSecretRefs) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenPublicSecretEnvRefs.length > 0) {
  console.error("");
  console.error(
    "Forbidden VITE_* secret/private/token environment references in browser source:",
  );
  for (const repoPath of forbiddenPublicSecretEnvRefs) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenArbitraryAdminAccessHelperRefs.length > 0) {
  console.error("");
  console.error(
    "Forbidden arbitrary user admin-access helper references in production source:",
  );
  for (const repoPath of forbiddenArbitraryAdminAccessHelperRefs) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenAppHardcodedAdminRoleRefs.length > 0) {
  console.error("");
  console.error(
    "Forbidden hardcoded app admin role references outside the shared admin roles module:",
  );
  for (const repoPath of forbiddenAppHardcodedAdminRoleRefs) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeDirectSupabaseClient.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase client creation outside the shared Edge Function client:",
  );
  for (const repoPath of forbiddenEdgeDirectSupabaseClient) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeDirectSupabaseEnv.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct Supabase environment access outside the shared Edge Function client:",
  );
  for (const repoPath of forbiddenEdgeDirectSupabaseEnv) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeDirectFunctionUrls.length > 0) {
  console.error("");
  console.error(
    "Forbidden manual Edge Function URLs outside the shared Edge Function client:",
  );
  for (const repoPath of forbiddenEdgeDirectFunctionUrls) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeHardcodedAdminRoleLists.length > 0) {
  console.error("");
  console.error(
    "Forbidden hardcoded Edge Function admin role lists outside the shared roles module:",
  );
  for (const repoPath of forbiddenEdgeHardcodedAdminRoleLists) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (missingRateLimitMigrationRequirements.length > 0) {
  console.error("");
  console.error("Missing backend rate-limit migration requirements:");
  for (const requirement of missingRateLimitMigrationRequirements) {
    console.error(`  ${requirement}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeRateLimitFailOpen.length > 0) {
  console.error("");
  console.error("Forbidden fail-open Edge Function rate-limit helper:");
  for (const repoPath of forbiddenEdgeRateLimitFailOpen) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeMissingRateLimit.length > 0) {
  console.error("");
  console.error("Sensitive Edge Functions missing backend rate limiting:");
  for (const repoPath of forbiddenEdgeMissingRateLimit) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}

if (forbiddenEdgeDirectSharedSecret.length > 0) {
  console.error("");
  console.error(
    "Forbidden direct shared-secret checks outside the rate-limited wrapper:",
  );
  for (const repoPath of forbiddenEdgeDirectSharedSecret) {
    console.error(`  ${repoPath}`);
  }
  process.exitCode = 1;
}
