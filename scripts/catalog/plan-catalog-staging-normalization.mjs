import fs from "node:fs/promises";
import path from "node:path";
import {
  catalogOfficialPtBrRewrite,
  catalogReviewRestoreRewrite,
  catalogRootRewrite,
  collapseRedundantAdjacentRelpath,
  gameOriginFranchise,
  isDirectMainSubjectFolder,
  universeContentGroup,
  universeContentGroupCanonicalization,
  universeGroupAlias,
  universeMediaBucket,
  universeRoot,
} from "./catalog-taxonomy-rules.mjs";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);

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
const SCAN_PREFIXES = String(argValue("scan-prefix", "") || "")
  .split(/[;,|]/)
  .map((prefix) => prefix.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, ""))
  .filter(Boolean);

const CATEGORY_ALIASES = new Map(
  Object.entries({
    animacao: "desenhos-animacao",
    animation: "desenhos-animacao",
    cartoon: "desenhos-animacao",
    cartoons: "desenhos-animacao",
    desenho: "desenhos-animacao",
    desenhos: "desenhos-animacao",
    "desenho animacao": "desenhos-animacao",
    "desenhos animacao": "desenhos-animacao",
    "desenho-animacao": "desenhos-animacao",
    "desenhos-animacao": "desenhos-animacao",
    comic: "quadrinhos",
    comics: "quadrinhos",
    hq: "quadrinhos",
    decor: "decoracao",
    decoracao: "decoracao",
    game: "games",
    games: "games",
    jogo: "games",
    jogos: "games",
    filmes: "filmes-series",
    "filme serie": "filmes-series",
    "filme-serie": "filmes-series",
    "filmes series": "filmes-series",
    "filmes-series": "filmes-series",
    movie: "filmes-series",
    movies: "filmes-series",
    serie: "filmes-series",
    series: "filmes-series",
    tv: "filmes-series",
    "web series": "filmes-series",
    musica: "musica",
    "original characters": "original",
    pokemon: "games",
    "sci fi": "sci-fi",
    sports: "esportes",
    toy: "brinquedos",
    toys: "brinquedos",
    veiculos: "veiculos",
    vtubers: "vtubers",
    "virtual youtubers": "vtubers",
  }),
);

const ANIME_CANONICAL_FRANCHISES = [
  "attack on titan",
  "black butler",
  "bleach",
  "captain tsubasa",
  "cardcaptor sakura",
  "chainsaw man",
  "dandadan",
  "darling in the franxx",
  "demon slayer",
  "digimon",
  "dragon ball",
  "evangelion",
  "hunter x hunter",
  "jujutsu kaisen",
  "monster musume",
  "my hero academia",
  "naruto",
  "one piece",
  "one punch man",
  "sailor moon",
  "spy x family",
].sort((a, b) => normalizeComparable(b).length - normalizeComparable(a).length);

const GENERIC_MODEL_FOLDER_NAMES = new Set([
  "anime",
  "anime figure",
  "anime girl",
  "base",
  "figure",
  "figura",
  "general",
  "geral",
  "model",
  "modelo",
  "style",
  "xenoverse",
]);

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

function cleanPart(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .trim(".");
  return cleaned || fallback;
}

function canonicalCategory(value) {
  const comparable = normalizeComparable(value);
  return CATEGORY_ALIASES.get(comparable) || cleanPart(value, "outros").toLowerCase();
}

function explicitCategoryAlias(value) {
  return CATEGORY_ALIASES.get(normalizeComparable(value)) || null;
}

function animeFranchisePrefixFold(category, franchise, folder) {
  if (canonicalCategory(category) !== "anime") return null;
  const franchiseComparable = normalizeComparable(franchise);
  const folderComparable = normalizeComparable(folder);
  if (!franchiseComparable || !folderComparable || GENERIC_MODEL_FOLDER_NAMES.has(folderComparable)) return null;

  for (const canonical of ANIME_CANONICAL_FRANCHISES) {
    const canonicalComparable = normalizeComparable(canonical);
    const expected = `${canonicalComparable} ${folderComparable}`;
    if (franchiseComparable === expected || franchiseComparable.startsWith(`${expected} `)) {
      return { franchise: canonical, folder: cleanPart(folder, "geral").toLowerCase() };
    }
  }

  return null;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "_controle") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

function scanRoots() {
  if (SCAN_PREFIXES.length === 0) return [{ prefix: "", dir: CATALOG }];

  const catalogFloor = `${CATALOG.toLowerCase()}${path.sep}`;
  return SCAN_PREFIXES.map((prefix) => {
    const dir = path.resolve(path.join(CATALOG, prefix));
    if (dir.toLowerCase() !== CATALOG.toLowerCase() && !dir.toLowerCase().startsWith(catalogFloor)) {
      throw new Error(`Scan prefix outside catalog: ${prefix}`);
    }
    return { prefix, dir };
  });
}

function plannedRelpath(relpath) {
  const parts = relpath.split(/[\\/]+/).filter(Boolean);
  if (parts.length < 3) return { relpath, reasons: ["path_too_shallow"] };

  const [category, franchise] = parts;
  const folder = parts.length >= 4 ? parts[2] : "geral";
  const filename = parts.length >= 4 ? parts.slice(3).join(path.sep) : parts[2];
  if (category.startsWith("_")) {
    const reviewRestore = catalogReviewRestoreRewrite({ category, franchise, folder, filename });
    if (!reviewRestore) return { relpath, reasons: [] };

    const targetFilename = reviewRestore.filename || filename;
    const target = path
      .join(reviewRestore.category, reviewRestore.franchise, reviewRestore.folder, targetFilename)
      .replaceAll("\\", "/");
    return { relpath: target, reasons: reviewRestore.reasons };
  }

  const categoryAlias = explicitCategoryAlias(category);
  let nextCategory = categoryAlias || category;
  let nextFranchise = franchise;
  let nextFolder = folder;
  const reasons = [];

  if (categoryAlias && nextCategory !== category) reasons.push("category_alias");
  const gameOrigin = gameOriginFranchise(franchise, folder, filename);
  if (gameOrigin && canonicalCategory(category) !== "games" && !universeRoot(category) && !universeRoot(franchise)) {
    nextCategory = "games";
    nextFranchise = gameOrigin;
    nextFolder = folder;
    reasons.push("game_origin_franchise");
  }

  const promotedUniverse = universeRoot(franchise);
  if (promotedUniverse && universeRoot(category) !== promotedUniverse) {
    nextCategory = promotedUniverse;
    nextFranchise = universeContentGroup({ category, franchise, folder, filename });
    nextFolder = folder;
    reasons.push("universe_root_promotion");
  }

  const currentUniverse = universeRoot(nextCategory);
  if (currentUniverse) {
    const universeGroup = universeContentGroupCanonicalization({
      category: nextCategory,
      franchise: nextFranchise,
      folder: nextFolder,
      filename,
    });
    if (universeGroup && universeGroup !== nextFranchise) {
      const reason = universeGroupAlias(nextFranchise)
        ? "universe_group_alias"
        : universeMediaBucket(nextFranchise)
          ? "universe_media_bucket_reclassification"
          : "universe_content_group_canonicalization";
      nextFranchise = universeGroup;
      reasons.push(reason);
    }
  }

  const rootRewrite = catalogRootRewrite({
    category: nextCategory,
    franchise: nextFranchise,
    folder: nextFolder,
    filename,
  });
  if (rootRewrite) {
    if (
      rootRewrite.category !== nextCategory ||
      rootRewrite.franchise !== nextFranchise ||
      rootRewrite.folder !== nextFolder
    ) {
      nextCategory = rootRewrite.category;
      nextFranchise = rootRewrite.franchise;
      nextFolder = rootRewrite.folder;
      reasons.push(...rootRewrite.reasons);
    }
  }

  const animeFold = animeFranchisePrefixFold(category, franchise, folder);
  if (animeFold) {
    nextFranchise = animeFold.franchise;
    nextFolder = animeFold.folder;
    reasons.push("anime_franchise_character_fold");
  }

  const officialRewrite = catalogOfficialPtBrRewrite({
    category: nextCategory,
    franchise: nextFranchise,
    folder: nextFolder,
    filename,
    isShallow: parts.length < 4,
  });
  if (officialRewrite) {
    nextCategory = officialRewrite.category;
    nextFranchise = officialRewrite.franchise;
    nextFolder = officialRewrite.folder;
    reasons.push(...officialRewrite.reasons);
  }

  const target = path.join(nextCategory, nextFranchise, nextFolder, filename).replaceAll("\\", "/");
  const preserveSubjectFolder =
    reasons.includes("shallow_filename_subject_folder") ||
    reasons.includes("direct_main_subject_folder") ||
    isDirectMainSubjectFolder({
      category: nextCategory,
      franchise: nextFranchise,
      folder: nextFolder,
    });
  const collapsedTarget = preserveSubjectFolder
    ? { relpath: target, changed: false }
    : collapseRedundantAdjacentRelpath(target);
  if (collapsedTarget.changed) reasons.push("redundant_adjacent_folder_collapse");

  if (reasons.length === 0) return { relpath, reasons };

  return { relpath: collapsedTarget.relpath, reasons };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const rows = [];
  let scanned = 0;
  for (const root of scanRoots()) {
    try {
      await fs.access(root.dir);
    } catch {
      continue;
    }

    for await (const file of walk(root.dir)) {
      scanned += 1;
      const rel = path.relative(CATALOG, file).replaceAll("\\", "/");
      const planned = plannedRelpath(rel);
      if (planned.relpath === rel || planned.relpath.toLowerCase() === rel.toLowerCase()) continue;
      rows.push({
        source_relpath: rel,
        target_relpath: planned.relpath,
        reasons: planned.reasons.join("|"),
      });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `catalog_staging_normalization_plan_${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `catalog_staging_normalization_plan_${stamp}.csv`);
  const byReason = rows.reduce((acc, row) => {
    for (const reason of row.reasons.split("|")) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const summary = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    catalog: CATALOG,
    scan_prefixes: SCAN_PREFIXES,
    scanned_images: scanned,
    planned_moves: rows.length,
    by_reason: Object.fromEntries(Object.entries(byReason).sort((a, b) => b[1] - a[1])),
    examples: rows.slice(0, 40),
  };

  await fs.writeFile(jsonPath, `${JSON.stringify({ ...summary, moves: rows }, null, 2)}\n`, "utf8");
  await fs.writeFile(
    csvPath,
    [
      "source_relpath,target_relpath,reasons",
      ...rows.map((row) => [row.source_relpath, row.target_relpath, row.reasons].map(csvEscape).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(JSON.stringify({ ...summary, json: jsonPath, csv: csvPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
