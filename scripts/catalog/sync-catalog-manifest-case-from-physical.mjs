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
const OUT_DIR = path.resolve(argValue("out-dir", path.join(OPS, "06_migracoes")));
const MANIFEST = path.resolve(argValue("manifest", path.join(CONTROL, "catalog_manifest.jsonl")));
const HASH_INDEX = path.resolve(argValue("hash-index", path.join(CONTROL, "catalog_hash_index.json")));
const APPLY = argFlag("apply");
const KEEP_DUPLICATE_ROWS = argFlag("keep-duplicate-rows");
const REASON = "manifest_case_sync_from_physical";

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

function normalizeRelpath(relpath) {
  return String(relpath || "").replaceAll("\\", "/");
}

function splitRelpath(relpath) {
  const parts = normalizeRelpath(relpath).split("/").filter(Boolean);
  return {
    category: parts[0] || "",
    franchise: parts[1] || "",
    folder: parts[2] || "",
    filename: parts.at(-1) || "",
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function rowScore(row, index) {
  let score = 0;
  if (String(row.message_id || "").trim()) score += 1000;
  if (String(row.source_name || "").trim()) score += 500;
  if (String(row.source_path || "").trim()) score += 250;
  if (String(row.status || "").toLowerCase() === "copied") score += 100;
  if (String(row.status || "").toLowerCase() === "catalog_without_root_match") score -= 100;
  if (String(row.source_type || "").trim()) score += 25;
  return score * 1_000_000 - index;
}

function updateRowPath(row, targetRelpath, generatedAt) {
  const parts = splitRelpath(targetRelpath);
  return {
    ...row,
    catalog_relpath: targetRelpath,
    catalog_path: path.join(CATALOG, ...targetRelpath.split("/")),
    category: parts.category || row.category,
    franchise: parts.franchise || row.franchise,
    folder: parts.folder || row.folder,
    filename: parts.filename || row.filename,
    normalized_at: generatedAt,
    normalized_reason: REASON,
  };
}

function dedupeRows(rows) {
  const groups = new Map();
  rows.forEach((row, index) => {
    const relpath = normalizeRelpath(row.catalog_relpath);
    if (!relpath) return;
    const group = groups.get(relpath) || [];
    group.push({ row, index });
    groups.set(relpath, group);
  });

  const removeIndexes = new Set();
  const duplicateGroups = [];
  const duplicateConflicts = [];

  for (const [relpath, group] of groups.entries()) {
    if (group.length < 2) continue;

    const hashes = new Set(group.map(({ row }) => String(row.sha256 || "")).filter(Boolean));
    const sizes = new Set(group.map(({ row }) => String(row.size || "")).filter(Boolean));
    const hasConflict = hashes.size > 1 || sizes.size > 1;
    const sorted = [...group].sort((a, b) => rowScore(b.row, b.index) - rowScore(a.row, a.index));
    const keep = sorted[0];
    const remove = sorted.slice(1);

    const summary = {
      relpath,
      rows: group.length,
      kept_line: keep.index + 1,
      removed_lines: remove.map(({ index }) => index + 1),
      hashes: [...hashes],
      sizes: [...sizes],
    };

    if (hasConflict) {
      duplicateConflicts.push(summary);
      continue;
    }

    duplicateGroups.push(summary);
    for (const item of remove) removeIndexes.add(item.index);
  }

  return {
    rows: rows.filter((_, index) => !removeIndexes.has(index)),
    duplicateGroups,
    duplicateConflicts,
    removedRows: removeIndexes.size,
  };
}

function updateHashIndex(index, replacements) {
  if (!index || typeof index !== "object") return { updated: index, replacements: 0, removedDuplicates: 0 };
  let replacementCount = 0;
  let removedDuplicates = 0;
  const exact = new Map(replacements.map((item) => [item.from, item.to]));
  const lower = new Map(replacements.map((item) => [item.from.toLowerCase(), item.to]));

  const replaceRel = (value) => {
    const normalized = normalizeRelpath(value);
    const target = exact.get(normalized) || lower.get(normalized.toLowerCase());
    if (target && target !== value) replacementCount += 1;
    return target || value;
  };

  if (index.hashes_by_size && typeof index.hashes_by_size === "object") {
    for (const hashMap of Object.values(index.hashes_by_size)) {
      if (!hashMap || typeof hashMap !== "object") continue;
      for (const digest of Object.keys(hashMap)) hashMap[digest] = replaceRel(hashMap[digest]);
    }
  }

  if (index.catalog_paths_by_sha256 && typeof index.catalog_paths_by_sha256 === "object") {
    for (const digest of Object.keys(index.catalog_paths_by_sha256)) {
      const paths = index.catalog_paths_by_sha256[digest];
      if (!Array.isArray(paths)) continue;
      const next = [];
      const seen = new Set();
      for (const item of paths.map(replaceRel)) {
        const key = normalizeRelpath(item);
        if (seen.has(key)) {
          removedDuplicates += 1;
          continue;
        }
        seen.add(key);
        next.push(item);
      }
      index.catalog_paths_by_sha256[digest] = next;
    }
  }

  index.files = Object.values(index.catalog_paths_by_sha256 || {}).reduce(
    (sum, paths) => sum + (Array.isArray(paths) ? paths.length : 0),
    0,
  );
  index.updated_at = new Date().toISOString();
  index.normalized_by = REASON;
  return { updated: index, replacements: replacementCount, removedDuplicates };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();

  const physicalRelpaths = [];
  for await (const file of walkImages(CATALOG)) {
    physicalRelpaths.push(path.relative(CATALOG, file).replaceAll("\\", "/"));
  }
  physicalRelpaths.sort();

  const physicalSet = new Set(physicalRelpaths);
  const physicalLowerMap = new Map();
  const duplicatePhysicalLower = [];
  for (const relpath of physicalRelpaths) {
    const key = relpath.toLowerCase();
    const existing = physicalLowerMap.get(key);
    if (existing) duplicatePhysicalLower.push({ first: existing, duplicate: relpath });
    else physicalLowerMap.set(key, relpath);
  }

  const manifestRows = await readJsonl(MANIFEST);
  const caseUpdates = [];
  const missingPhysicalLower = [];
  const updatedRows = manifestRows.map((row) => {
    const current = normalizeRelpath(row.catalog_relpath);
    if (!current || physicalSet.has(current)) return row;

    const physicalRelpath = physicalLowerMap.get(current.toLowerCase());
    if (!physicalRelpath) {
      missingPhysicalLower.push(current);
      return row;
    }

    caseUpdates.push({
      from: current,
      to: physicalRelpath,
      sha256: row.sha256 || "",
      size: row.size || "",
    });
    return updateRowPath(row, physicalRelpath, generatedAt);
  });

  const dedupe = KEEP_DUPLICATE_ROWS
    ? { rows: updatedRows, duplicateGroups: [], duplicateConflicts: [], removedRows: 0 }
    : dedupeRows(updatedRows);

  const blockingIssues = [];
  if (duplicatePhysicalLower.length > 0) blockingIssues.push("duplicate_physical_case_insensitive_paths");
  if (missingPhysicalLower.length > 0) blockingIssues.push("manifest_rows_without_physical_case_match");
  if (dedupe.duplicateConflicts.length > 0) blockingIssues.push("duplicate_manifest_rows_with_different_hash_or_size");

  const hashIndexExists = await exists(HASH_INDEX);
  let hashIndexStats = { replacements: 0, removedDuplicates: 0 };

  if (APPLY && blockingIssues.length === 0) {
    const stamp = generatedAt.replace(/[:.]/g, "-");
    await fs.copyFile(MANIFEST, `${MANIFEST}.before-${REASON}-${stamp}.bak`);
    if (hashIndexExists) await fs.copyFile(HASH_INDEX, `${HASH_INDEX}.before-${REASON}-${stamp}.bak`);

    const manifestTmp = `${MANIFEST}.${process.pid}.tmp`;
    await fs.writeFile(manifestTmp, writeJsonlRows(dedupe.rows), "utf8");
    await fs.rename(manifestTmp, MANIFEST);

    if (hashIndexExists) {
      const hashIndex = JSON.parse(await fs.readFile(HASH_INDEX, "utf8"));
      const { updated, replacements, removedDuplicates } = updateHashIndex(hashIndex, caseUpdates);
      hashIndexStats = { replacements, removedDuplicates };
      const hashTmp = `${HASH_INDEX}.${process.pid}.tmp`;
      await fs.writeFile(hashTmp, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
      await fs.rename(hashTmp, HASH_INDEX);
    }
  }

  const stamp = generatedAt.replace(/[:.]/g, "-");
  const report = {
    generated_at: generatedAt,
    apply: APPLY,
    root: ROOT,
    catalog: CATALOG,
    manifest: MANIFEST,
    hash_index: HASH_INDEX,
    physical_images: physicalRelpaths.length,
    manifest_rows_before: manifestRows.length,
    manifest_rows_after: dedupe.rows.length,
    case_updates: caseUpdates.length,
    removed_duplicate_rows: dedupe.removedRows,
    duplicate_manifest_groups: dedupe.duplicateGroups.length,
    duplicate_manifest_conflicts: dedupe.duplicateConflicts.length,
    duplicate_physical_case_insensitive_paths: duplicatePhysicalLower.length,
    missing_physical_case_matches: missingPhysicalLower.length,
    blocking_issues: blockingIssues,
    hash_index_stats: hashIndexStats,
    examples: {
      case_updates: caseUpdates.slice(0, 40),
      duplicate_manifest_groups: dedupe.duplicateGroups.slice(0, 20),
      duplicate_manifest_conflicts: dedupe.duplicateConflicts.slice(0, 20),
      duplicate_physical_case_insensitive_paths: duplicatePhysicalLower.slice(0, 20),
      missing_physical_case_matches: missingPhysicalLower.slice(0, 20),
    },
  };

  const jsonPath = path.join(OUT_DIR, `catalog_manifest_case_sync_${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `catalog_manifest_case_sync_${stamp}.csv`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    csvPath,
    [
      "from,to,sha256,size",
      ...caseUpdates.map((row) => [row.from, row.to, row.sha256, row.size].map(csvEscape).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(JSON.stringify({ ...report, json: jsonPath, csv: csvPath }, null, 2));
  if (blockingIssues.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
