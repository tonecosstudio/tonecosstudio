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
const STORAGE_PLAN = path.resolve(
  argValue(
    "storage-plan",
    path.join(OUTPUT, "manifests", "site_import", "telegram_webp_storage_upload_plan.json"),
  ),
);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OUTPUT, "manifests", "site_import")),
);
const TAG_POLICY_PATH = path.resolve(
  argValue("tag-policy", "src/config/catalog-tag-policy.json"),
);

const IMPORT_SOURCE_TYPE = argValue("source-type", "bulk_import");
const IMPORT_SLUG = argValue("slug", "telegram-webp-final-marvel-dc-2026-06-04");
const STORAGE_BUCKET = argValue(
  "storage-bucket",
  process.env.CLOUDFLARE_CATALOG_STORAGE_BUCKET ||
    process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME ||
    "cloudflare-r2",
);
const ASSET_BASE_URL = argValue(
  "asset-base-url",
  process.env.VITE_CATALOG_ASSET_BASE_URL ||
    process.env.CATALOG_ASSET_BASE_URL ||
    "",
).replace(/\/+$/, "");
const SOURCE_FOLDER_ID = argValue("source-folder-id", "telegram-2370335738-images");
const SOURCE_FOLDER_NAME = argValue("source-folder-name", "telegram-2370335738-images");
const SOURCE_DRIVE_PATH = argValue(
  "source-drive-path",
  "telegram-2370335738-images/ordax-catalogo-webp-final",
);

const JSON_OUT = path.join(OUT_DIR, "telegram_webp_catalog_db_import_plan.json");
const QUEUE_CSV_OUT = path.join(OUT_DIR, "telegram_webp_catalog_import_queue_rows.csv");
const PUBLISH_CSV_OUT = path.join(OUT_DIR, "telegram_webp_catalog_publish_payloads.csv");
const SUMMARY_OUT = path.join(OUT_DIR, "telegram_webp_catalog_db_import_summary.json");

const LEGAL_IMPORT_SOURCE_TYPES = new Set([
  "google_drive",
  "manual_upload",
  "bulk_import",
  "other",
]);
const LEGAL_MEDIA_TYPES = new Set([
  "anime",
  "manga",
  "movie",
  "series",
  "game",
  "comic",
  "tokusatsu",
  "original",
  "other",
]);
const LEGAL_VISIBILITIES = new Set(["general", "collection", "both", "hidden"]);
let publicTagAliases = {};
let publicTagBlocklist = new Set([
  "catalogo",
  "geral",
  "outro",
  "other",
  "default",
  "general",
  "telegram",
  "webp",
]);

const QUEUE_COLUMNS = [
  "source_type",
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
  "thumbnail_storage_path_for_future_schema",
  "thumbnail_sha256_for_future_schema",
  "thumbnail_bytes_for_future_schema",
];

const PUBLISH_COLUMNS = [
  "source_file_id",
  "name",
  "description",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "source_type",
  "media_type",
  "franchise",
  "category",
  "subcategory",
  "tags",
  "catalog_visibility",
  "collection_id",
  "price_mode",
  "price_standalone_override",
  "price_coins_override",
];

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function taxonomyValue(value) {
  return String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function slugish(value) {
  return normalizeComparable(value).replace(/\s+/g, "-") || "item";
}

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function publicAssetUrl(storagePath) {
  const cleanPath = normalizeRelpath(storagePath);
  return ASSET_BASE_URL && cleanPath ? `${ASSET_BASE_URL}/${cleanPath}` : null;
}

function deriveIdentityStemFromPath(filePath) {
  const normalizedPath = normalizeRelpath(filePath).toLowerCase();
  if (!normalizedPath) return "";

  const segments = normalizedPath.split("/");
  const fileName = segments.pop() || "";
  const directory = segments.slice(-4, -1).filter(Boolean);
  const stem = fileName.replace(/\.[^.]+$/, "");
  if (!stem) return "";

  const withoutObjectId = stem.replace(/-\d+$/, "");
  const withoutAngle = withoutObjectId.replace(/-\d+$/, "");
  const productStem = withoutAngle || withoutObjectId || stem;
  return [...directory, productStem].join("|");
}

const VARIANT_PHRASE_LABELS = {
  "final form": "Forma Final",
  throne: "No Trono",
  "figura pair": "Dupla",
  pair: "Dupla",
  "mecha figura": "Mecha",
  "wall figura": "Painel",
};

const GENERIC_VARIANT_WORDS = new Set([
  "figura",
  "estatua",
  "miniatura",
  "modelo",
  "pose",
  "default",
]);

function titleCaseWords(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveVariantNameFromPaths(item) {
  const basePath = item.storage_path || item.display_relpath || "";
  const normalizedPath = normalizeRelpath(basePath).toLowerCase();
  if (!normalizedPath) return null;

  const fileName = normalizedPath.split("/").pop() || "";
  const stem = fileName.replace(/\.[^.]+$/, "");
  if (!stem) return null;

  const withoutObjectId = stem.replace(/-\d+$/, "");
  const withoutAngle = withoutObjectId.replace(/-\d+$/, "");
  const productStem = withoutAngle || withoutObjectId || stem;
  const characterSlug = slugish(item.character_name || item.name);

  let remainder = productStem;
  if (characterSlug && remainder.startsWith(`${characterSlug}-`)) {
    remainder = remainder.slice(characterSlug.length + 1);
  } else if (characterSlug && remainder === characterSlug) {
    remainder = "";
  }

  if (!remainder) return null;

  const normalizedRemainder = remainder.replace(/-/g, " ").trim();
  if (!normalizedRemainder) return null;
  if (/^\d+$/.test(normalizedRemainder)) return `Versao ${normalizedRemainder}`;
  if (VARIANT_PHRASE_LABELS[normalizedRemainder]) {
    return VARIANT_PHRASE_LABELS[normalizedRemainder];
  }

  const meaningfulWords = normalizedRemainder
    .split(/\s+/)
    .filter((word) => word && !GENERIC_VARIANT_WORDS.has(word));
  if (meaningfulWords.length === 0) return null;
  return titleCaseWords(meaningfulWords.join(" "));
}

function normalizePublicTag(value) {
  const normalized = normalizeComparable(value);
  const aliased = publicTagAliases[normalized] || normalized;
  if (aliased === "sensitive blur") return "sensitive-blur";
  if (aliased === "x 23") return "x-23";
  return aliased.replace(/\s+/g, "-");
}

function isPublicTag(tag) {
  return Boolean(tag) && !publicTagBlocklist.has(tag);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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

function normalizeMediaType(value, category) {
  const normalized = normalizeComparable(value);
  if (normalized === "games" || normalized === "jogos") return "game";
  if (normalized === "filmes") return "movie";
  if (normalized === "series") return "series";
  if (LEGAL_MEDIA_TYPES.has(normalized)) return normalized;
  if (category === "games") return "game";
  return "other";
}

function publicTags(item) {
  const rawTags = Array.isArray(item.tags)
    ? item.tags
    : String(item.tags || "")
        .split(";")
        .map((tag) => tag.trim())
        .filter(Boolean);
  const tags = [];
  const seen = new Set();
  for (const candidate of [
    item.source_title,
    item.character_name,
    item.media_type,
    item.category,
    item.subcategory,
    item.taxonomy_slug,
    ...rawTags,
  ]) {
    const tag = normalizePublicTag(candidate);
    if (!isPublicTag(tag)) continue;
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags.slice(0, 20);
}

function sensitivityTags(item) {
  const text = [
    item.source_file_name,
    item.name,
    item.proposed_name,
    item.character_name,
    item.variant_name,
    item.source_title,
    item.category,
    item.subcategory,
    item.taxonomy_slug,
    item.storage_path,
    item.display_relpath,
    ...(Array.isArray(item.tags) ? item.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]+/g, " ");

  const tags = [];
  const blurPatterns = [
    /\bnude\b/i,
    /\bnaked\b/i,
    /\btopless\b/i,
    /\bnsfw\b/i,
    /\bexplicit\b/i,
    /\blewd\b/i,
    /\bsexy\b/i,
    /\bhentai\b/i,
    /\btentacle\b/i,
    /\bpinup\b/i,
    /\bbondage\b/i,
    /\blingerie\b/i,
    /\bhanging\b/i,
  ];
  const reviewPatterns = [
    /\bbikini\b/i,
    /\bswimsuit\b/i,
    /\bbunny\b/i,
    /\bmaid\b/i,
    /\bshirtless\b/i,
    /\bthicc\b/i,
    /\bbreast\b/i,
    /\bboob/i,
  ];
  const ageAmbiguousPatterns = [
    /\bchibi\b/i,
    /\bschool\b/i,
    /\bschoolgirl\b/i,
    /\bchild\b/i,
    /\bkid\b/i,
    /\banya\b/i,
    /\barale\b/i,
    /\bsakura kinomoto\b/i,
  ];

  if (blurPatterns.some((pattern) => pattern.test(text))) {
    tags.push("nsfw");
    tags.push("sensitive-blur");
  } else if (reviewPatterns.some((pattern) => pattern.test(text))) {
    tags.push("sensitive-review");
  }

  if (ageAmbiguousPatterns.some((pattern) => pattern.test(text))) {
    tags.push("age-ambiguous-review");
  }

  return tags;
}

function catalogTags(item) {
  return Array.from(new Set([...publicTags(item), ...sensitivityTags(item)])).slice(
    0,
    24,
  );
}

function canonicalIdentityKey(item) {
  const storageIdentity =
    deriveIdentityStemFromPath(item.storage_path) ||
    deriveIdentityStemFromPath(item.display_relpath);
  if (storageIdentity) {
    return storageIdentity;
  }

  return [
    item.source_title,
    item.character_name || item.name,
    item.variant_name || item.taxonomy_slug || "default",
  ]
    .map(slugish)
    .join("|");
}

function sourceFileId(item) {
  const messageId = String(item.message_id || "").trim();
  if (messageId) return `telegram:${messageId}`;
  const sha = String(item.original_sha256 || "").trim();
  if (sha) return `telegram-sha:${sha}`;
  return `telegram-import:${slugish(item.import_id || item.source_file_name)}`;
}

function buildBatch(siteSummary, readyCount) {
  return {
    source_type: IMPORT_SOURCE_TYPE,
    import_slug: IMPORT_SLUG,
    source_folder_id: SOURCE_FOLDER_ID,
    source_folder_name: SOURCE_FOLDER_NAME,
    source_drive_path: SOURCE_DRIVE_PATH,
    source_title: "Telegram WebP Final",
    manifest_path: SITE_PLAN,
    report_path: SUMMARY_OUT,
    status: "validate_only",
    dry_run: true,
    validate_only: true,
    manifest_total: siteSummary.total_records || readyCount,
    valid_count: readyCount,
    rejected_count: Number(siteSummary.skipped || 0),
    imported_count: 0,
    updated_count: 0,
    skipped_count: 0,
    failed_count: 0,
    error_message: null,
  };
}

function buildQueueRow(item, uploadByImportId) {
  const upload = uploadByImportId.get(item.import_id) || {};
  const displayUpload = upload.display || {};
  const thumbUpload = upload.thumb || {};
  const mediaType = normalizeMediaType(item.media_type, item.category);
  const tags = catalogTags({ ...item, media_type: mediaType });
  const name = cleanName(item.proposed_name || item.name);
  const characterName = cleanName(item.character_name || item.proposed_name || item.name);
  const variantName = cleanName(item.variant_name) || deriveVariantNameFromPaths({
    ...item,
    character_name: characterName,
    name,
  });
  const sourceTitle = cleanName(item.source_title);
  const sourceFileName = item.source_file_name || path.posix.basename(item.display_relpath || "");
  const thumbPath = normalizeRelpath(item.thumbnail_storage_path);

  return {
    source_type: IMPORT_SOURCE_TYPE,
    source_folder_id: SOURCE_FOLDER_ID,
    source_folder_name: SOURCE_FOLDER_NAME,
    source_drive_path: `${SOURCE_DRIVE_PATH}/${sourceFileName}`,
    source_file_id: sourceFileId(item),
    source_file_url: null,
    file_name: sourceFileName,
    mime_type: "image/webp",
    original_size_bytes: null,
    storage_bucket: STORAGE_BUCKET,
    storage_path: normalizeRelpath(item.storage_path),
    thumbnail_url: publicAssetUrl(thumbPath),
    image_hash: displayUpload.sha256 || item.original_sha256 || null,
    status: "approved",
    proposed_name: name,
    character_name: characterName || name,
    variant_name: variantName || null,
    variant_type: item.variant_type || "default",
    source_title: sourceTitle || null,
    media_type: mediaType,
    category: taxonomyValue(item.category) || null,
    subcategory: taxonomyValue(item.subcategory) || null,
    tags,
    catalog_visibility: item.catalog_visibility || "general",
    collection_id: null,
    confidence: 1,
    notes:
      "Plano local Telegram WebP final. Display WebP pronto; thumb path preservado no plano, nao no schema atual.",
    original_sha256: item.original_sha256 || null,
    optimized_sha256: displayUpload.sha256 || null,
    perceptual_hash: null,
    perceptual_hash_algorithm: "dhash64-v1",
    canonical_identity_key: canonicalIdentityKey({
      ...item,
      media_type: mediaType,
      character_name: characterName,
      source_title: sourceTitle,
    }),
    duplicate_status: item.duplicate_status || "unique",
    duplicate_of_import_item_id: null,
    duplicate_of_model_id: null,
    duplicate_distance: null,
    image_width: Number(item.image_width) || null,
    image_height: Number(item.image_height) || null,
    image_format: "webp",
    name_review_status: item.name_review_status || "approved",
    visual_review_status: item.visual_review_status || "approved",
    analysis_notes: `thumbnail_storage_path=${thumbPath}; thumbnail_sha256=${thumbUpload.sha256 || ""}; thumbnail_bytes=${thumbUpload.actual_bytes || item.thumb_bytes || ""}`,
    thumbnail_storage_path_for_future_schema: thumbPath || null,
    thumbnail_sha256_for_future_schema: thumbUpload.sha256 || null,
    thumbnail_bytes_for_future_schema: thumbUpload.actual_bytes || Number(item.thumb_bytes) || null,
  };
}

function buildPublishPayload(row) {
  return {
    source_file_id: row.source_file_id,
    name: row.proposed_name,
    description: null,
    character_name: row.character_name,
    variant_name: row.variant_name,
    variant_type: row.variant_type,
    source_title: row.source_title,
    source_type: row.media_type,
    media_type: row.media_type,
    franchise: row.source_title,
    category: row.category,
    subcategory: row.subcategory,
    tags: row.tags,
    catalog_visibility: row.catalog_visibility,
    collection_id: null,
    price_mode: "consultation",
    price_standalone_override: null,
    price_coins_override: null,
  };
}

function validateRow(row) {
  const errors = [];
  if (!LEGAL_IMPORT_SOURCE_TYPES.has(row.source_type)) errors.push("invalid_queue_source_type");
  if (!LEGAL_MEDIA_TYPES.has(row.media_type)) errors.push("invalid_media_type");
  if (!LEGAL_VISIBILITIES.has(row.catalog_visibility)) errors.push("invalid_catalog_visibility");
  if (!row.source_file_id) errors.push("missing_source_file_id");
  if (!row.file_name) errors.push("missing_file_name");
  if (!row.storage_bucket) errors.push("missing_storage_bucket");
  if (!row.storage_path) errors.push("missing_storage_path");
  if (!row.proposed_name) errors.push("missing_proposed_name");
  if (!row.character_name) errors.push("missing_character_name");
  if (!row.source_title) errors.push("missing_source_title");
  if (!row.category) errors.push("missing_category");
  if (!row.subcategory) errors.push("missing_subcategory");
  if (row.status !== "approved") errors.push("status_not_approved");
  if (row.name_review_status !== "approved") errors.push("name_not_approved");
  if (row.visual_review_status !== "approved") errors.push("visual_not_approved");
  return errors;
}

async function writeCsv(filePath, columns, rows) {
  const csvRows = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ];
  await fs.writeFile(filePath, `${csvRows.join("\n")}\n`, "utf8");
}

async function loadTagPolicy() {
  try {
    const policy = JSON.parse(await fs.readFile(TAG_POLICY_PATH, "utf8"));
    publicTagAliases = policy.publicTagAliases || {};
    publicTagBlocklist = new Set([
      ...(policy.publicTagBlocklist || []),
      "telegram",
      "webp",
    ]);
  } catch {
    // The plan can still be generated with the conservative fallback above.
  }
}

function buildUploadIndex(storagePlan) {
  const uploadByImportId = new Map();
  for (const operation of storagePlan.operations || []) {
    if (operation.status !== "ready_for_upload") continue;
    const current = uploadByImportId.get(operation.import_id) || {};
    current[operation.asset_role] = operation;
    uploadByImportId.set(operation.import_id, current);
  }
  return uploadByImportId;
}

async function main() {
  if (ASSET_BASE_URL) {
    let origin;
    try {
      origin = new URL(ASSET_BASE_URL);
    } catch {
      throw new Error("Invalid catalog asset origin.");
    }
    if (
      origin.protocol !== "https:" || origin.username || origin.password ||
      origin.search || origin.hash || origin.pathname !== "/" ||
      origin.hostname === "ordax.com.br" ||
      origin.hostname.endsWith(".ordax.com.br") ||
      origin.hostname.endsWith(".vercel.app")
    ) {
      throw new Error("A dedicated HTTPS Tonecos media origin is required; OrdaX domains are forbidden.");
    }
  }
  await loadTagPolicy();

  if (!LEGAL_IMPORT_SOURCE_TYPES.has(IMPORT_SOURCE_TYPE)) {
    throw new Error(`Invalid --source-type for current schema: ${IMPORT_SOURCE_TYPE}`);
  }

  const sitePlan = JSON.parse(await fs.readFile(SITE_PLAN, "utf8"));
  const storagePlan = JSON.parse(await fs.readFile(STORAGE_PLAN, "utf8"));
  const uploadByImportId = buildUploadIndex(storagePlan);
  const readyItems = (sitePlan.items || []).filter((item) => item.status === "ready_for_import" && !isPrivateCuradoriaRecord(item));
  const queueRows = readyItems.map((item) => buildQueueRow(item, uploadByImportId));
  const publishPayloads = queueRows.map(buildPublishPayload);

  const validationRows = queueRows.map((row) => ({
    source_file_id: row.source_file_id,
    errors: validateRow(row),
  }));
  const invalidRows = validationRows.filter((row) => row.errors.length > 0);

  const sourceFileIdCounts = countBy(queueRows, "source_file_id");
  const duplicateSourceFileIds = Object.entries(sourceFileIdCounts)
    .filter(([sourceFileId, count]) => sourceFileId && count > 1)
    .map(([sourceFileId]) => sourceFileId);

  const summary = {
    generated_at: new Date().toISOString(),
    site_plan: SITE_PLAN,
    storage_plan: STORAGE_PLAN,
    import_source_type: IMPORT_SOURCE_TYPE,
    current_schema_compatible: invalidRows.length === 0 && duplicateSourceFileIds.length === 0,
    source_type_policy:
      "Usa bulk_import porque o schema atual de catalog_import_items nao aceita telegram_webp_final como source_type.",
    thumbnail_policy:
      "O schema atual publica display em storage_path e usa thumbnail_url publica para o thumb WebP.",
    storage_bucket: STORAGE_BUCKET,
    asset_base_url: ASSET_BASE_URL,
    ready_import_items: readyItems.length,
    queue_rows: queueRows.length,
    publish_payloads: publishPayloads.length,
    invalid_rows: invalidRows.length,
    duplicate_source_file_ids: duplicateSourceFileIds.length,
    by_media_type: countBy(queueRows, "media_type"),
    by_category: countBy(queueRows, "category"),
    by_subcategory: countBy(queueRows, "subcategory"),
    by_sensitive_tag: {
      "sensitive-blur": queueRows.filter((row) =>
        row.tags.includes("sensitive-blur"),
      ).length,
      "sensitive-review": queueRows.filter((row) =>
        row.tags.includes("sensitive-review"),
      ).length,
      "age-ambiguous-review": queueRows.filter((row) =>
        row.tags.includes("age-ambiguous-review"),
      ).length,
    },
    batch: buildBatch(sitePlan.summary || {}, readyItems.length),
    outputs: {
      json: JSON_OUT,
      queue_csv: QUEUE_CSV_OUT,
      publish_csv: PUBLISH_CSV_OUT,
      summary: SUMMARY_OUT,
    },
    note: "Plano local somente. Nao insere filas, nao publica modelos e nao conecta no Supabase.",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(
      JSON_OUT,
      `${JSON.stringify({ summary, queue_rows: queueRows, publish_payloads: publishPayloads, invalid_rows: invalidRows }, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeCsv(QUEUE_CSV_OUT, QUEUE_COLUMNS, queueRows),
    writeCsv(PUBLISH_CSV_OUT, PUBLISH_COLUMNS, publishPayloads),
  ]);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
