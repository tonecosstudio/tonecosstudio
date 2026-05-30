import fs from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
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

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const ROOT = process.cwd();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPORT_PATH = argValue(
  "report",
  process.env.CATALOG_HEALTH_REPORT_PATH || "tmp/catalog-health-report.json",
);
const LIMIT = Number.parseInt(argValue("limit", "5000"), 10);
const STRICT =
  argFlag("strict") || process.env.CATALOG_HEALTH_STRICT === "true";
const catalogTagPolicy = JSON.parse(
  readFileSync(
    path.join(ROOT, "src", "config", "catalog-tag-policy.json"),
    "utf8",
  ),
);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

if (!Number.isFinite(LIMIT) || LIMIT < 1) {
  throw new Error("--limit must be a positive integer.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const INTERNAL_TAG_PREFIXES = catalogTagPolicy.internalTagPrefixes;
const INTERNAL_TAGS = new Set(catalogTagPolicy.internalTags);
const PUBLIC_TAG_ALIASES = catalogTagPolicy.publicTagAliases || {};
const PUBLIC_TAG_BLOCKLIST = new Set(catalogTagPolicy.publicTagBlocklist || []);

function normalizeTag(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

  return PUBLIC_TAG_ALIASES[normalized] || normalized;
}

function isInternalTag(tag) {
  const canonicalTag = normalizeTag(tag).replace(/\s+/g, "-");
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "null";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function compactRows(rows, mapper, limit = 25) {
  return rows.slice(0, limit).map(mapper);
}

async function fetchQueueRows() {
  const { data, error } = await supabase
    .from("catalog_import_items")
    .select(
      "id,file_name,status,proposed_name,character_name,variant_name,source_title,media_type,category,subcategory,tags,catalog_visibility,published_model_id,duplicate_status,name_review_status,visual_review_status,storage_path,thumbnail_url,optimized_sha256,perceptual_hash,canonical_identity_key,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) throw error;
  return data || [];
}

async function fetchModelRows() {
  const { data, error } = await supabase
    .from("models")
    .select(
      "id,name,is_active,character_name,variant_name,source_title,source_type,franchise,category,subcategory,tags,catalog_visibility,image_bucket,image_path,thumbnail_url,duplicate_status,name_review_status,visual_review_status,optimized_sha256,perceptual_hash,canonical_identity_key,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) throw error;
  return data || [];
}

function queueReadyToPublish(row) {
  return (
    row.status !== "published" &&
    row.status !== "duplicate" &&
    row.status !== "rejected" &&
    row.name_review_status === "approved" &&
    row.visual_review_status === "approved" &&
    (!row.duplicate_status || row.duplicate_status === "unique") &&
    Boolean(row.storage_path) &&
    Boolean(row.character_name || row.proposed_name) &&
    Boolean(row.source_title)
  );
}

function modelPublic(row) {
  return row.is_active && ["general", "both"].includes(row.catalog_visibility);
}

function publicTagViolations(row) {
  return (row.tags || []).filter((tag) => isInternalTag(tag));
}

function blockedPublicTags(row) {
  return (row.tags || [])
    .map((tag) => normalizeTag(tag))
    .filter((tag) => PUBLIC_TAG_BLOCKLIST.has(tag));
}

function buildReport(queueRows, modelRows) {
  const publicModels = modelRows.filter(modelPublic);
  const queueNeedsNameReview = queueRows.filter(
    (row) => row.name_review_status === "needs_review",
  );
  const queueNeedsVisualReview = queueRows.filter(
    (row) => row.visual_review_status === "needs_review",
  );
  const queueDuplicateCandidates = queueRows.filter(
    (row) => row.duplicate_status && row.duplicate_status !== "unique",
  );
  const queueMissingHashes = queueRows.filter(
    (row) =>
      !row.optimized_sha256 ||
      !row.perceptual_hash ||
      !row.canonical_identity_key,
  );
  const readyToPublish = queueRows.filter(queueReadyToPublish);
  const publicMissingTaxonomy = publicModels.filter(
    (row) => !row.character_name || !row.source_title || !row.source_type,
  );
  const publicMissingImage = publicModels.filter(
    (row) => !row.image_path && !row.thumbnail_url,
  );
  const publicInternalTags = publicModels
    .map((row) => ({ row, tags: publicTagViolations(row) }))
    .filter((entry) => entry.tags.length > 0);
  const publicBlockedTags = publicModels
    .map((row) => ({ row, tags: blockedPublicTags(row) }))
    .filter((entry) => entry.tags.length > 0);
  const publicDuplicateCandidates = publicModels.filter(
    (row) => row.duplicate_status && row.duplicate_status !== "unique",
  );

  return {
    generatedAt: new Date().toISOString(),
    limit: LIMIT,
    summary: {
      queueTotal: queueRows.length,
      modelsTotal: modelRows.length,
      publicModels: publicModels.length,
      queueByStatus: countBy(queueRows, "status"),
      queueByDuplicateStatus: countBy(queueRows, "duplicate_status"),
      modelsByVisibility: countBy(modelRows, "catalog_visibility"),
      queueNeedsNameReview: queueNeedsNameReview.length,
      queueNeedsVisualReview: queueNeedsVisualReview.length,
      queueDuplicateCandidates: queueDuplicateCandidates.length,
      queueMissingHashes: queueMissingHashes.length,
      readyToPublish: readyToPublish.length,
      publicMissingTaxonomy: publicMissingTaxonomy.length,
      publicMissingImage: publicMissingImage.length,
      publicInternalTagRows: publicInternalTags.length,
      publicBlockedTagRows: publicBlockedTags.length,
      publicDuplicateCandidates: publicDuplicateCandidates.length,
    },
    samples: {
      queueNeedsNameReview: compactRows(queueNeedsNameReview, (row) => ({
        id: row.id,
        fileName: row.file_name,
        proposedName: row.proposed_name,
      })),
      queueNeedsVisualReview: compactRows(queueNeedsVisualReview, (row) => ({
        id: row.id,
        fileName: row.file_name,
        proposedName: row.proposed_name,
      })),
      queueDuplicateCandidates: compactRows(
        queueDuplicateCandidates,
        (row) => ({
          id: row.id,
          fileName: row.file_name,
          duplicateStatus: row.duplicate_status,
        }),
      ),
      queueMissingHashes: compactRows(queueMissingHashes, (row) => ({
        id: row.id,
        fileName: row.file_name,
      })),
      readyToPublish: compactRows(readyToPublish, (row) => ({
        id: row.id,
        proposedName: row.proposed_name,
        sourceTitle: row.source_title,
      })),
      publicMissingTaxonomy: compactRows(publicMissingTaxonomy, (row) => ({
        id: row.id,
        name: row.name,
        characterName: row.character_name,
        sourceTitle: row.source_title,
        sourceType: row.source_type,
      })),
      publicMissingImage: compactRows(publicMissingImage, (row) => ({
        id: row.id,
        name: row.name,
      })),
      publicInternalTags: compactRows(publicInternalTags, (entry) => ({
        id: entry.row.id,
        name: entry.row.name,
        tags: entry.tags,
      })),
      publicBlockedTags: compactRows(publicBlockedTags, (entry) => ({
        id: entry.row.id,
        name: entry.row.name,
        tags: entry.tags,
      })),
      publicDuplicateCandidates: compactRows(
        publicDuplicateCandidates,
        (row) => ({
          id: row.id,
          name: row.name,
          duplicateStatus: row.duplicate_status,
        }),
      ),
    },
  };
}

const STRICT_ISSUE_LABELS = {
  queueNeedsNameReview: "fila com nomes pendentes",
  queueNeedsVisualReview: "fila com revisao visual pendente",
  queueDuplicateCandidates: "fila com duplicidade pendente",
  queueMissingHashes: "fila sem hashes/metadados de dedupe",
  publicMissingTaxonomy: "modelos publicos sem taxonomia",
  publicMissingImage: "modelos publicos sem imagem",
  publicInternalTagRows: "modelos publicos com tags internas",
  publicBlockedTagRows: "modelos publicos com tags genericas bloqueadas",
  publicDuplicateCandidates: "modelos publicos marcados como duplicidade",
};

function strictIssues(summary) {
  return Object.entries(STRICT_ISSUE_LABELS)
    .filter(([key]) => Number(summary[key] || 0) > 0)
    .map(([key, label]) => ({
      key,
      label,
      count: summary[key],
    }));
}

const [queueRows, modelRows] = await Promise.all([
  fetchQueueRows(),
  fetchModelRows(),
]);

const report = buildReport(queueRows, modelRows);
report.strict = {
  enabled: STRICT,
  pass: strictIssues(report.summary).length === 0,
  issues: strictIssues(report.summary),
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report.summary, null, 2));
if (STRICT) {
  console.log(
    JSON.stringify(
      {
        strict: report.strict.pass ? "pass" : "fail",
        issues: report.strict.issues,
      },
      null,
      2,
    ),
  );
}
console.log(`Report: ${REPORT_PATH}`);

if (STRICT && !report.strict.pass) process.exitCode = 1;
