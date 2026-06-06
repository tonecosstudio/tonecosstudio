import fs from "node:fs/promises";
import path from "node:path";

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
      "C:/Users/Casa/Downloads/ordax-catalogo-webp-final",
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OUTPUT, "manifests", "site_import")),
);
const STORAGE_PREFIX = argValue("storage-prefix", "catalog-webp-final");

const JSON_OUT = path.join(OUT_DIR, "telegram_webp_site_import_plan.json");
const CSV_OUT = path.join(OUT_DIR, "telegram_webp_site_import_plan.csv");
const READY_CSV_OUT = path.join(OUT_DIR, "telegram_webp_site_import_ready.csv");
const SUMMARY_OUT = path.join(OUT_DIR, "telegram_webp_site_import_summary.json");

const CSV_COLUMNS = [
  "import_id",
  "status",
  "reject_reason",
  "source_type",
  "source_file_name",
  "message_id",
  "original_sha256",
  "storage_bucket",
  "storage_path",
  "thumbnail_storage_path",
  "display_relpath",
  "thumb_relpath",
  "name",
  "proposed_name",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "source_type_sugerido",
  "media_type",
  "category",
  "subcategory",
  "taxonomy_slug",
  "catalog_visibility",
  "duplicate_status",
  "name_review_status",
  "visual_review_status",
  "tags",
  "image_width",
  "image_height",
  "image_format",
  "display_bytes",
  "thumb_bytes",
];

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparable(value) {
  return cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function uniqueTags(record, item) {
  const candidates = [
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...(Array.isArray(record.aliases) ? record.aliases : []),
    record.final_category,
    record.taxonomy_group,
    record.taxonomy_slug,
    item.character_name,
    item.source_title,
    item.media_type,
  ];
  const tags = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const tag = normalizeComparable(candidate);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags.slice(0, 24);
}

function mediaType(record) {
  if (record.source_type) return record.source_type;
  if (record.final_category === "games") return "game";
  if (record.final_category === "filmes") return "movie";
  if (record.final_category === "anime") return "anime";
  if (record.final_category === "quadrinhos") return "comic";
  return record.final_category || "other";
}

function rejectReason(record, displayExists, thumbExists) {
  if (record.curation_status === "blocked_review") return "blocked_visual_review";
  if (!displayExists) return "missing_display_file";
  if (!thumbExists) return "missing_thumb_file";
  if (record.curation_status !== "taxonomy_applied") return "needs_ptbr_name_or_taxonomy";
  if (!cleanName(record.public_name_pt_br || record.original_name || record.source_filename)) {
    return "missing_public_name";
  }
  if (!cleanName(record.source_title || record.source_franchise)) return "missing_source_title";
  return null;
}

function importId(record) {
  const identity =
    String(record.message_id || "").trim() ||
    String(record.source_sha256 || "").slice(0, 16) ||
    normalizeComparable(record.source_name).replace(/\s+/g, "-");
  return `telegram-webp-${identity}`;
}

async function buildItem(record) {
  const displayRelpath = normalizeRelpath(record.display_relpath);
  const thumbRelpath = normalizeRelpath(record.thumb_relpath);
  const displayExists = await exists(path.join(OUTPUT, displayRelpath));
  const thumbExists = await exists(path.join(OUTPUT, thumbRelpath));
  const name = cleanName(record.public_name_pt_br || record.original_name || record.source_filename);
  const sourceTitle = cleanName(record.source_title || record.source_franchise);
  const reject = rejectReason(record, displayExists, thumbExists);
  const status = reject ? "skipped" : "ready_for_import";

  const item = {
    import_id: importId(record),
    status,
    reject_reason: reject,
    source_type: "telegram_webp_final",
    source_file_name: record.source_name || null,
    message_id: record.message_id || null,
    original_sha256: record.source_sha256 || null,
    storage_bucket: "catalog",
    storage_path: normalizeRelpath(path.posix.join(STORAGE_PREFIX, displayRelpath)),
    thumbnail_storage_path: normalizeRelpath(path.posix.join(STORAGE_PREFIX, thumbRelpath)),
    display_relpath: displayRelpath,
    thumb_relpath: thumbRelpath,
    name,
    proposed_name: name,
    character_name: cleanName(record.public_name_pt_br || record.taxonomy_slug || record.original_name || name),
    variant_name: null,
    variant_type: "default",
    source_title: sourceTitle || null,
    source_type_sugerido: record.source_type || null,
    media_type: mediaType(record),
    category: record.final_category || null,
    subcategory: record.taxonomy_group || record.source_franchise || null,
    taxonomy_slug: record.taxonomy_slug || null,
    catalog_visibility: "general",
    duplicate_status: "unique",
    name_review_status: status === "ready_for_import" ? "approved" : "needs_review",
    visual_review_status: record.curation_status === "blocked_review" ? "needs_review" : "approved",
    tags: [],
    image_width: record.display_width || null,
    image_height: record.display_height || null,
    image_format: "webp",
    display_bytes: record.display_bytes || null,
    thumb_bytes: record.thumb_bytes || null,
  };
  item.tags = uniqueTags(record, item);
  return item;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function writeCsv(filePath, items) {
  const rows = [
    CSV_COLUMNS.join(","),
    ...items.map((item) => CSV_COLUMNS.map((column) => csvEscape(item[column])).join(",")),
  ];
  await fs.writeFile(filePath, `${rows.join("\n")}\n`, "utf8");
}

async function main() {
  const records = await readJsonl(MANIFEST);
  const items = [];
  for (const record of records) items.push(await buildItem(record));

  const ready = items.filter((item) => item.status === "ready_for_import");
  const skipped = items.filter((item) => item.status !== "ready_for_import");
  const summary = {
    generated_at: new Date().toISOString(),
    manifest: MANIFEST,
    output: OUTPUT,
    storage_prefix: STORAGE_PREFIX,
    total_records: records.length,
    ready_for_import: ready.length,
    skipped: skipped.length,
    by_status: countBy(items, "status"),
    by_reject_reason: countBy(skipped, "reject_reason"),
    by_category_ready: countBy(ready, "category"),
    by_subcategory_ready: countBy(ready, "subcategory"),
    outputs: {
      json: JSON_OUT,
      csv: CSV_OUT,
      ready_csv: READY_CSV_OUT,
      summary: SUMMARY_OUT,
    },
    note: "Plano local somente. Nao faz upload e nao publica no Supabase.",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(JSON_OUT, `${JSON.stringify({ summary, items }, null, 2)}\n`, "utf8"),
    fs.writeFile(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeCsv(CSV_OUT, items),
    writeCsv(READY_CSV_OUT, ready),
  ]);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
