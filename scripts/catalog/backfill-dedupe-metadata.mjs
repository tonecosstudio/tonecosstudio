import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKFILL_VERSION = "2026-05-29";
const DRY_RUN =
  process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
const SCOPE = process.env.CATALOG_DEDUPE_BACKFILL_SCOPE || "all";
const REPORT_PATH =
  process.env.CATALOG_DEDUPE_BACKFILL_REPORT_PATH ||
  "tmp/catalog-dedupe-backfill-report.json";
const VISUAL_DISTANCE_THRESHOLD = Number.parseInt(
  process.env.VISUAL_DISTANCE_THRESHOLD || "6",
  10,
);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

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

function slugKey(value) {
  return normalizeComparable(value).replace(/ /g, "-");
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferVariantName(value) {
  return (
    String(value || "")
      .match(/\(([^)]+)\)\s*$/)?.[1]
      ?.trim() || ""
  );
}

function stripVariantSuffix(value) {
  return String(value || "")
    .replace(/\s+\([^)]+\)\s*$/, "")
    .trim();
}

function isGenericName(value) {
  const normalized = normalizeComparable(cleanName(value));
  return (
    /^photo \d{4}/.test(normalized) ||
    /^figura ?\d*$/.test(normalized) ||
    /^desconhecido$/.test(normalized) ||
    /^image ?\d*$/.test(normalized) ||
    /^\d+$/.test(normalized)
  );
}

function canonicalIdentityKey({ sourceTitle, characterName, variantName }) {
  return [
    sourceTitle || "catalogo",
    characterName || "sem-nome",
    variantName || "",
  ]
    .map(slugKey)
    .join("|");
}

function hammingDistanceHex(left, right) {
  if (!left || !right || left.length !== right.length) return null;
  let xor = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

async function dHash64(bytes) {
  const pixels = await sharp(bytes)
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  let bits = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = pixels[y * 9 + x];
      const right = pixels[y * 9 + x + 1];
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

function driveIdFromTags(tags) {
  return (
    (tags || [])
      .find((tag) => /^drive-id-/.test(tag))
      ?.replace(/^drive-id-/, "") || null
  );
}

async function downloadImage({ bucket, storagePath, fallbackUrl }) {
  if (bucket && storagePath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  if (fallbackUrl) {
    const response = await fetch(fallbackUrl, { redirect: "follow" });
    if (!response.ok)
      throw new Error(`Image download failed: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("No storage path or fallback image URL.");
}

async function fetchQueueRows() {
  const { data, error } = await supabase
    .from("catalog_import_items")
    .select(
      "id,file_name,proposed_name,character_name,variant_name,source_title,source_folder_name,category,subcategory,tags,source_file_id,storage_bucket,storage_path,thumbnail_url,image_hash,original_sha256,optimized_sha256,perceptual_hash,canonical_identity_key",
    )
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) throw error;
  return data || [];
}

async function fetchModelRows() {
  const { data, error } = await supabase
    .from("models")
    .select(
      "id,name,character_name,variant_name,source_title,franchise,category,subcategory,tags,file_url,thumbnail_url,image_bucket,image_path,is_active,original_sha256,optimized_sha256,perceptual_hash,canonical_identity_key",
    )
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) throw error;
  return data || [];
}

function queueIdentity(row) {
  const proposedName = row.proposed_name || cleanName(row.file_name);
  const characterName = row.character_name || stripVariantSuffix(proposedName);
  return {
    sourceTitle:
      row.source_title ||
      row.source_folder_name ||
      row.subcategory ||
      row.category ||
      "catalogo",
    characterName,
    variantName: row.variant_name || inferVariantName(proposedName),
  };
}

function modelIdentity(row) {
  return {
    sourceTitle:
      row.source_title ||
      row.franchise ||
      row.subcategory ||
      row.category ||
      "catalogo",
    characterName: row.character_name || stripVariantSuffix(row.name),
    variantName: row.variant_name || inferVariantName(row.name),
  };
}

async function analyzeQueueRow(row) {
  const identity = queueIdentity(row);
  const bytes = await downloadImage({
    bucket: row.storage_bucket,
    storagePath: row.storage_path,
    fallbackUrl: row.thumbnail_url,
  });
  const metadata = await sharp(bytes).metadata();
  return {
    kind: "queue",
    table: "catalog_import_items",
    id: row.id,
    label: row.proposed_name || row.file_name,
    driveFileId: row.source_file_id,
    tags: row.tags || [],
    identity,
    identityKey: canonicalIdentityKey(identity),
    originalSha256: row.original_sha256 || row.image_hash || null,
    optimizedSha256: sha256(bytes),
    perceptualHash: await dHash64(bytes),
    imageWidth: metadata.width || null,
    imageHeight: metadata.height || null,
    imageFormat: metadata.format || null,
    isGeneric:
      isGenericName(row.proposed_name || row.file_name) ||
      !identity.characterName,
    needsVisualReview: (row.tags || []).includes("needs-visual-review"),
  };
}

async function analyzeModelRow(row) {
  const identity = modelIdentity(row);
  const bytes = await downloadImage({
    bucket: row.image_bucket,
    storagePath: row.image_path,
    fallbackUrl: row.thumbnail_url,
  });
  const metadata = await sharp(bytes).metadata();
  return {
    kind: "model",
    table: "models",
    id: row.id,
    label: row.name,
    driveFileId:
      driveIdFromTags(row.tags) ||
      row.file_url?.match(/\/d\/([^/]+)/)?.[1] ||
      null,
    tags: row.tags || [],
    identity,
    identityKey: canonicalIdentityKey(identity),
    originalSha256: row.original_sha256 || null,
    optimizedSha256: sha256(bytes),
    perceptualHash: await dHash64(bytes),
    imageWidth: metadata.width || null,
    imageHeight: metadata.height || null,
    imageFormat: metadata.format || null,
    isGeneric: isGenericName(row.name) || !identity.characterName,
    needsVisualReview: (row.tags || []).includes("needs-visual-review"),
    isActive: Boolean(row.is_active),
  };
}

function assignDuplicateStatus(records) {
  const byKind = new Map();
  for (const record of records) {
    if (!record.ok) continue;
    const items = byKind.get(record.kind) || [];
    items.push(record);
    byKind.set(record.kind, items);
  }

  for (const items of byKind.values()) {
    for (const item of items) {
      item.duplicateStatus = "unique";
      item.duplicateOfId = null;
      item.duplicateDistance = null;
    }

    for (const keyName of ["driveFileId", "optimizedSha256", "identityKey"]) {
      const groups = new Map();
      for (const item of items) {
        const key = item[keyName];
        if (!key) continue;
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
      }

      for (const group of groups.values()) {
        if (group.length < 2) continue;
        const canonical = chooseCanonicalDuplicateTarget(group);
        const status =
          keyName === "driveFileId"
            ? "source_duplicate"
            : keyName === "optimizedSha256"
              ? "exact_duplicate"
              : "identity_duplicate";

        for (const duplicate of group) {
          if (duplicate.id === canonical.id) continue;
          duplicate.duplicateStatus = status;
          duplicate.duplicateOfId = canonical.id;
          duplicate.duplicateDistance = 0;
        }
      }
    }

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const left = items[i];
        const right = items[j];
        if (left.optimizedSha256 === right.optimizedSha256) continue;
        if (left.identityKey !== right.identityKey) continue;
        const distance = hammingDistanceHex(
          left.perceptualHash,
          right.perceptualHash,
        );
        if (distance === null || distance > VISUAL_DISTANCE_THRESHOLD) continue;

        if (
          left.duplicateStatus !== "unique" ||
          right.duplicateStatus !== "unique"
        )
          continue;

        const leftRank = duplicateCanonicalRank(left);
        const rightRank = duplicateCanonicalRank(right);
        if (leftRank !== rightRank) {
          const duplicate = leftRank > rightRank ? left : right;
          const canonical = leftRank > rightRank ? right : left;
          duplicate.duplicateStatus = "needs_review";
          duplicate.duplicateOfId = canonical.id;
          duplicate.duplicateDistance = distance;
          continue;
        }

        if (left.duplicateStatus === "unique") {
          left.duplicateStatus = "needs_review";
          left.duplicateOfId = right.id;
          left.duplicateDistance = distance;
        }
        if (right.duplicateStatus === "unique") {
          right.duplicateStatus = "needs_review";
          right.duplicateOfId = left.id;
          right.duplicateDistance = distance;
        }
      }
    }
  }
}

function chooseCanonicalDuplicateTarget(group) {
  return [...group].sort(
    (left, right) =>
      duplicateCanonicalRank(left) - duplicateCanonicalRank(right),
  )[0];
}

function duplicateCanonicalRank(item) {
  let rank = 0;
  if (item.kind === "model" && item.isActive) rank -= 1000;
  if ((item.tags || []).includes("catalog-staging")) rank += 100;
  if ((item.tags || []).includes("duplicate-legacy")) rank += 500;
  if ((item.tags || []).includes("hidden-duplicate")) rank += 500;
  if (item.needsVisualReview) rank += 20;
  return rank;
}

function updatePayload(record) {
  const base = {
    optimized_sha256: record.optimizedSha256,
    perceptual_hash: record.perceptualHash,
    perceptual_hash_algorithm: "dhash64-v1",
    canonical_identity_key: record.identityKey,
    duplicate_status: record.duplicateStatus,
    duplicate_distance: record.duplicateDistance,
    image_width: record.imageWidth,
    image_height: record.imageHeight,
    image_format: record.imageFormat,
    name_review_status: record.isGeneric ? "needs_review" : "approved",
    visual_review_status:
      record.needsVisualReview || record.duplicateStatus === "needs_review"
        ? "needs_review"
        : "approved",
    analysis_notes:
      record.duplicateStatus === "unique"
        ? null
        : `Duplicate audit: ${record.duplicateStatus}.`,
    updated_at: new Date().toISOString(),
  };

  if (record.originalSha256) base.original_sha256 = record.originalSha256;

  if (record.kind === "queue") {
    base.duplicate_of_import_item_id = record.duplicateOfId;
    base.duplicate_of_model_id = null;
    return base;
  }

  base.duplicate_of_model_id = record.duplicateOfId;
  return base;
}

async function updateRecord(record) {
  const { error } = await supabase
    .from(record.table)
    .update(updatePayload(record))
    .eq("id", record.id);
  if (error) throw error;
}

async function analyzeAll() {
  const records = [];
  const failures = [];

  if (SCOPE === "all" || SCOPE === "queue") {
    for (const row of await fetchQueueRows()) {
      try {
        records.push({ ...(await analyzeQueueRow(row)), ok: true });
      } catch (error) {
        failures.push({
          kind: "queue",
          id: row.id,
          label: row.proposed_name || row.file_name,
          error: String(error.message || error),
        });
      }
    }
  }

  if (SCOPE === "all" || SCOPE === "models") {
    for (const row of await fetchModelRows()) {
      try {
        records.push({ ...(await analyzeModelRow(row)), ok: true });
      } catch (error) {
        failures.push({
          kind: "model",
          id: row.id,
          label: row.name,
          error: String(error.message || error),
        });
      }
    }
  }

  assignDuplicateStatus(records);
  return { records, failures };
}

function summarize(records, failures, updateFailures) {
  const summary = {
    scope: SCOPE,
    dryRun: DRY_RUN,
    analyzed: records.length,
    failures: failures.length,
    updateFailures: updateFailures.length,
    byKind: {},
    duplicateStatus: {},
    review: {
      genericOrMissingName: records.filter((record) => record.isGeneric).length,
      visualReview: records.filter(
        (record) =>
          record.needsVisualReview || record.duplicateStatus === "needs_review",
      ).length,
    },
  };

  for (const record of records) {
    summary.byKind[record.kind] = (summary.byKind[record.kind] || 0) + 1;
    summary.duplicateStatus[record.duplicateStatus] =
      (summary.duplicateStatus[record.duplicateStatus] || 0) + 1;
  }

  return summary;
}

async function main() {
  const { records, failures } = await analyzeAll();
  const updateFailures = [];

  if (!DRY_RUN) {
    for (const record of records) {
      try {
        await updateRecord(record);
      } catch (error) {
        updateFailures.push({
          kind: record.kind,
          id: record.id,
          label: record.label,
          error: String(error.message || error),
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    backfillVersion: BACKFILL_VERSION,
    summary: summarize(records, failures, updateFailures),
    duplicateCandidates: records
      .filter((record) => record.duplicateStatus !== "unique")
      .map((record) => ({
        kind: record.kind,
        id: record.id,
        label: record.label,
        duplicateStatus: record.duplicateStatus,
        duplicateOfId: record.duplicateOfId,
        duplicateDistance: record.duplicateDistance,
        identityKey: record.identityKey,
      })),
    failures,
    updateFailures,
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
