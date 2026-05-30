import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_PATH = join(ROOT, "tmp", "catalog-ready-publish-report.json");
const CATALOG_TAG_POLICY_PATH = join(
  ROOT,
  "src",
  "config",
  "catalog-tag-policy.json",
);
const catalogTagPolicy = JSON.parse(
  readFileSync(CATALOG_TAG_POLICY_PATH, "utf8"),
);
const INTERNAL_TAG_PREFIXES = catalogTagPolicy.internalTagPrefixes;
const INTERNAL_TAGS = new Set(catalogTagPolicy.internalTags);
const PUBLIC_TAG_ALIASES = catalogTagPolicy.publicTagAliases || {};
const PUBLIC_TAG_BLOCKLIST = new Set(catalogTagPolicy.publicTagBlocklist || []);

function loadEnvFile(fileName) {
  const filePath = join(ROOT, fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePublicTag(value) {
  const normalized = cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
  return PUBLIC_TAG_ALIASES[normalized] || normalized;
}

function isInternalTag(tag) {
  const canonicalTag = tag.replace(/\s+/g, "-");
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

function isPublicTag(tag) {
  return Boolean(tag) && !isInternalTag(tag) && !PUBLIC_TAG_BLOCKLIST.has(tag);
}

function buildPublicTags(item) {
  const candidates = [
    item.source_title || item.source_folder_name,
    item.character_name,
    item.media_type === "anime" ? "anime" : item.media_type,
    item.category,
    item.subcategory,
    ...(item.tags || []),
  ];

  const tags = candidates.map(normalizePublicTag).filter(isPublicTag);

  return [...new Set(tags)].slice(0, 20);
}

function rejectReason(item) {
  const tags = (item.tags || []).map((tag) => String(tag).toLocaleLowerCase());
  if (item.status === "published") return "already_published";
  if (item.status === "duplicate") return "marked_duplicate";
  if (item.status === "rejected") return "rejected";
  if (item.name_review_status === "needs_review") return "needs_name_review";
  if (item.visual_review_status === "needs_review")
    return "needs_visual_review";
  if (item.duplicate_status && item.duplicate_status !== "unique")
    return "duplicate_candidate";
  if (tags.includes("generic-filename") || tags.includes("needs-name-review")) {
    return "needs_name_review";
  }
  if (tags.includes("needs-visual-review")) return "needs_visual_review";
  if (!item.storage_path) return "missing_storage_path";
  if (!cleanName(item.character_name || item.proposed_name || item.file_name))
    return "missing_name";
  if (!cleanName(item.source_title || item.source_folder_name))
    return "missing_source";
  return null;
}

function buildPayload(item) {
  const name = cleanName(item.proposed_name || item.file_name);
  const characterName = cleanName(
    item.character_name || name.replace(/\s+\([^)]+\)$/, ""),
  );
  const sourceTitle = cleanName(item.source_title || item.source_folder_name);

  return {
    name,
    description: null,
    character_name: characterName || name,
    variant_name: cleanName(item.variant_name) || null,
    variant_type: item.variant_type || "default",
    source_title: sourceTitle || null,
    media_type: item.media_type || "other",
    franchise: sourceTitle || null,
    category: cleanName(item.category) || null,
    subcategory: cleanName(item.subcategory) || null,
    tags: buildPublicTags(item),
    catalog_visibility: "general",
    collection_id: null,
    price_mode: "consultation",
    price_standalone_override: null,
    price_coins_override: null,
  };
}

const selectColumns = [
  "id",
  "source_folder_name",
  "file_name",
  "storage_path",
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
  "published_model_id",
  "duplicate_status",
  "name_review_status",
  "visual_review_status",
].join(",");

const { data: items, error } = await supabase
  .from("catalog_import_items")
  .select(selectColumns)
  .order("created_at", { ascending: true });

if (error) throw error;

const ready = [];
const skipped = [];

for (const item of items || []) {
  const reason = rejectReason(item);
  if (reason) {
    skipped.push({
      id: item.id,
      name: item.proposed_name || item.file_name,
      reason,
    });
  } else {
    ready.push({ item, payload: buildPayload(item) });
  }
}

const published = [];
const failed = [];

if (!DRY_RUN) {
  for (const entry of ready) {
    const { data, error: publishError } = await supabase.rpc(
      "admin_publish_catalog_import_item",
      {
        p_queue_id: entry.item.id,
        p_payload: entry.payload,
      },
    );

    if (publishError) {
      failed.push({
        id: entry.item.id,
        name: entry.payload.name,
        message: publishError.message,
      });
      continue;
    }

    published.push({
      queue_id: entry.item.id,
      model_id: data,
      name: entry.payload.name,
      tags: entry.payload.tags,
    });
  }
}

mkdirSync(join(ROOT, "tmp"), { recursive: true });
writeFileSync(
  REPORT_PATH,
  JSON.stringify(
    {
      dry_run: DRY_RUN,
      ready: ready.map((entry) => ({
        id: entry.item.id,
        name: entry.payload.name,
        tags: entry.payload.tags,
      })),
      skipped,
      published,
      failed,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      dry_run: DRY_RUN,
      ready: ready.length,
      skipped: skipped.length,
      published: published.length,
      failed: failed.length,
      report: REPORT_PATH,
    },
    null,
    2,
  ),
);

if (failed.length > 0) process.exitCode = 1;
