import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
const MAIN_ROOTS = new Set(["anime", "dc", "desenhos-animacao", "filmes-series", "games", "marvel", "outros"]);

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const ROOT = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
const CATALOG = path.resolve(argValue("catalog", path.join(ROOT, "catalogo")));
const OPS = path.resolve(argValue("ops", path.join(CATALOG, "_controle", "00_operacao_v2")));
const OUT_DIR = path.resolve(argValue("out-dir", path.join(OPS, "01_planos")));
const MIN_GROUP_COUNT_RAW = argValue("min-group-count", "2");
const MIN_GROUP_COUNT = Number.parseInt(MIN_GROUP_COUNT_RAW, 10) || 2;

async function* walkImages(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "_controle") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
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

function splitRelpath(relpath) {
  const parts = String(relpath || "").split(/[\\/]+/).filter(Boolean);
  return {
    category: parts[0] || "",
    franchise: parts[1] || "",
    folder: parts[2] || "",
    rest: parts.slice(3),
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function variantScore(value, count) {
  const text = String(value || "");
  let score = count;
  if (text === text.toLowerCase()) score += 1000;
  if (!/[A-Z]/.test(text)) score += 1000;
  if (!text.includes("_")) score += 500;
  if (!/\s/.test(text)) score += 5000;
  if (text.includes("-")) score += 5000;
  return score;
}

function chooseCanonical(counts) {
  return [...counts.entries()].sort((a, b) => {
    const scoreDiff = variantScore(b[0], b[1]) - variantScore(a[0], a[1]);
    if (scoreDiff !== 0) return scoreDiff;
    return a[0].localeCompare(b[0]);
  })[0]?.[0] || "";
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = [];
  for await (const file of walkImages(CATALOG)) {
    const relpath = path.relative(CATALOG, file).replaceAll("\\", "/");
    const parts = splitRelpath(relpath);
    if (!MAIN_ROOTS.has(parts.category)) continue;
    if (!parts.franchise || !parts.folder || parts.rest.length === 0) continue;
    files.push({ relpath, ...parts });
  }

  const groups = new Map();
  for (const file of files) {
    const franchiseKey = normalizeComparable(file.franchise);
    const folderKey = normalizeComparable(file.folder);
    if (!franchiseKey || !folderKey) continue;
    const key = [file.category, franchiseKey, folderKey].join("|");
    const group = groups.get(key) || {
      category: file.category,
      franchiseKey,
      folderKey,
      franchiseCounts: new Map(),
      folderCounts: new Map(),
      files: [],
    };
    increment(group.franchiseCounts, file.franchise);
    increment(group.folderCounts, file.folder);
    group.files.push(file);
    groups.set(key, group);
  }

  const moves = [];
  const variantGroups = [];

  for (const group of groups.values()) {
    if (group.files.length < MIN_GROUP_COUNT) continue;
    if (group.franchiseCounts.size < 2 && group.folderCounts.size < 2) continue;

    const canonicalFranchise = chooseCanonical(group.franchiseCounts);
    const canonicalFolder = chooseCanonical(group.folderCounts);
    const groupMoves = [];

    for (const file of group.files) {
      if (file.franchise === canonicalFranchise && file.folder === canonicalFolder) continue;

      const target = path
        .join(file.category, canonicalFranchise, canonicalFolder, ...file.rest)
        .replaceAll("\\", "/");
      if (target === file.relpath || target.toLowerCase() === file.relpath.toLowerCase()) continue;

      groupMoves.push({
        source_relpath: file.relpath,
        target_relpath: target,
        reasons: "internal_variant_consolidation",
      });
    }

    if (groupMoves.length === 0) continue;
    moves.push(...groupMoves);
    variantGroups.push({
      category: group.category,
      franchise_key: group.franchiseKey,
      folder_key: group.folderKey,
      files: group.files.length,
      moves: groupMoves.length,
      canonical_franchise: canonicalFranchise,
      canonical_folder: canonicalFolder,
      franchise_variants: Object.fromEntries([...group.franchiseCounts.entries()].sort((a, b) => b[1] - a[1])),
      folder_variants: Object.fromEntries([...group.folderCounts.entries()].sort((a, b) => b[1] - a[1])),
    });
  }

  moves.sort((a, b) => a.source_relpath.localeCompare(b.source_relpath));
  variantGroups.sort((a, b) => b.moves - a.moves || b.files - a.files);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `catalog_staging_normalization_plan_${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `catalog_staging_normalization_plan_${stamp}.csv`);
  const summary = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    catalog: CATALOG,
    scanned_images: files.length,
    planned_moves: moves.length,
    by_reason: moves.length ? { internal_variant_consolidation: moves.length } : {},
    variant_groups: variantGroups.length,
    variant_group_examples: variantGroups.slice(0, 40),
    examples: moves.slice(0, 40),
  };

  await fs.writeFile(jsonPath, `${JSON.stringify({ ...summary, moves }, null, 2)}\n`, "utf8");
  await fs.writeFile(
    csvPath,
    [
      "source_relpath,target_relpath,reasons",
      ...moves.map((row) => [row.source_relpath, row.target_relpath, row.reasons].map(csvEscape).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(JSON.stringify({ ...summary, json: jsonPath, csv: csvPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
