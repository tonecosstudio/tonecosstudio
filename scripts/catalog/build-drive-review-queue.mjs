import fs from "node:fs/promises";
import path from "node:path";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const PLAN_PATH = argValue(
  "plan",
  "catalog-assets/drive-curated-v12/_manifest/catalog-site-import-plan.json",
);
const MANIFEST_PATH = argValue(
  "manifest",
  "catalog-assets/drive-curated-v12/_manifest/catalog-assets-manifest.json",
);
const OUT_DIR = argValue(
  "out",
  "catalog-assets/drive-curated-v12/_review/curation-queue",
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

function toCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function reviewTypeWeight(reviewType) {
  if (reviewType === "near_duplicate_review") return 3000;
  if (reviewType === "same_model_or_angle_review") return 2000;
  if (reviewType === "variant_candidate") return 1000;
  return 0;
}

function hasAllowedNumericMeaning(normalized) {
  return (
    /\b(?:versao|v|diorama|busto|bust|chibi|gear|super saiyajin|android|t)\s*\d+$/.test(normalized) ||
    /\bx\s*23$/.test(normalized)
  );
}

function isSuspiciousName(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return false;
  }
  const normalized = normalizeComparable(value);
  if (hasAllowedNumericMeaning(normalized)) return false;
  return (
    !normalized ||
    (/^(.+)\s+\d+$/.test(normalized) && !hasAllowedNumericMeaning(normalized)) ||
    /\b(copy|copia|sem nome|desconhecido|photo|figura|image)\b/.test(normalized) ||
    /\b(axterix|ataque on titan|scorpion\d+|chun lii|picolo)\b/.test(normalized)
  );
}

function makeVisualQueue(plan) {
  return (plan.models || [])
    .filter((model) => model.visualStatus === "needs_visual_review")
    .map((model) => {
      const reviewType = model.visualReview?.reviewType || "visual_review";
      const itemCount = model.visualReview?.itemCount || model.galleryImages.length + 1;
      const galleryCount = model.galleryImages.length;
      const priority =
        reviewTypeWeight(reviewType) +
        Math.min(itemCount, 100) * 10 +
        Math.min(galleryCount, 50);

      return {
        queue: "visual",
        priority,
        title: model.title,
        reviewType,
        itemCount,
        galleryCount,
        duplicateCount: model.duplicateImages.length,
        sheetPath: model.visualReview?.sheetPath || null,
        primaryImagePath: model.primaryImage?.localPath || null,
        action: "review_primary_gallery_or_split_variant",
        sourceTitle: model.sourceTitle,
        characterName: model.characterName,
        variantName: model.variantName || null,
        modelGroup: model.modelGroup || null,
      };
    })
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
}

function makeNameQueue(plan) {
  return (plan.models || [])
    .filter(
      (model) =>
        isSuspiciousName(model.characterName) ||
        (model.variantName ? isSuspiciousName(model.variantName) : false) ||
        isSuspiciousName(model.title),
    )
    .map((model) => ({
      queue: "name",
      priority: 1000 + model.galleryImages.length,
      title: model.title,
      reviewType: "name_taxonomy_review",
      itemCount: 1 + model.galleryImages.length,
      galleryCount: model.galleryImages.length,
      duplicateCount: model.duplicateImages.length,
      sheetPath: model.visualReview?.sheetPath || null,
      primaryImagePath: model.primaryImage?.localPath || null,
      action: "fix_character_source_or_variant_name",
      sourceTitle: model.sourceTitle,
      characterName: model.characterName,
      variantName: model.variantName || null,
      modelGroup: model.modelGroup || null,
    }))
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
}

function makeInvalidQueue(manifest) {
  return (manifest.items || [])
    .filter((item) => item.exportStatus === "non_image" || item.status === "needs_review")
    .map((item) => ({
      queue: item.exportStatus === "non_image" ? "invalid" : "unresolved",
      priority: item.exportStatus === "non_image" ? 500 : 900,
      title: item.proposedName || item.originalName,
      reviewType: item.exportStatus === "non_image" ? "invalid_file" : "unresolved_identity",
      itemCount: 1,
      galleryCount: 0,
      duplicateCount: 0,
      sheetPath: null,
      primaryImagePath: item.localPath || null,
      action: item.exportStatus === "non_image" ? "remove_or_replace_source_file" : "identify_or_exclude",
      sourceTitle: item.sourceTitle || null,
      characterName: item.characterName || null,
      variantName: item.variantName || null,
      modelGroup: item.modelGroup || item.model_group || null,
    }))
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
}

function summarize(queues) {
  const all = Object.values(queues).flat();
  return {
    generatedAt: new Date().toISOString(),
    plan: PLAN_PATH,
    manifest: MANIFEST_PATH,
    total: all.length,
    byQueue: Object.fromEntries(
      Object.entries(queues).map(([key, rows]) => [key, rows.length]),
    ),
    topPriority: all
      .slice()
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 20)
      .map((row) => ({
        queue: row.queue,
        priority: row.priority,
        title: row.title,
        reviewType: row.reviewType,
        sheetPath: row.sheetPath,
      })),
  };
}

async function writeCsv(filePath, rows) {
  const columns = [
    "queue",
    "priority",
    "title",
    "reviewType",
    "itemCount",
    "galleryCount",
    "duplicateCount",
    "sheetPath",
    "primaryImagePath",
    "action",
    "sourceTitle",
    "characterName",
    "variantName",
    "modelGroup",
  ];
  await fs.writeFile(
    filePath,
    `${columns.join(",")}\n${rows.map((row) => columns.map((column) => toCsvValue(row[column])).join(",")).join("\n")}\n`,
  );
}

function markdownTable(rows) {
  const visibleRows = rows.slice(0, 60);
  const lines = [
    "| Prioridade | Fila | Titulo | Motivo | Itens | Galeria | Prancha |",
    "|---:|---|---|---|---:|---:|---|",
  ];

  for (const row of visibleRows) {
    lines.push(
      `| ${row.priority} | ${row.queue} | ${row.title.replaceAll("|", "/")} | ${row.reviewType} | ${row.itemCount} | ${row.galleryCount} | ${row.sheetPath || ""} |`,
    );
  }

  return lines.join("\n");
}

async function main() {
  const [plan, manifest] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8").then(JSON.parse),
    fs.readFile(MANIFEST_PATH, "utf8").then(JSON.parse),
  ]);

  const queues = {
    visual: makeVisualQueue(plan),
    name: makeNameQueue(plan),
    invalid: makeInvalidQueue(manifest),
  };
  const all = Object.values(queues)
    .flat()
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
  const summary = summarize(queues);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUT_DIR, "review-queue.json"),
    `${JSON.stringify({ summary, queues, all }, null, 2)}\n`,
  );
  await writeCsv(path.join(OUT_DIR, "review-queue.csv"), all);
  await fs.writeFile(
    path.join(OUT_DIR, "review-queue.md"),
    `# Catalog review queue\n\n${JSON.stringify(summary, null, 2)}\n\n${markdownTable(all)}\n`,
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
