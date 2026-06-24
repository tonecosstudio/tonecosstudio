import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const EXECUTE = argFlag("execute") || process.env.CLOUDFLARE_BOOTSTRAP_EXECUTE === "true";
const REPORT_PATH = path.resolve(
  argValue(
    "report",
    process.env.CLOUDFLARE_BOOTSTRAP_REPORT ||
      "tmp/cloudflare-bootstrap-report.json",
  ),
);
const API_BASE = "https://api.cloudflare.com/client/v4";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const PAGES_PROJECT = argValue(
  "pages-project",
  process.env.CLOUDFLARE_PAGES_PROJECT || "ordax",
);
const PRODUCTION_BRANCH = argValue(
  "production-branch",
  process.env.CLOUDFLARE_PAGES_PRODUCTION_BRANCH || "main",
);
const R2_BUCKET = argValue(
  "r2-bucket",
  process.env.CLOUDFLARE_R2_BUCKET || "ordax-catalog",
);
const ZONE_NAME = normalizeDomain(
  argValue(
    "zone",
    process.env.CLOUDFLARE_ZONE_NAME ||
      hostnameFromUrl(process.env.VITE_WEBSITE_URL) ||
      "ordax.com.br",
  ),
);
const ZONE_TYPE = argValue(
  "zone-type",
  process.env.CLOUDFLARE_ZONE_TYPE || "full",
);
const PAGES_CUSTOM_DOMAIN = argValue(
  "pages-domain",
  process.env.CLOUDFLARE_PAGES_CUSTOM_DOMAIN ||
    hostnameFromUrl(process.env.VITE_WEBSITE_URL) ||
    "ordax.com.br",
);
const PRODUCTION_ORIGIN = argValue(
  "production-origin",
  process.env.CLOUDFLARE_PRODUCTION_ORIGIN || "vercel",
);
const VERCEL_APEX_A_RECORD = argValue(
  "vercel-apex-a",
  process.env.CLOUDFLARE_VERCEL_APEX_A_RECORD || "76.76.21.21",
);
const CATALOG_WORKER = argValue(
  "catalog-worker",
  process.env.CLOUDFLARE_CATALOG_WORKER || "ordax-catalog-assets",
);
const CATALOG_ROUTE = argValue(
  "catalog-route",
  process.env.CLOUDFLARE_CATALOG_ROUTE || "ordax.com.br/catalog-webp-final/*",
);
const CATALOG_ASSET_BASE_URL =
  process.env.VITE_CATALOG_ASSET_BASE_URL ||
  (PAGES_CUSTOM_DOMAIN ? `https://${PAGES_CUSTOM_DOMAIN}` : "https://ordax.com.br");

const PUBLIC_PAGES_ENV_KEYS = new Set([
  ...Object.keys(process.env).filter((key) => key.startsWith("VITE_")),
  "VITE_CATALOG_ASSET_BASE_URL",
]);

function hostnameFromUrl(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

function normalizeDomain(value) {
  return value ? value.trim().toLowerCase().replace(/\.$/, "") : null;
}

function cloudflareHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  };
}

function envelopeMessage(envelope) {
  const messages = [
    ...(envelope?.errors || []),
    ...(envelope?.messages || []),
  ].map((entry) => entry.message || String(entry));
  return messages.join("; ") || "Cloudflare API request failed.";
}

async function apiRequest(method, endpoint, body = null, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: cloudflareHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const envelope = await response.json().catch(() => null);

  if (options.allow404 && response.status === 404) {
    return { found: false, result: null };
  }

  if (!response.ok || envelope?.success === false) {
    const error = new Error(
      `${method} ${endpoint} failed (${response.status}): ${envelopeMessage(envelope)}`,
    );
    error.status = response.status;
    error.envelope = envelope;
    throw error;
  }

  return { found: true, result: envelope?.result ?? envelope };
}

async function apiRawRequest(method, endpoint, body, contentType) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": contentType,
    },
    body,
  });
  const envelope = await response.json().catch(() => null);

  if (!response.ok || envelope?.success === false) {
    const error = new Error(
      `${method} ${endpoint} failed (${response.status}): ${envelopeMessage(envelope)}`,
    );
    error.status = response.status;
    error.envelope = envelope;
    throw error;
  }

  return { found: true, result: envelope?.result ?? envelope };
}

function assertExecuteConfig() {
  const missing = [];
  if (!API_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
  if (!ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!missing.length) return;

  throw new Error(`Missing Cloudflare config: ${missing.join(", ")}`);
}

function publicPagesEnvVars() {
  const vars = {};
  for (const key of Array.from(PUBLIC_PAGES_ENV_KEYS).sort()) {
    const value =
      key === "VITE_CATALOG_ASSET_BASE_URL"
        ? CATALOG_ASSET_BASE_URL
        : process.env[key];
    if (!value) continue;
    vars[key] = { type: "plain_text", value };
  }
  return vars;
}

function pagesProjectPayload(envVars) {
  return {
    name: PAGES_PROJECT,
    production_branch: PRODUCTION_BRANCH,
    build_config: {
      build_command: "npm run build",
      destination_dir: "dist",
      root_dir: "",
      build_caching: true,
    },
    deployment_configs: {
      preview: {
        env_vars: envVars,
      },
      production: {
        env_vars: envVars,
      },
    },
  };
}

function workerMetadata() {
  return {
    main_module: "worker.js",
    compatibility_date: "2026-06-06",
    bindings: [
      {
        type: "r2_bucket",
        name: "ORDAX_CATALOG",
        bucket_name: R2_BUCKET,
      },
    ],
    usage_model: "standard",
  };
}

function multipartWorkerBody(workerCode) {
  const boundary = `----ordax${Date.now()}`;
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="metadata"',
    "Content-Type: application/json",
    "",
    JSON.stringify(workerMetadata()),
    `--${boundary}`,
    'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
    "Content-Type: application/javascript+module",
    "",
    workerCode,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function ensureToken(report) {
  const token = await apiRequest("GET", "/user/tokens/verify");
  report.actions.push({
    action: "verify_token",
    status: "ok",
    token_status: token.result?.status || null,
  });
}

async function ensureAccount(report) {
  const account = await apiRequest("GET", `/accounts/${ACCOUNT_ID}`);
  report.actions.push({
    action: "verify_account",
    status: "ok",
    account_id: ACCOUNT_ID,
    account_name: account.result?.name || null,
  });
}

async function ensureZone(report) {
  if (!ZONE_NAME) {
    report.actions.push({
      action: "zone",
      status: "skipped",
      reason: "missing_zone_name",
    });
    return null;
  }

  const query = new URLSearchParams({
    name: ZONE_NAME,
    "account.id": ACCOUNT_ID,
    per_page: "5",
  });
  const existing = await apiRequest("GET", `/zones?${query.toString()}`);
  const zone = Array.isArray(existing.result) ? existing.result[0] : null;
  if (zone) {
    report.actions.push({
      action: "zone",
      status: "exists",
      zone: ZONE_NAME,
      zone_id: zone.id || null,
      zone_status: zone.status || null,
      name_servers: zone.name_servers || [],
    });
    return zone;
  }

  let created;
  try {
    created = await apiRequest("POST", "/zones", {
      name: ZONE_NAME,
      account: { id: ACCOUNT_ID },
      type: ZONE_TYPE,
    });
  } catch (error) {
    report.actions.push({
      action: "zone",
      status: "blocked",
      zone: ZONE_NAME,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const createdZone = created.result || null;
  report.actions.push({
    action: "zone",
    status: "created",
    zone: ZONE_NAME,
    zone_id: createdZone?.id || null,
    zone_status: createdZone?.status || null,
    name_servers: createdZone?.name_servers || [],
  });
  return createdZone;
}

async function ensureZoneSecurity(report, zone) {
  if (!zone?.id) {
    report.actions.push({
      action: "zone_security",
      status: "skipped",
      reason: "missing_zone",
    });
    return;
  }

  const settings = [
    ["ssl", { value: "full" }],
    ["always_use_https", { value: "on" }],
    ["min_tls_version", { value: "1.2" }],
    ["automatic_https_rewrites", { value: "on" }],
  ];

  for (const [setting, body] of settings) {
    try {
      await apiRequest("PATCH", `/zones/${zone.id}/settings/${setting}`, body);
      report.actions.push({
        action: `zone_setting_${setting}`,
        status: "configured",
      });
    } catch (error) {
      report.actions.push({
        action: `zone_setting_${setting}`,
        status: "blocked",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function ensureR2Bucket(report) {
  const endpoint = `/accounts/${ACCOUNT_ID}/r2/buckets/${encodeURIComponent(R2_BUCKET)}`;
  const existing = await apiRequest("GET", endpoint, null, { allow404: true });
  if (existing.found) {
    report.actions.push({
      action: "r2_bucket",
      status: "exists",
      bucket: R2_BUCKET,
    });
    return;
  }

  await apiRequest("POST", `/accounts/${ACCOUNT_ID}/r2/buckets`, {
    name: R2_BUCKET,
  });
  report.actions.push({
    action: "r2_bucket",
    status: "created",
    bucket: R2_BUCKET,
  });
}

async function ensureCatalogWorker(report) {
  const workerPath = path.resolve("workers/ordax-catalog-assets.js");
  const workerCode = await fs.readFile(workerPath, "utf8");
  const { body, contentType } = multipartWorkerBody(workerCode);

  const uploaded = await apiRawRequest(
    "PUT",
    `/accounts/${ACCOUNT_ID}/workers/scripts/${encodeURIComponent(CATALOG_WORKER)}`,
    body,
    contentType,
  );

  report.actions.push({
    action: "catalog_worker",
    status: "uploaded",
    worker: CATALOG_WORKER,
    bucket_binding: R2_BUCKET,
    etag: uploaded.result?.etag || null,
  });
}

async function ensureCatalogRoute(report, zone) {
  if (!zone?.id) {
    report.actions.push({
      action: "catalog_worker_route",
      status: "skipped",
      route: CATALOG_ROUTE,
      reason: "missing_zone",
    });
    return;
  }

  const routes = await apiRequest(
    "GET",
    `/zones/${zone.id}/workers/routes?per_page=100`,
  );
  const existing = Array.isArray(routes.result)
    ? routes.result.find((route) => route.pattern === CATALOG_ROUTE)
    : null;

  if (existing) {
    await apiRequest("PUT", `/zones/${zone.id}/workers/routes/${existing.id}`, {
      pattern: CATALOG_ROUTE,
      script: CATALOG_WORKER,
    });
    report.actions.push({
      action: "catalog_worker_route",
      status: "updated",
      route: CATALOG_ROUTE,
      worker: CATALOG_WORKER,
    });
    return;
  }

  await apiRequest("POST", `/zones/${zone.id}/workers/routes`, {
    pattern: CATALOG_ROUTE,
    script: CATALOG_WORKER,
  });
  report.actions.push({
    action: "catalog_worker_route",
    status: "created",
    route: CATALOG_ROUTE,
    worker: CATALOG_WORKER,
  });
}

async function ensureVercelDns(report, zone) {
  if (PRODUCTION_ORIGIN !== "vercel") {
    report.actions.push({
      action: "vercel_dns",
      status: "skipped",
      reason: `production_origin_${PRODUCTION_ORIGIN}`,
    });
    return;
  }

  if (!zone?.id || !ZONE_NAME) {
    report.actions.push({
      action: "vercel_dns",
      status: "skipped",
      reason: "missing_zone",
    });
    return;
  }

  const records = await apiRequest(
    "GET",
    `/zones/${zone.id}/dns_records?name=${encodeURIComponent(ZONE_NAME)}&per_page=100`,
  );
  const rootRecords = Array.isArray(records.result)
    ? records.result.filter((record) => ["A", "AAAA", "CNAME"].includes(record.type))
    : [];
  const existing = rootRecords.find(
    (record) => record.type === "A" && record.content === VERCEL_APEX_A_RECORD,
  );

  if (existing) {
    await apiRequest("PATCH", `/zones/${zone.id}/dns_records/${existing.id}`, {
      proxied: true,
      ttl: 1,
      comment: "Ordax production origin on Vercel, proxied by Cloudflare",
    });
    report.actions.push({
      action: "vercel_dns",
      status: "updated",
      name: ZONE_NAME,
      content: VERCEL_APEX_A_RECORD,
      proxied: true,
    });
    return;
  }

  if (rootRecords.length > 0) {
    report.actions.push({
      action: "vercel_dns",
      status: "blocked",
      reason: "conflicting_root_records_present",
      conflicts: rootRecords.map((record) => ({
        type: record.type,
        name: record.name,
        content: record.content,
      })),
    });
    return;
  }

  await apiRequest("POST", `/zones/${zone.id}/dns_records`, {
    type: "A",
    name: ZONE_NAME,
    content: VERCEL_APEX_A_RECORD,
    ttl: 1,
    proxied: true,
    comment: "Ordax production origin on Vercel, proxied by Cloudflare",
  });
  report.actions.push({
    action: "vercel_dns",
    status: "created",
    name: ZONE_NAME,
    content: VERCEL_APEX_A_RECORD,
    proxied: true,
  });
}

async function ensurePagesProject(report) {
  const envVars = publicPagesEnvVars();
  const endpoint = `/accounts/${ACCOUNT_ID}/pages/projects/${encodeURIComponent(
    PAGES_PROJECT,
  )}`;
  const existing = await apiRequest("GET", endpoint, null, { allow404: true });
  const payload = pagesProjectPayload(envVars);

  if (!existing.found) {
    await apiRequest("POST", `/accounts/${ACCOUNT_ID}/pages/projects`, payload);
    report.actions.push({
      action: "pages_project",
      status: "created",
      project: PAGES_PROJECT,
      env_vars: Object.keys(envVars),
    });
    return;
  }

  await apiRequest("PATCH", endpoint, {
    build_config: payload.build_config,
    deployment_configs: payload.deployment_configs,
    production_branch: PRODUCTION_BRANCH,
  });
  report.actions.push({
    action: "pages_project",
    status: "updated",
    project: PAGES_PROJECT,
    env_vars: Object.keys(envVars),
  });
}

async function ensurePagesDomain(report) {
  if (PRODUCTION_ORIGIN !== "pages") {
    report.actions.push({
      action: "pages_custom_domain",
      status: "skipped",
      domain: PAGES_CUSTOM_DOMAIN || null,
      reason: `production_origin_${PRODUCTION_ORIGIN}`,
    });
    return;
  }

  if (!PAGES_CUSTOM_DOMAIN) {
    report.actions.push({
      action: "pages_custom_domain",
      status: "skipped",
      reason: "missing_domain",
    });
    return;
  }

  const endpoint = `/accounts/${ACCOUNT_ID}/pages/projects/${encodeURIComponent(
    PAGES_PROJECT,
  )}/domains/${encodeURIComponent(PAGES_CUSTOM_DOMAIN)}`;
  const existing = await apiRequest("GET", endpoint, null, { allow404: true });
  if (existing.found) {
    report.actions.push({
      action: "pages_custom_domain",
      status: "exists",
      domain: PAGES_CUSTOM_DOMAIN,
      domain_status: existing.result?.status || null,
    });
    return;
  }

  await apiRequest(
    "POST",
    `/accounts/${ACCOUNT_ID}/pages/projects/${encodeURIComponent(
      PAGES_PROJECT,
    )}/domains`,
    { name: PAGES_CUSTOM_DOMAIN },
  );
  report.actions.push({
    action: "pages_custom_domain",
    status: "attached",
    domain: PAGES_CUSTOM_DOMAIN,
  });
}

function dryRunReport() {
  const envVars = publicPagesEnvVars();
  return {
    generated_at: new Date().toISOString(),
    execute: false,
    account_id_present: Boolean(ACCOUNT_ID),
    api_token_present: Boolean(API_TOKEN),
    zone: ZONE_NAME || null,
    zone_type: ZONE_TYPE,
    pages_project: PAGES_PROJECT,
    pages_domain: PAGES_CUSTOM_DOMAIN || null,
    production_origin: PRODUCTION_ORIGIN,
    production_branch: PRODUCTION_BRANCH,
    r2_bucket: R2_BUCKET,
    catalog_worker: CATALOG_WORKER,
    catalog_route: CATALOG_ROUTE,
    pages_env_vars: Object.keys(envVars),
    actions: [
      { action: "verify_token", status: "planned" },
      { action: "verify_account", status: "planned" },
      {
        action: "zone",
        status: ZONE_NAME ? "planned" : "skipped",
        zone: ZONE_NAME || null,
        zone_type: ZONE_TYPE,
      },
      {
        action: "vercel_dns",
        status: PRODUCTION_ORIGIN === "vercel" ? "planned_after_zone" : "skipped",
        name: ZONE_NAME || null,
        content: VERCEL_APEX_A_RECORD,
      },
      { action: "r2_bucket", status: "planned", bucket: R2_BUCKET },
      {
        action: "catalog_worker",
        status: "planned",
        worker: CATALOG_WORKER,
        bucket_binding: R2_BUCKET,
      },
      {
        action: "catalog_worker_route",
        status: ZONE_NAME ? "planned_after_zone" : "skipped",
        route: CATALOG_ROUTE,
        worker: CATALOG_WORKER,
      },
      {
        action: "pages_project",
        status: "planned",
        project: PAGES_PROJECT,
      },
      {
        action: "pages_custom_domain",
        status:
          PRODUCTION_ORIGIN === "pages" && PAGES_CUSTOM_DOMAIN
            ? "planned"
            : "skipped",
        domain: PAGES_CUSTOM_DOMAIN || null,
        reason:
          PRODUCTION_ORIGIN === "pages"
            ? PAGES_CUSTOM_DOMAIN
              ? undefined
              : "missing_domain"
            : `production_origin_${PRODUCTION_ORIGIN}`,
      },
    ],
  };
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  if (!EXECUTE) {
    const report = dryRunReport();
    await writeReport(report);
    console.log(`Cloudflare bootstrap dry-run report=${REPORT_PATH}`);
    return;
  }

  assertExecuteConfig();
  const report = {
    generated_at: new Date().toISOString(),
    execute: true,
    account_id: ACCOUNT_ID,
    zone: ZONE_NAME || null,
    zone_type: ZONE_TYPE,
    pages_project: PAGES_PROJECT,
    pages_domain: PAGES_CUSTOM_DOMAIN || null,
    production_origin: PRODUCTION_ORIGIN,
    production_branch: PRODUCTION_BRANCH,
    r2_bucket: R2_BUCKET,
    catalog_worker: CATALOG_WORKER,
    catalog_route: CATALOG_ROUTE,
    actions: [],
  };

  await ensureToken(report);
  await ensureAccount(report);
  const zone = await ensureZone(report);
  await ensureZoneSecurity(report, zone);
  await ensureVercelDns(report, zone);
  await ensureR2Bucket(report);
  await ensureCatalogWorker(report);
  await ensureCatalogRoute(report, zone);
  await ensurePagesProject(report);
  await ensurePagesDomain(report);
  await writeReport(report);
  console.log(`Cloudflare bootstrap complete report=${REPORT_PATH}`);
}

main().catch(async (error) => {
  const report = {
    generated_at: new Date().toISOString(),
    execute: EXECUTE,
    failed: true,
    message: error instanceof Error ? error.message : String(error),
  };
  await writeReport(report).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
