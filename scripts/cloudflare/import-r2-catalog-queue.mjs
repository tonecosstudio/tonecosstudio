import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { defaultTelegramWebpOutput } from "../catalog/telegram-paths.mjs";

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

const WEBP_OUTPUT = path.resolve(
  argValue("output", process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput()),
);
const PLAN_PATH = path.resolve(
  argValue(
    "plan",
    path.join(
      WEBP_OUTPUT,
      "manifests",
      "site_import",
      "telegram_webp_catalog_db_import_plan.json",
    ),
  ),
);
const REPORT_PATH = path.resolve(
  argValue(
    "report",
    process.env.CLOUDFLARE_R2_QUEUE_REPORT ||
      "tmp/cloudflare-r2-catalog-queue-report.json",
  ),
);
const EXECUTE = argFlag("execute") || process.env.CLOUDFLARE_R2_QUEUE_EXECUTE === "true";
const LIMIT = Number.parseInt(argValue("limit", ""), 10);
const STORAGE_BUCKET = argValue("storage-bucket", "cloudflare-r2");
const ASSET_BASE_URL = (
  argValue(
    "asset-base-url",
    process.env.VITE_CATALOG_ASSET_BASE_URL ||
      process.env.CATALOG_ASSET_BASE_URL ||
      "",
  ) || ""
).replace(/\/+$/, "");
const ALLOW_LOCKED_UPDATES =
  argFlag("allow-locked-updates") ||
  process.env.CLOUDFLARE_R2_ALLOW_LOCKED_QUEUE_UPDATES === "true";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCKED_STATUSES = new Set(["published", "duplicate", "rejected", "hidden"]);
const QUEUE_COLUMNS = [
  "source_type",
  "import_batch_id",
  "source_folder_id",
  "source_folder_name",
  "source_drive_path",
  "source_file_id",
  "source_file_url",
  "file_name",
  "mime_type",
  "original_size_bytes",
  "storage_bucket",
  "storage_path",
  "thumbnail_url",
  "image_hash",
  "status",
  "proposed_name",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "media_type",
  "category",
  "subcategory",
  "tags",
  "catalog_visibility",
  "collection_id",
  "confidence",
  "notes",
  "original_sha256",
  "optimized_sha256",
  "perceptual_hash",
  "perceptual_hash_algorithm",
  "canonical_identity_key",
  "duplicate_status",
  "duplicate_of_import_item_id",
  "duplicate_of_model_id",
  "duplicate_distance",
  "image_width",
  "image_height",
  "image_format",
  "name_review_status",
  "visual_review_status",
  "analysis_notes",
];

const supabase =
  EXECUTE && SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function encodeAssetPath(value) {
  return normalizeRelpath(value)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function thumbnailStoragePath(row) {
  if (row.thumbnail_storage_path_for_future_schema) {
    return row.thumbnail_storage_path_for_future_schema;
  }
  const match = String(row.analysis_notes || "").match(
    /thumbnail_storage_path=([^;]+)/,
  );
  return match?.[1] || null;
}

function thumbnailUrl(row) {
  if (row.thumbnail_url) return row.thumbnail_url;
  const thumbPath = thumbnailStoragePath(row);
  if (!ASSET_BASE_URL || !thumbPath) return null;
  return `${ASSET_BASE_URL}/${encodeAssetPath(thumbPath)}`;
}

function queuePayload(row, importBatchId = null) {
  const payload = {};
  for (const column of QUEUE_COLUMNS) {
    if (column in row) payload[column] = row[column];
  }

  payload.import_batch_id = importBatchId;
  payload.storage_bucket = STORAGE_BUCKET;
  payload.storage_path = normalizeRelpath(row.storage_path);
  payload.thumbnail_url = thumbnailUrl(row);
  payload.source_type = row.source_type || "bulk_import";
  payload.status = row.status || "approved";
  payload.catalog_visibility = row.catalog_visibility || "hidden";
  payload.tags = Array.isArray(row.tags) ? row.tags : [];
  payload.confidence = row.confidence ?? 1;
  payload.updated_at = new Date().toISOString();
  return payload;
}

function batchPayload(plan, summary, status) {
  const sourceBatch = plan.summary?.batch || {};
  const now = new Date().toISOString();
  return {
    source_type: sourceBatch.source_type || "bulk_import",
    import_slug:
      sourceBatch.import_slug || "telegram-webp-final-cloudflare-r2",
    source_folder_id: sourceBatch.source_folder_id || null,
    source_folder_name: sourceBatch.source_folder_name || null,
    source_drive_path: sourceBatch.source_drive_path || null,
    source_title: sourceBatch.source_title || "Telegram WebP Final",
    manifest_path: PLAN_PATH,
    report_path: REPORT_PATH,
    status,
    dry_run: false,
    validate_only: false,
    manifest_total: Number(sourceBatch.manifest_total) || summary.validated,
    valid_count: summary.validated,
    rejected_count: Number(sourceBatch.rejected_count) || 0,
    imported_count: summary.inserted,
    updated_count: summary.updated,
    skipped_count: summary.skipped_locked + summary.skipped_existing,
    failed_count: summary.failed,
    error_message: summary.failed ? "See import report for failures." : null,
    updated_at: now,
    ...(status !== "running" ? { finished_at: now } : {}),
  };
}

function assertExecuteConfig() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!ASSET_BASE_URL) {
    throw new Error(
      "Missing VITE_CATALOG_ASSET_BASE_URL/CATALOG_ASSET_BASE_URL for R2 thumbnail URLs.",
    );
  }
}

async function ensureCatalogQueueReady() {
  const { error } = await supabase
    .from("catalog_import_items")
    .select("id")
    .limit(1);
  if (error) throw error;
}

async function createImportBatch(plan, summary) {
  const { data, error } = await supabase
    .from("catalog_import_batches")
    .insert(batchPayload(plan, summary, "running"))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function finishImportBatch(batchId, plan, summary) {
  if (!batchId) return;
  const status = summary.failed > 0 ? "completed_with_errors" : "completed";
  const { error } = await supabase
    .from("catalog_import_batches")
    .update(batchPayload(plan, summary, status))
    .eq("id", batchId);
  if (error) throw error;
}

async function existingQueueItems(sourceFileIds) {
  const existing = new Map();
  for (const ids of chunk(sourceFileIds, 100)) {
    const { data, error } = await supabase
      .from("catalog_import_items")
      .select("id,source_file_id,status")
      .in("source_file_id", ids);
    if (error) throw error;
    for (const item of data || []) {
      if (item.source_file_id) existing.set(item.source_file_id, item);
    }
  }
  return existing;
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  if (EXECUTE) assertExecuteConfig();

  const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  let rows = plan.queue_rows || [];
  if (Number.isFinite(LIMIT) && LIMIT > 0) rows = rows.slice(0, LIMIT);

  const report = {
    generated_at: new Date().toISOString(),
    execute: EXECUTE,
    plan_path: PLAN_PATH,
    report_path: REPORT_PATH,
    storage_bucket: STORAGE_BUCKET,
    asset_base_url: ASSET_BASE_URL || null,
    validated: rows.length,
    inserted: 0,
    updated: 0,
    skipped_existing: 0,
    skipped_locked: 0,
    failed: 0,
    failures: [],
  };

  const invalidRows = rows.filter(
    (row) =>
      !row.source_file_id ||
      !row.file_name ||
      !row.storage_path ||
      !row.proposed_name ||
      !row.character_name ||
      !row.category ||
      !row.subcategory,
  );
  if (invalidRows.length) {
    report.failed = invalidRows.length;
    report.failures = invalidRows.slice(0, 25).map((row) => ({
      source_file_id: row.source_file_id || null,
      file_name: row.file_name || null,
      message: "missing_required_queue_fields",
    }));
    await writeReport(report);
    throw new Error(`Invalid queue rows: ${invalidRows.length}`);
  }

  if (!EXECUTE) {
    await writeReport(report);
    console.log(`Dry-run queue rows=${rows.length} report=${REPORT_PATH}`);
    return;
  }

  await ensureCatalogQueueReady();
  const existing = await existingQueueItems(
    rows.map((row) => row.source_file_id).filter(Boolean),
  );
  const batchId = await createImportBatch(plan, report);

  const insertPayloads = [];
  const updatePayloads = [];
  for (const row of rows) {
    const payload = queuePayload(row, batchId);
    const existingItem = existing.get(row.source_file_id);
    if (!existingItem) {
      insertPayloads.push(payload);
      continue;
    }
    if (LOCKED_STATUSES.has(existingItem.status) && !ALLOW_LOCKED_UPDATES) {
      report.skipped_locked += 1;
      continue;
    }
    updatePayloads.push({ id: existingItem.id, payload });
  }

  try {
    for (const payloads of chunk(insertPayloads, 100)) {
      const { error } = await supabase.from("catalog_import_items").insert(payloads);
      if (error) throw error;
      report.inserted += payloads.length;
    }

    for (const item of updatePayloads) {
      const { error } = await supabase
        .from("catalog_import_items")
        .update(item.payload)
        .eq("id", item.id);
      if (error) throw error;
      report.updated += 1;
    }

    report.skipped_existing =
      rows.length - report.inserted - report.updated - report.skipped_locked;
  } catch (error) {
    report.failed += 1;
    report.failures.push({
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await finishImportBatch(batchId, plan, report);
  await writeReport(report);

  if (report.failed > 0) {
    throw new Error(`Queue import failed. Report: ${REPORT_PATH}`);
  }

  console.log(
    `Inserted=${report.inserted} updated=${report.updated} skipped_locked=${report.skipped_locked} report=${REPORT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
