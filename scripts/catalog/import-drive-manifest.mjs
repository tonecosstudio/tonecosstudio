import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MANIFEST_PATH = argValue(
  "manifest",
  process.env.DRIVE_ITEMS_PATH || "tmp/drive-folder-items.json",
);
const IMPORT_SLUG = argValue("slug", process.env.IMPORT_SLUG || "catalogo");
const IMPORT_BUCKET = argValue("bucket", process.env.IMPORT_BUCKET || "models");
const IMPORT_SOURCE_FOLDER_ID = argValue(
  "source-folder-id",
  process.env.IMPORT_SOURCE_FOLDER_ID,
);
const IMPORT_SOURCE_FOLDER_NAME = argValue(
  "source-folder-name",
  process.env.IMPORT_SOURCE_FOLDER_NAME,
);
const IMPORT_SOURCE_DRIVE_PATH = argValue(
  "source-drive-path",
  process.env.IMPORT_SOURCE_DRIVE_PATH || IMPORT_SOURCE_FOLDER_NAME,
);
const IMPORT_SOURCE_TITLE = argValue(
  "source-title",
  process.env.IMPORT_SOURCE_TITLE || IMPORT_SOURCE_FOLDER_NAME,
);
const IMPORT_MEDIA_TYPE = argValue(
  "media-type",
  process.env.IMPORT_MEDIA_TYPE || "other",
);
const IMPORT_CATEGORY = argValue("category", process.env.IMPORT_CATEGORY);
const IMPORT_SUBCATEGORY = argValue(
  "subcategory",
  process.env.IMPORT_SUBCATEGORY,
);
const IMPORT_VISIBILITY = argValue(
  "visibility",
  process.env.IMPORT_VISIBILITY || "hidden",
);
const IMPORT_COLLECTION_ID = argValue(
  "collection-id",
  process.env.IMPORT_COLLECTION_ID,
);
const IMPORT_CONTEXT = argValue(
  "context",
  process.env.IMPORT_CONTEXT || "category",
);
const IMPORT_SOURCE_TITLE_MODE = argValue(
  "source-title-mode",
  process.env.IMPORT_SOURCE_TITLE_MODE || "auto",
);
const IMPORT_LIMIT = Number.parseInt(
  argValue("limit", process.env.IMPORT_LIMIT || "") || "",
  10,
);
const REPORT_PATH = argValue(
  "report",
  process.env.IMPORT_REPORT_PATH || "tmp/catalog-drive-import-report.json",
);
const IMPORT_BATCH_ID = argValue("batch-id", process.env.IMPORT_BATCH_ID);
const DRY_RUN = argFlag("dry-run") || process.env.DRY_RUN === "true";
const VALIDATE_ONLY =
  argFlag("validate-only") || process.env.VALIDATE_ONLY === "true";

if (!DRY_RUN && !VALIDATE_ONLY && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  throw new Error(
    "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase =
  DRY_RUN || VALIDATE_ONLY
    ? null
    : createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

const LOCKED_QUEUE_STATUSES = new Set([
  "published",
  "duplicate",
  "rejected",
  "hidden",
]);

const GENERIC_FOLDER_NAMES = new Set([
  "catalogo",
  "colecao tonecos",
  "animes desenhos",
  "filmes series",
  "games",
  "tokusatsu cultura japonesa",
  "fisiculturistas",
  "outros",
  "animes",
  "classicos",
]);

const VALID_MEDIA_TYPES = new Set([
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

const VALID_VISIBILITIES = new Set(["general", "collection", "both", "hidden"]);
const VALID_SOURCE_TITLE_MODES = new Set(["auto", "filename", "folder"]);

function assertImportConfig() {
  if (!VALID_MEDIA_TYPES.has(IMPORT_MEDIA_TYPE)) {
    throw new Error(`Invalid --media-type: ${IMPORT_MEDIA_TYPE}`);
  }
  if (!VALID_VISIBILITIES.has(IMPORT_VISIBILITY)) {
    throw new Error(`Invalid --visibility: ${IMPORT_VISIBILITY}`);
  }
  if (
    ["collection", "both"].includes(IMPORT_VISIBILITY) &&
    !IMPORT_COLLECTION_ID
  ) {
    throw new Error(
      "--collection-id is required when --visibility is collection or both.",
    );
  }
  if (!VALID_SOURCE_TITLE_MODES.has(IMPORT_SOURCE_TITLE_MODE)) {
    throw new Error(`Invalid --source-title-mode: ${IMPORT_SOURCE_TITLE_MODE}`);
  }
  if (Number.isFinite(IMPORT_LIMIT) && IMPORT_LIMIT < 1) {
    throw new Error("--limit must be a positive integer.");
  }
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(fileName) {
  return String(fileName || "")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safePathPart(raw) {
  return normalizeComparable(raw).replace(/\s+/g, "-") || "item";
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function rawManifestItems(raw) {
  const files = Array.isArray(raw) ? raw : raw.files;
  if (!Array.isArray(files)) {
    throw new Error("Manifest must be an array or an object with files[].");
  }

  return files;
}

function normalizeManifestItem(item, index) {
  const id = item.id || item.fileId || item.file_id;
  const name =
    item.name ||
    item.title ||
    item.file_name ||
    item.fileName ||
    (id ? `${id}.jpg` : "");
  const mimeType = item.mimeType || item.mime_type || item.mime || "";
  const mediaType = item.mediaType || item.media_type || null;

  return {
    id,
    index,
    name,
    mimeType,
    url:
      item.url ||
      item.webViewLink ||
      item.web_view_link ||
      item.link ||
      (id ? `https://drive.google.com/file/d/${id}/view` : null),
    downloadUrl:
      item.downloadUrl ||
      item.download_url ||
      item.webContentLink ||
      item.web_content_link ||
      item.file_uri?.download_url ||
      item.structuredContent?.download_url ||
      null,
    size: item.size || item.original_size_bytes || null,
    characterName: item.characterName || item.character_name || null,
    variantName: item.variantName || item.variant_name || null,
    sourceTitle: item.sourceTitle || item.source_title || null,
    mediaType,
    category: item.category || null,
    subcategory: item.subcategory || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    notes: item.notes || null,
    localPath: item.localPath || item.local_path || null,
  };
}

function validateManifestItem(item, seenIds) {
  const errors = [];
  const fileOrFolder = item.file_or_folder ?? item.type ?? "file";
  const id = item.id || item.fileId || item.file_id;
  const name = item.name || item.title || item.file_name || item.fileName;
  const mimeType = item.mimeType || item.mime_type || item.mime || "";
  const mediaType = item.mediaType || item.media_type || null;

  if (fileOrFolder !== "file") errors.push("not_a_file");
  if (!id) errors.push("missing_source_file_id");
  if (id && seenIds.has(id)) errors.push("duplicate_source_file_id");
  if (mediaType && !VALID_MEDIA_TYPES.has(mediaType)) {
    errors.push("invalid_media_type");
  }
  if (
    mimeType &&
    !String(mimeType).startsWith("image/") &&
    !/\.(png|jpe?g|webp)$/i.test(String(name || ""))
  ) {
    errors.push("not_an_image");
  }
  if (!mimeType && name && !/\.(png|jpe?g|webp)$/i.test(String(name))) {
    errors.push("unknown_image_type");
  }

  return errors;
}

function normalizeInputItems(raw) {
  const items = [];
  const rejected = [];
  const seenIds = new Set();
  const files = rawManifestItems(raw);

  for (const [index, item] of files.entries()) {
    if (!item || typeof item !== "object") {
      rejected.push({ index, reason: "invalid_item_shape" });
      continue;
    }

    const errors = validateManifestItem(item, seenIds);
    const id = item.id || item.fileId || item.file_id || null;
    if (id) seenIds.add(id);

    if (errors.length > 0) {
      rejected.push({
        index,
        id,
        name:
          item.name || item.title || item.file_name || item.fileName || null,
        reasons: errors,
      });
      continue;
    }

    items.push(normalizeManifestItem(item, index));
  }

  return { items, rejected, manifestTotal: files.length };
}

function splitNameAndSource(fileName) {
  const baseName = cleanName(fileName);
  const parts = baseName
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      characterName: parts[0],
      sourceTitle: parts.slice(1).join(" - "),
    };
  }

  return { characterName: baseName, sourceTitle: null };
}

function isGenericFolderName(folderName) {
  const normalized = normalizeComparable(folderName);
  return !normalized || GENERIC_FOLDER_NAMES.has(normalized);
}

function isGenericFileName(fileName) {
  const normalized = normalizeComparable(cleanName(fileName));
  return (
    /^photo \d{4}/.test(normalized) ||
    /^figura ?\d*$/.test(normalized) ||
    /^desconhecido$/.test(normalized) ||
    /^image ?\d*$/.test(normalized) ||
    /^\d+$/.test(normalized)
  );
}

function inferCharacterName(item) {
  if (item.characterName) return item.characterName.trim();
  return splitNameAndSource(item.name)
    .characterName.replace(/\s+\([^)]+\)$/, "")
    .trim();
}

function inferVariantName(item) {
  if (item.variantName) return item.variantName.trim();
  return item.name.match(/\(([^)]+)\)/)?.[1]?.trim() || null;
}

function inferSourceTitle(item) {
  if (item.sourceTitle) return item.sourceTitle.trim();
  const parsed = splitNameAndSource(item.name);
  if (IMPORT_SOURCE_TITLE_MODE === "filename") return parsed.sourceTitle;
  if (IMPORT_SOURCE_TITLE_MODE === "folder") return IMPORT_SOURCE_TITLE;
  if (parsed.sourceTitle) return parsed.sourceTitle;
  return isGenericFolderName(IMPORT_SOURCE_TITLE) ? null : IMPORT_SOURCE_TITLE;
}

function inferStatus(item) {
  return isGenericFileName(item.name) && !item.characterName
    ? "queued"
    : "review";
}

function inferConfidence(item) {
  if (isGenericFileName(item.name) && item.characterName) return 0.65;
  if (isGenericFileName(item.name)) return 0.2;
  if (splitNameAndSource(item.name).sourceTitle) return 0.7;
  if (!isGenericFolderName(IMPORT_SOURCE_TITLE)) return 0.55;
  return 0.35;
}

function buildTags(item) {
  const genericName = isGenericFileName(item.name);
  return Array.from(
    new Set(
      [
        "drive-import",
        `drive-id-${item.id}`,
        IMPORT_SLUG,
        IMPORT_CONTEXT,
        item.mediaType || IMPORT_MEDIA_TYPE,
        genericName ? "generic-filename" : null,
        genericName && !item.characterName ? "needs-name-review" : null,
        genericName && item.characterName ? "manually-identified" : null,
        ...item.tags,
      ].filter(Boolean),
    ),
  );
}

async function loadItems() {
  const raw = await fs.readFile(path.resolve(MANIFEST_PATH), "utf8");
  return normalizeInputItems(JSON.parse(raw));
}

async function downloadImage(item) {
  if (item.localPath) {
    return fs.readFile(path.resolve(item.localPath));
  }

  const url =
    item.downloadUrl ||
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(item.id)}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Download failed for ${item.id}: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function makeOptimizedImages(bytes) {
  const pipeline = sharp(bytes).rotate();
  const [main, thumbnail, metadata] = await Promise.all([
    pipeline
      .clone()
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    pipeline
      .clone()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toBuffer(),
    pipeline.clone().metadata(),
  ]);

  return { main, thumbnail, metadata };
}

async function assertCatalogQueueReady() {
  const { error } = await supabase
    .from("catalog_import_items")
    .select("id,import_batch_id")
    .limit(1);
  if (error) {
    throw new Error(
      `Catalog import queue is not ready. Apply migrations first. Supabase said: ${error.message}`,
    );
  }
}

function isMissingImportBatchTableError(error) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("catalog_import_batches") ||
    message.includes("import_batch_id")
  );
}

async function assertCatalogBatchReady() {
  const { error } = await supabase
    .from("catalog_import_batches")
    .select("id")
    .limit(1);
  if (error) {
    const prefix = isMissingImportBatchTableError(error)
      ? "Catalog import batch tracking is not ready. Apply migrations first."
      : "Catalog import batch tracking failed.";
    throw new Error(`${prefix} Supabase said: ${error.message}`);
  }
}

async function ensureStorageBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if ((data || []).some((bucket) => bucket.name === IMPORT_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(
    IMPORT_BUCKET,
    { public: true },
  );
  if (createError) throw createError;
}

function buildBatchPayload(summary = {}) {
  const now = new Date().toISOString();
  return {
    source_type: "google_drive",
    import_slug: IMPORT_SLUG,
    source_folder_id: IMPORT_SOURCE_FOLDER_ID || null,
    source_folder_name: IMPORT_SOURCE_FOLDER_NAME || null,
    source_drive_path: IMPORT_SOURCE_DRIVE_PATH || null,
    source_title: IMPORT_SOURCE_TITLE || null,
    manifest_path: MANIFEST_PATH,
    report_path: REPORT_PATH,
    status: summary.status || "running",
    dry_run: DRY_RUN,
    validate_only: VALIDATE_ONLY,
    manifest_total: summary.manifestTotal || 0,
    valid_count: summary.valid || 0,
    rejected_count: summary.rejected || 0,
    imported_count: summary.imported || 0,
    updated_count: summary.updated || 0,
    skipped_count: summary.skipped || 0,
    failed_count: summary.failed || 0,
    error_message: summary.errorMessage || null,
    updated_at: now,
    ...(summary.finished ? { finished_at: now } : {}),
  };
}

async function createImportBatch(manifestTotal, valid, rejected) {
  const payload = buildBatchPayload({
    manifestTotal,
    valid,
    rejected,
    status: "running",
  });

  if (IMPORT_BATCH_ID) {
    const { error } = await supabase
      .from("catalog_import_batches")
      .update(payload)
      .eq("id", IMPORT_BATCH_ID);
    if (error) throw error;
    return IMPORT_BATCH_ID;
  }

  const { data, error } = await supabase
    .from("catalog_import_batches")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function finishImportBatch(batchId, summary, status) {
  if (!batchId) return;

  const { error } = await supabase
    .from("catalog_import_batches")
    .update(
      buildBatchPayload({
        ...summary,
        status,
        finished: true,
      }),
    )
    .eq("id", batchId);
  if (error) throw error;
}

async function uploadFile(storagePath, bytes) {
  const { error } = await supabase.storage
    .from(IMPORT_BUCKET)
    .upload(storagePath, bytes, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "31536000",
    });
  if (error) throw error;
}

async function findExistingQueueItem(sourceFileId) {
  const { data, error } = await supabase
    .from("catalog_import_items")
    .select("id,status,published_model_id")
    .eq("source_file_id", sourceFileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function shouldSkipExistingQueueItem(existing) {
  return Boolean(
    existing?.status && LOCKED_QUEUE_STATUSES.has(existing.status),
  );
}

function getPublicStorageUrl(storagePath) {
  return supabase.storage.from(IMPORT_BUCKET).getPublicUrl(storagePath).data
    .publicUrl;
}

function getStoragePaths(item) {
  const fileBase = safePathPart(cleanName(item.name));
  const folderSlug = safePathPart(IMPORT_SLUG);
  return {
    storagePath: `catalog-import/${folderSlug}/optimized/${item.id}-${fileBase}.webp`,
    thumbnailPath: `catalog-import/${folderSlug}/thumbs/${item.id}-${fileBase}.webp`,
  };
}

function buildQueuePayload(
  item,
  storagePath,
  thumbnailUrl,
  imageData,
  importBatchId = null,
) {
  const genericName = isGenericFileName(item.name);
  const proposedBaseName = cleanName(item.name);
  const variantName = inferVariantName(item);
  const characterName =
    genericName && !item.characterName ? null : inferCharacterName(item);
  const proposedName = item.characterName
    ? [item.characterName, variantName ? `(${variantName})` : null]
        .filter(Boolean)
        .join(" ")
    : proposedBaseName;

  return {
    source_type: "google_drive",
    import_batch_id: importBatchId,
    source_folder_id: IMPORT_SOURCE_FOLDER_ID,
    source_folder_name: IMPORT_SOURCE_FOLDER_NAME,
    source_drive_path: IMPORT_SOURCE_DRIVE_PATH,
    source_file_id: item.id,
    source_file_url: item.url,
    file_name: item.name,
    mime_type: item.mimeType || "image/webp",
    original_size_bytes:
      item.size || imageData?.originalBytes?.byteLength || null,
    storage_bucket: IMPORT_BUCKET,
    storage_path: storagePath,
    thumbnail_url: thumbnailUrl,
    image_hash: imageData?.originalSha256 || null,
    original_sha256: imageData?.originalSha256 || null,
    optimized_sha256: imageData?.optimizedSha256 || null,
    image_width: imageData?.metadata?.width || null,
    image_height: imageData?.metadata?.height || null,
    image_format: imageData?.metadata?.format || null,
    status: inferStatus(item),
    proposed_name: proposedName,
    character_name: characterName,
    variant_name: variantName,
    variant_type: variantName ? "variant" : "default",
    source_title: inferSourceTitle(item),
    media_type: item.mediaType || IMPORT_MEDIA_TYPE,
    category: item.category || IMPORT_CATEGORY,
    subcategory: item.subcategory || IMPORT_SUBCATEGORY,
    tags: buildTags(item),
    catalog_visibility: IMPORT_VISIBILITY,
    collection_id: IMPORT_COLLECTION_ID,
    confidence: inferConfidence(item),
    name_review_status:
      genericName && !item.characterName ? "needs_review" : "approved",
    visual_review_status: "needs_review",
    notes:
      item.notes ||
      (genericName
        ? "Nome de arquivo generico; revisar personagem, obra e versao antes de publicar."
        : null),
  };
}

function existingQueuePatch(payload) {
  return {
    import_batch_id: payload.import_batch_id,
    source_file_url: payload.source_file_url,
    mime_type: payload.mime_type,
    original_size_bytes: payload.original_size_bytes,
    storage_bucket: payload.storage_bucket,
    storage_path: payload.storage_path,
    thumbnail_url: payload.thumbnail_url,
    image_hash: payload.image_hash,
    original_sha256: payload.original_sha256,
    optimized_sha256: payload.optimized_sha256,
    image_width: payload.image_width,
    image_height: payload.image_height,
    image_format: payload.image_format,
    updated_at: new Date().toISOString(),
  };
}

async function upsertQueueItem(
  item,
  optimized,
  originalBytes,
  existing = null,
  importBatchId = null,
) {
  const { storagePath, thumbnailPath } = getStoragePaths(item);

  await uploadFile(storagePath, optimized.main);
  await uploadFile(thumbnailPath, optimized.thumbnail);

  const payload = buildQueuePayload(
    item,
    storagePath,
    getPublicStorageUrl(thumbnailPath),
    {
      originalBytes,
      originalSha256: sha256(originalBytes),
      optimizedSha256: sha256(optimized.main),
      metadata: optimized.metadata,
    },
    importBatchId,
  );

  existing = existing || (await findExistingQueueItem(item.id));

  if (existing?.id) {
    const { error } = await supabase
      .from("catalog_import_items")
      .update(existingQueuePatch(payload))
      .eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id, created: false, status: existing.status };
  }

  const { data, error } = await supabase
    .from("catalog_import_items")
    .insert(payload)
    .select("id,status")
    .single();
  if (error) throw error;
  return { id: data.id, created: true, status: data.status };
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  assertImportConfig();

  if (!DRY_RUN && !VALIDATE_ONLY) {
    await assertCatalogQueueReady();
    await assertCatalogBatchReady();
    await ensureStorageBucket();
  }

  const { items, rejected, manifestTotal } = await loadItems();
  const importBatchId =
    DRY_RUN || VALIDATE_ONLY
      ? null
      : await createImportBatch(manifestTotal, items.length, rejected.length);
  const selectedItems =
    Number.isFinite(IMPORT_LIMIT) && IMPORT_LIMIT > 0
      ? items.slice(0, IMPORT_LIMIT)
      : items;
  const results = [];

  for (const item of selectedItems) {
    try {
      if (DRY_RUN || VALIDATE_ONLY) {
        const { storagePath, thumbnailPath } = getStoragePaths(item);
        const payload = buildQueuePayload(
          item,
          storagePath,
          `dry-run://${thumbnailPath}`,
          null,
        );
        results.push({
          ok: true,
          dryRun: true,
          fileId: item.id,
          name: item.name,
          status: payload.status,
          proposedName: payload.proposed_name,
          characterName: payload.character_name,
          sourceTitle: payload.source_title,
          mediaType: payload.media_type,
          visibility: payload.catalog_visibility,
          tags: payload.tags,
          confidence: payload.confidence,
          notes: payload.notes,
        });
        continue;
      }

      const existing = await findExistingQueueItem(item.id);
      if (shouldSkipExistingQueueItem(existing)) {
        results.push({
          ok: true,
          fileId: item.id,
          name: item.name,
          queueId: existing.id,
          created: false,
          skipped: true,
          status: existing.status,
          reason: "locked_existing_queue_item",
        });
        continue;
      }

      const original = await downloadImage(item);
      const optimized = await makeOptimizedImages(original);
      const record = await upsertQueueItem(
        item,
        optimized,
        original,
        existing,
        importBatchId,
      );
      results.push({
        ok: true,
        fileId: item.id,
        name: item.name,
        queueId: record.id,
        created: record.created,
        status: record.status,
      });
    } catch (error) {
      results.push({
        ok: false,
        fileId: item.id,
        name: item.name,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });
    }
  }

  const summary = {
    dryRun: DRY_RUN,
    validateOnly: VALIDATE_ONLY,
    manifest: MANIFEST_PATH,
    manifestTotal,
    valid: items.length,
    rejected: rejected.length,
    total: results.length,
    imported: results.filter((result) => result.ok && result.created).length,
    updated: results.filter(
      (result) =>
        result.ok && result.created === false && result.skipped !== true,
    ).length,
    skipped: results.filter((result) => result.ok && result.skipped).length,
    failed: results.filter((result) => !result.ok).length,
    report: REPORT_PATH,
    importBatchId,
  };

  await writeReport({
    generatedAt: new Date().toISOString(),
    summary,
    rejected,
    results,
  });
  await finishImportBatch(
    importBatchId,
    summary,
    summary.failed > 0 || summary.rejected > 0
      ? "completed_with_errors"
      : "completed",
  );
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
