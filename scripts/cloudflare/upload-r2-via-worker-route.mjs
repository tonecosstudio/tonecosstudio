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

const PLAN_PATH = path.resolve(
  argValue(
    "plan",
    "tmp/dragon-ball-live/telegram_webp_storage_upload_plan.json",
  ),
);
const REPORT_PATH = path.resolve(
  argValue(
    "report",
    "tmp/dragon-ball-live/dragon-ball-worker-upload-report.json",
  ),
);
const BASE_URL = (
  argValue(
    "base-url",
    process.env.VITE_CATALOG_ASSET_BASE_URL || "https://ordax.com.br",
  ) || "https://ordax.com.br"
).replace(/\/+$/, "");
const TOKEN = argValue("token", process.env.ORDAX_CATALOG_UPLOAD_TOKEN || "");
const CONCURRENCY = Math.max(
  1,
  Number.parseInt(argValue("concurrency", "8"), 10) || 8,
);
const LIMIT = Number.parseInt(argValue("limit", ""), 10);
const OFFSET = Number.parseInt(argValue("offset", "0"), 10) || 0;

if (!TOKEN) {
  throw new Error("Missing --token or ORDAX_CATALOG_UPLOAD_TOKEN.");
}

function encodeStoragePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function uploadOperation(operation) {
  const body = await fs.readFile(operation.local_path);
  const response = await fetch(
    `${BASE_URL}/${encodeStoragePath(operation.storage_path)}`,
    {
      method: "PUT",
      headers: {
        "x-ordax-upload-token": TOKEN,
        "content-type": operation.content_type || "image/webp",
        "cache-control":
          operation.cache_control || "public, max-age=31536000, immutable",
      },
      body,
    },
  );

  return {
    operation_id: operation.operation_id,
    storage_path: operation.storage_path,
    local_path: operation.local_path,
    status: response.status,
    ok: response.ok,
    response_text: response.ok ? null : await response.text(),
  };
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await next();
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()),
  );
  return results;
}

const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
let operations = (plan.operations || []).filter(
  (operation) => operation.status === "ready_for_upload",
);
if (OFFSET > 0) operations = operations.slice(OFFSET);
if (Number.isFinite(LIMIT) && LIMIT > 0) operations = operations.slice(0, LIMIT);

const startedAt = new Date().toISOString();
const results = await runPool(operations, uploadOperation);
const finishedAt = new Date().toISOString();

const failed = results.filter((item) => !item.ok);
const report = {
  started_at: startedAt,
  finished_at: finishedAt,
  base_url: BASE_URL,
  plan_path: PLAN_PATH,
  total: operations.length,
  uploaded: results.length - failed.length,
  failed: failed.length,
  failures: failed.slice(0, 50),
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) process.exitCode = 1;
