import fs from "node:fs/promises";
import path from "node:path";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const MANIFEST_PATH = argValue(
  "manifest",
  "catalog-assets/drive-curated-v12/_manifest/catalog-assets-manifest.json",
);
const VISUAL_REPORT_PATH = argValue(
  "visual-report",
  "catalog-assets/drive-curated-v12/_audit/visual-groups/visual-groups-report.json",
);
const CURATION_OVERRIDES_PATH = argValue(
  "curation-overrides",
  "scripts/catalog/drive-curation-overrides.json",
);
const OUT_PATH = argValue(
  "out",
  "catalog-assets/drive-curated-v12/_manifest/catalog-site-import-plan.json",
);

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

function identityKey(row) {
  return [row.sourceTitle, row.characterName, row.modelGroup || ""]
    .map(normalizeComparable)
    .join("|");
}

function identityTextKey(row) {
  return normalizeComparable([row.sourceTitle, row.characterName, row.modelGroup].join(" "));
}

function variantKey(row) {
  return [
    row.sourceTitle,
    row.characterName,
    row.variantName || "default",
    row.modelGroup || "",
  ]
    .map(normalizeComparable)
    .join("|");
}

function displayTitle(row) {
  return [row.sourceTitle, row.characterName, row.variantName]
    .filter(Boolean)
    .join(" - ");
}

function buildTags(row) {
  const tags = new Set((row.tags || []).filter(Boolean).map(String));
  for (const value of [
    row.sourceTitle,
    row.category,
    row.mediaType,
    row.characterName,
    row.variantName,
    row.modelKind,
    ...(row.characterNames || []),
  ]) {
    if (value) tags.add(value);
  }
  return Array.from(tags);
}

function curationScore(row) {
  let score = 0;
  if (row.status === "ready_to_organize") score += 1000;
  if (row.status === "duplicate_candidate") score += 100;
  if (row.variantName) score += 20;
  if (row.localPath && !/90_DUPLICATAS/i.test(row.localPath)) score += 10;
  if (row.thumbnail_url || row.thumbnailUrl) score += 2;
  return score;
}

function sortByPrimaryRank(left, right) {
  return curationScore(right) - curationScore(left) || left.id.localeCompare(right.id);
}

function readItems(manifest) {
  return (manifest.items || [])
    .filter(
      (item) =>
        ["exported", "already_exists"].includes(item.exportStatus) &&
        item.localPath &&
        item.characterName &&
        item.sourceTitle &&
        ["ready_to_organize", "duplicate_candidate", "duplicate_exact"].includes(
          item.status,
        ),
    )
    .map((item) => ({
      id: item.id,
      originalName: item.originalName,
      proposedName: item.proposedName,
      sourceTitle: item.sourceTitle,
      characterName: item.characterName,
      variantName: item.variantName || null,
      category: item.category,
      subcategory: item.subcategory,
      mediaType: item.mediaType,
      modelGroup: item.modelGroup || item.model_group || null,
      modelKind: item.modelKind || item.model_kind || "character",
      modelFolder: item.modelFolder || item.model_folder || null,
      characterNames: item.characterNames || item.character_names || [item.characterName].filter(Boolean),
      tags: item.tags || [],
      status: item.status,
      sourceDrivePath: item.sourceDrivePath,
      localPath: item.localPath,
      sha256: item.sha256 || null,
      duplicateOf: item.duplicateOf || null,
      duplicateOfHash: item.duplicateOfHash || null,
    }));
}

function buildVisualReviewIndex(report) {
  const byIdentity = new Map();
  for (const group of report.groups || []) {
    const normalizedIdentity = normalizeComparable(group.identity);
    const review = {
      identity: group.identity,
      reviewType: group.reviewType,
      itemCount: group.itemCount,
      sheetPath: group.sheetPath,
      nearPairs: group.nearPairs || [],
    };
    if (group.key) byIdentity.set(group.key, review);
    byIdentity.set(normalizedIdentity, review);
  }
  return byIdentity;
}

function buildVisualApprovalIndex(overrides) {
  const byIdentity = new Map();
  for (const [rawKey, approval] of Object.entries(overrides.visualApprovals || {})) {
    const key = String(rawKey || "").trim();
    if (!key) continue;
    const normalizedPipeKey = key.includes("|")
      ? key
          .split("|")
          .map((part) => normalizeComparable(part))
          .join("|")
      : null;
    byIdentity.set(key, approval);
    if (normalizedPipeKey) byIdentity.set(normalizedPipeKey, approval);
    byIdentity.set(normalizeComparable(key), approval);
  }
  return byIdentity;
}

function getVisualReview(index, row) {
  return index.get(identityKey(row)) || index.get(identityTextKey(row)) || null;
}

function getVisualApproval(index, row) {
  return index.get(identityKey(row)) || index.get(identityTextKey(row)) || null;
}

function classifyVisualStatus(visualReview, variantItems, visualApproval) {
  if (visualApproval?.status === "approved") return "approved";
  if (visualApproval?.status === "needs_visual_review") return "needs_visual_review";
  if (!visualReview) return "approved";
  if (visualReview.reviewType === "exact_duplicate_group") return "approved";
  if (visualReview.reviewType === "variant_candidate") return "approved";
  if (variantItems.length <= 1) return "approved";
  return "needs_visual_review";
}

function buildPlan(items, visualIndex, visualApprovalIndex) {
  const byVariant = new Map();
  for (const item of items) {
    const group = byVariant.get(variantKey(item)) || [];
    group.push(item);
    byVariant.set(variantKey(item), group);
  }

  const models = [];
  const duplicates = [];
  for (const group of byVariant.values()) {
    group.sort(sortByPrimaryRank);
    const readyItems = group.filter((item) => item.status !== "duplicate_exact");
    const duplicateItems = group.filter((item) => item.status === "duplicate_exact");
    duplicates.push(
      ...duplicateItems.map((item) => ({
        sourceFileId: item.id,
        duplicateOf: item.duplicateOf,
        title: displayTitle(item),
        localPath: item.localPath,
      })),
    );

    if (!readyItems.length) continue;

    const primary = readyItems[0];
    const gallery = readyItems.slice(1);
    const visualReview = getVisualReview(visualIndex, primary);
    const visualApproval = getVisualApproval(visualApprovalIndex, primary);
    const visualStatus = classifyVisualStatus(visualReview, readyItems, visualApproval);

    models.push({
      identityKey: identityKey(primary),
      variantKey: variantKey(primary),
      title: displayTitle(primary),
      characterName: primary.characterName,
      variantName: primary.variantName,
      modelGroup: primary.modelGroup,
      modelKind: primary.modelKind,
      modelFolder: primary.modelFolder,
      characterNames: primary.characterNames,
      sourceTitle: primary.sourceTitle,
      category: primary.category,
      subcategory: primary.subcategory,
      mediaType: primary.mediaType,
      tags: buildTags(primary),
      importAction: visualStatus === "approved" ? "model_with_gallery" : "review_before_publish",
      visualStatus,
      visualReview,
      visualApproval,
      primaryImage: {
        sourceFileId: primary.id,
        originalName: primary.originalName,
        proposedName: primary.proposedName,
        localPath: primary.localPath,
        sha256: primary.sha256,
      },
      galleryImages: gallery.map((item, index) => ({
        sourceFileId: item.id,
        originalName: item.originalName,
        proposedName: item.proposedName,
        localPath: item.localPath,
        sha256: item.sha256,
        sortOrder: index + 1,
        role:
          visualReview?.reviewType === "variant_candidate"
            ? "variant_reference"
            : "angle",
      })),
      duplicateImages: duplicateItems.map((item) => ({
        sourceFileId: item.id,
        originalName: item.originalName,
        localPath: item.localPath,
        duplicateOf: item.duplicateOf,
      })),
    });
  }

  models.sort((left, right) => left.title.localeCompare(right.title));
  return { models, duplicates };
}

function summarize(plan) {
  return {
    generatedAt: new Date().toISOString(),
    manifest: MANIFEST_PATH,
    visualReport: VISUAL_REPORT_PATH,
    models: plan.models.length,
    modelsApproved: plan.models.filter((model) => model.visualStatus === "approved").length,
    modelsNeedsVisualReview: plan.models.filter(
      (model) => model.visualStatus === "needs_visual_review",
    ).length,
    galleryImages: plan.models.reduce(
      (total, model) => total + model.galleryImages.length,
      0,
    ),
    duplicateImages: plan.duplicates.length,
  };
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const visualReport = JSON.parse(await fs.readFile(VISUAL_REPORT_PATH, "utf8"));
  const curationOverrides = JSON.parse(await fs.readFile(CURATION_OVERRIDES_PATH, "utf8"));
  const items = readItems(manifest);
  const visualIndex = buildVisualReviewIndex(visualReport);
  const visualApprovalIndex = buildVisualApprovalIndex(curationOverrides);
  const plan = buildPlan(items, visualIndex, visualApprovalIndex);
  const summary = summarize(plan);

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(
    OUT_PATH,
    `${JSON.stringify({ summary, models: plan.models, duplicates: plan.duplicates }, null, 2)}\n`,
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
