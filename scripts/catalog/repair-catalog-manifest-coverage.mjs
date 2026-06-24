import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);

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

const ROOT = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
const CATALOG = path.resolve(argValue("catalog", path.join(ROOT, "catalogo")));
const CONTROL = path.resolve(argValue("control", path.join(CATALOG, "_controle")));
const OPS = path.resolve(argValue("ops", path.join(CONTROL, "00_operacao_v2")));
const OUT_DIR = path.resolve(argValue("out-dir", path.join(OPS, "05_validacoes")));
const MANIFEST = path.resolve(argValue("manifest", path.join(CONTROL, "catalog_manifest.jsonl")));
const HASH_INDEX = path.resolve(argValue("hash-index", path.join(CONTROL, "catalog_hash_index.json")));
const APPLY = argFlag("apply");
const INCLUDE_QUARANTINE = argFlag("include-quarantine");
const LIMIT_RAW = argValue("limit", "");
const LIMIT = LIMIT_RAW ? Number.parseInt(LIMIT_RAW, 10) : 0;
const CATEGORY_FILTER = new Set(
  argValue("categories", "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function* walkImages(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "_controle") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonlRows(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function splitRelpath(relpath) {
  const parts = String(relpath || "").split(/[\\/]+/).filter(Boolean);
  return {
    category: parts[0] || "",
    franchise: parts[1] || "",
    folder: parts[2] || "",
    filename: parts.at(-1) || "",
  };
}

function isQuarantineRelpath(relpath) {
  return splitRelpath(relpath).category.startsWith("_");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const handle = await fs.open(filePath, "r");
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk);
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

function extractMessageId(filename) {
  const match = String(filename || "").match(/(?:^|_)msg_(\d+)(?:_|\.|$)/i);
  return match?.[1] || "";
}

function sourcePathFor(filename) {
  const candidate = path.join(ROOT, filename);
  return candidate;
}

function countByCategory(relpaths) {
  const counts = new Map();
  for (const relpath of relpaths) {
    const category = splitRelpath(relpath).category || "_sem_categoria";
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

async function loadHashIndex() {
  if (!(await exists(HASH_INDEX))) {
    return { files: 0, hashes_by_size: {}, catalog_paths_by_sha256: {} };
  }
  const data = JSON.parse(await fs.readFile(HASH_INDEX, "utf8"));
  if (!data || typeof data !== "object") return { files: 0, hashes_by_size: {}, catalog_paths_by_sha256: {} };
  data.hashes_by_size ||= {};
  data.catalog_paths_by_sha256 ||= {};
  return data;
}

function updateHashIndex(index, additions) {
  let addedPaths = 0;
  let existingPaths = 0;
  let canonicalHashesAdded = 0;
  let duplicateHashesBySize = 0;

  for (const row of additions) {
    const sizeKey = String(row.size);
    index.hashes_by_size[sizeKey] ||= {};
    if (!index.hashes_by_size[sizeKey][row.sha256]) {
      index.hashes_by_size[sizeKey][row.sha256] = row.catalog_relpath;
      canonicalHashesAdded += 1;
    } else {
      duplicateHashesBySize += 1;
    }

    const paths = (index.catalog_paths_by_sha256[row.sha256] ||= []);
    if (paths.includes(row.catalog_relpath)) existingPaths += 1;
    else {
      paths.push(row.catalog_relpath);
      addedPaths += 1;
    }
  }

  index.files = Object.values(index.catalog_paths_by_sha256).reduce(
    (sum, paths) => sum + (Array.isArray(paths) ? paths.length : 0),
    0,
  );
  index.updated_at = new Date().toISOString();
  index.normalized_by = "repair-catalog-manifest-coverage";

  return { addedPaths, existingPaths, canonicalHashesAdded, duplicateHashesBySize };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const manifestRows = await readJsonl(MANIFEST);
  const manifestRelpaths = new Set(manifestRows.map((row) => String(row.catalog_relpath || "").replaceAll("\\", "/")));
  const manifestRelpathsLower = new Set([...manifestRelpaths].map((relpath) => relpath.toLowerCase()));
  const candidates = [];

  for await (const file of walkImages(CATALOG)) {
    const relpath = path.relative(CATALOG, file).replaceAll("\\", "/");
    const category = splitRelpath(relpath).category;
    if (manifestRelpaths.has(relpath) || manifestRelpathsLower.has(relpath.toLowerCase())) continue;
    if (!INCLUDE_QUARANTINE && isQuarantineRelpath(relpath)) continue;
    if (CATEGORY_FILTER.size > 0 && !CATEGORY_FILTER.has(category.toLowerCase())) continue;
    candidates.push({ file, relpath });
  }

  candidates.sort((a, b) => a.relpath.localeCompare(b.relpath));
  const selected = Number.isFinite(LIMIT) && LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates;
  const generatedAt = new Date().toISOString();
  const additions = [];

  for (const candidate of selected) {
    const stat = await fs.stat(candidate.file);
    const digest = await sha256(candidate.file);
    const parts = splitRelpath(candidate.relpath);
    const filename = parts.filename || path.basename(candidate.file);
    const sourcePath = sourcePathFor(filename);
    additions.push({
      source_type: "catalog_physical_backfill",
      status: "manifest_backfilled",
      retroactive: true,
      generated_at: generatedAt,
      source_name: filename,
      message_id: extractMessageId(filename),
      source_path: (await exists(sourcePath)) ? sourcePath : "",
      catalog_relpath: candidate.relpath,
      catalog_path: candidate.file,
      size: stat.size,
      sha256: digest,
      category: parts.category,
      franchise: parts.franchise,
      folder: parts.folder,
      filename,
      confidence: "baixa",
      notes: "Backfill criado a partir de arquivo fisico existente no catalogo; revisar origem/personagem se necessario.",
      batch: "manifest_coverage_backfill",
      normalized_at: generatedAt,
      normalized_reason: "manifest_coverage_backfill",
    });
  }

  let hashIndexStats = {
    addedPaths: 0,
    existingPaths: 0,
    canonicalHashesAdded: 0,
    duplicateHashesBySize: 0,
  };

  if (APPLY && additions.length > 0) {
    const stamp = generatedAt.replace(/[:.]/g, "-");
    await fs.copyFile(MANIFEST, `${MANIFEST}.before-manifest-coverage-backfill-${stamp}.bak`);
    if (await exists(HASH_INDEX)) await fs.copyFile(HASH_INDEX, `${HASH_INDEX}.before-manifest-coverage-backfill-${stamp}.bak`);

    const updatedManifest = [...manifestRows, ...additions];
    const manifestTmp = `${MANIFEST}.${process.pid}.tmp`;
    await fs.writeFile(manifestTmp, writeJsonlRows(updatedManifest), "utf8");
    await fs.rename(manifestTmp, MANIFEST);

    const hashIndex = await loadHashIndex();
    hashIndexStats = updateHashIndex(hashIndex, additions);
    const hashTmp = `${HASH_INDEX}.${process.pid}.tmp`;
    await fs.writeFile(hashTmp, `${JSON.stringify(hashIndex, null, 2)}\n`, "utf8");
    await fs.rename(hashTmp, HASH_INDEX);
  }

  const stamp = generatedAt.replace(/[:.]/g, "-");
  const report = {
    generated_at: generatedAt,
    apply: APPLY,
    root: ROOT,
    catalog: CATALOG,
    manifest: MANIFEST,
    hash_index: HASH_INDEX,
    include_quarantine: INCLUDE_QUARANTINE,
    category_filter: [...CATEGORY_FILTER],
    candidates: candidates.length,
    selected: selected.length,
    additions: additions.length,
    additions_by_category: countByCategory(additions.map((row) => row.catalog_relpath)),
    hash_index_stats: hashIndexStats,
    examples: additions.slice(0, 40).map((row) => ({
      catalog_relpath: row.catalog_relpath,
      size: row.size,
      sha256: row.sha256,
      category: row.category,
      franchise: row.franchise,
      folder: row.folder,
      filename: row.filename,
    })),
  };
  const jsonPath = path.join(OUT_DIR, `catalog_manifest_coverage_backfill_${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `catalog_manifest_coverage_backfill_${stamp}.csv`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    csvPath,
    [
      "catalog_relpath,category,franchise,folder,filename,size,sha256",
      ...additions.map((row) =>
        [
          row.catalog_relpath,
          row.category,
          row.franchise,
          row.folder,
          row.filename,
          row.size,
          row.sha256,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(JSON.stringify({ ...report, json: jsonPath, csv: csvPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
