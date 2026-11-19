import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";
import { isPrivateCuradoriaRecord } from "./telegram-private-staging-gate.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const SITE_PLAN = path.resolve(
  argValue(
    "site-plan",
    path.join(OUTPUT, "manifests", "site_import", "telegram_webp_site_import_plan.json"),
  ),
);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OUTPUT, "manifests", "site_import")),
);

const JSON_OUT = path.join(OUT_DIR, "telegram_webp_storage_upload_plan.json");
const CSV_OUT = path.join(OUT_DIR, "telegram_webp_storage_upload_plan.csv");
const READY_CSV_OUT = path.join(OUT_DIR, "telegram_webp_storage_upload_ready.csv");
const SUMMARY_OUT = path.join(OUT_DIR, "telegram_webp_storage_upload_summary.json");

const CSV_COLUMNS = [
  "operation_id",
  "status",
  "reject_reason",
  "asset_role",
  "import_id",
  "storage_bucket",
  "storage_path",
  "local_relpath",
  "local_path",
  "content_type",
  "cache_control",
  "recommended_upsert",
  "expected_bytes",
  "actual_bytes",
  "sha256",
  "source_file_name",
  "message_id",
  "original_sha256",
  "name",
  "category",
  "subcategory",
  "taxonomy_slug",
];

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function bucketBytes(items, key) {
  const buckets = {};
  for (const item of items) {
    const value = item[key] || "";
    buckets[value] = (buckets[value] || 0) + Number(item.actual_bytes || 0);
  }
  return Object.fromEntries(
    Object.entries(buckets).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

async function fileInfo(filePath) {
  const buffer = await fs.readFile(filePath);
  return {
    bytes: buffer.byteLength,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

function rejectReason(operation, duplicatePaths) {
  if (!operation.storage_path) return "missing_storage_path";
  if (!operation.local_relpath) return "missing_local_relpath";
  if (duplicatePaths.has(operation.storage_path)) return "duplicate_storage_path";
  if (operation.actual_bytes == null) return "missing_local_file";
  if (operation.expected_bytes != null && operation.expected_bytes !== operation.actual_bytes) {
    return "byte_size_mismatch";
  }
  return null;
}

function buildBaseOperation(item, assetRole) {
  const isThumb = assetRole === "thumb";
  const storagePath = normalizeRelpath(
    isThumb ? item.thumbnail_storage_path : item.storage_path,
  );
  const localRelpath = normalizeRelpath(isThumb ? item.thumb_relpath : item.display_relpath);

  return {
    operation_id: `${item.import_id}:${assetRole}`,
    asset_role: assetRole,
    import_id: item.import_id,
    storage_bucket: item.storage_bucket || "catalog",
    storage_path: storagePath,
    local_relpath: localRelpath,
    local_path: localRelpath ? path.join(OUTPUT, localRelpath) : null,
    content_type: "image/webp",
    cache_control: "public, max-age=31536000, immutable",
    recommended_upsert: false,
    expected_bytes: Number(isThumb ? item.thumb_bytes : item.display_bytes) || null,
    actual_bytes: null,
    sha256: null,
    source_file_name: item.source_file_name || null,
    message_id: item.message_id || null,
    original_sha256: item.original_sha256 || null,
    name: item.name || null,
    category: item.category || null,
    subcategory: item.subcategory || null,
    taxonomy_slug: item.taxonomy_slug || null,
  };
}

async function enrichOperation(operation) {
  if (!operation.local_path) return operation;
  try {
    const info = await fileInfo(operation.local_path);
    operation.actual_bytes = info.bytes;
    operation.sha256 = info.sha256;
  } catch {
    operation.actual_bytes = null;
    operation.sha256 = null;
  }
  return operation;
}

async function writeCsv(filePath, items) {
  const rows = [
    CSV_COLUMNS.join(","),
    ...items.map((item) => CSV_COLUMNS.map((column) => csvEscape(item[column])).join(",")),
  ];
  await fs.writeFile(filePath, `${rows.join("\n")}\n`, "utf8");
}

async function main() {
  const sitePlan = JSON.parse(await fs.readFile(SITE_PLAN, "utf8"));
  const items = Array.isArray(sitePlan.items) ? sitePlan.items : [];
  const readyItems = items.filter((item) => item.status === "ready_for_import" && !isPrivateCuradoriaRecord(item));

  const operations = [];
  for (const item of readyItems) {
    operations.push(buildBaseOperation(item, "display"));
    operations.push(buildBaseOperation(item, "thumb"));
  }

  const pathCounts = countBy(operations, "storage_path");
  const duplicatePaths = new Set(
    Object.entries(pathCounts)
      .filter(([storagePath, count]) => storagePath && count > 1)
      .map(([storagePath]) => storagePath),
  );

  for (const operation of operations) {
    await enrichOperation(operation);
    const reject = rejectReason(operation, duplicatePaths);
    operation.status = reject ? "blocked" : "ready_for_upload";
    operation.reject_reason = reject;
  }

  const ready = operations.filter((operation) => operation.status === "ready_for_upload");
  const blocked = operations.filter((operation) => operation.status !== "ready_for_upload");
  const totalBytes = ready.reduce((sum, operation) => sum + Number(operation.actual_bytes || 0), 0);

  const summary = {
    generated_at: new Date().toISOString(),
    site_plan: SITE_PLAN,
    output: OUTPUT,
    ready_import_items: readyItems.length,
    total_operations: operations.length,
    ready_for_upload: ready.length,
    blocked: blocked.length,
    total_ready_bytes: totalBytes,
    total_ready_size: formatBytes(totalBytes),
    average_operation_bytes: ready.length ? Math.round(totalBytes / ready.length) : 0,
    average_operation_size: ready.length ? formatBytes(Math.round(totalBytes / ready.length)) : "0 B",
    by_status: countBy(operations, "status"),
    by_reject_reason: countBy(blocked, "reject_reason"),
    by_asset_role: countBy(ready, "asset_role"),
    by_category: countBy(ready, "category"),
    bytes_by_asset_role: bucketBytes(ready, "asset_role"),
    bytes_by_category: bucketBytes(ready, "category"),
    duplicate_storage_paths: duplicatePaths.size,
    outputs: {
      json: JSON_OUT,
      csv: CSV_OUT,
      ready_csv: READY_CSV_OUT,
      summary: SUMMARY_OUT,
    },
    note: "Plano local somente. Nao faz upload, nao cria bucket e nao publica no Supabase.",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(JSON_OUT, `${JSON.stringify({ summary, operations }, null, 2)}\n`, "utf8"),
    fs.writeFile(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeCsv(CSV_OUT, operations),
    writeCsv(READY_CSV_OUT, ready),
  ]);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
