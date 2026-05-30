import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPORT_PATH = argValue(
  "report",
  process.env.CATALOG_DB_READINESS_REPORT_PATH ||
    "tmp/catalog-db-readiness-report.json",
);

const REQUIRED_MIGRATIONS = [
  "20260528101000_catalog_import_curation_queue",
  "20260528102000_catalog_publish_import_rpc",
  "20260529110000_catalog_dedupe_identity",
  "20260530100000_catalog_publish_dedupe_metadata",
  "20260530101000_catalog_import_batches",
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function errorSummary(error) {
  if (!error) return null;
  return {
    code: error.code || null,
    message: error.message || String(error),
  };
}

function readiness(ok, detail = {}) {
  return {
    ok,
    ...detail,
  };
}

async function probe(name, action) {
  try {
    const { error } = await action();
    if (error) {
      return readiness(false, { name, error: errorSummary(error) });
    }
    return readiness(true, { name, error: null });
  } catch (error) {
    return readiness(false, { name, error: errorSummary(error) });
  }
}

async function main() {
  const checks = await Promise.all([
    probe("catalog_import_items core queue", () =>
      supabase
        .from("catalog_import_items")
        .select(
          "id,source_file_id,status,storage_path,original_sha256,optimized_sha256,perceptual_hash,canonical_identity_key,duplicate_status,import_batch_id",
        )
        .limit(1),
    ),
    probe("catalog_import_batches audit table", () =>
      supabase
        .from("catalog_import_batches")
        .select(
          "id,import_slug,status,manifest_total,valid_count,rejected_count,imported_count,updated_count,skipped_count,failed_count,started_at,finished_at",
        )
        .limit(1),
    ),
    probe("models professional catalog fields", () =>
      supabase
        .from("models")
        .select(
          "id,price_mode,catalog_visibility,source_type,character_name,source_title,original_sha256,optimized_sha256,perceptual_hash,canonical_identity_key,duplicate_status,image_width,image_height,image_format",
        )
        .limit(1),
    ),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    requiredMigrations: REQUIRED_MIGRATIONS,
    ok: checks.every((check) => check.ok),
    checks,
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
