import fs from "node:fs/promises";
import path from "node:path";
import {
  catalogOfficialPtBrRewrite,
  catalogReviewRestoreRewrite,
  catalogRootRewrite,
  collapseRedundantAdjacentParts,
  gameOriginFranchise,
  isDirectMainSubjectFolder,
  universeContentGroup,
  universeContentGroupCanonicalization,
  universeGroupAlias,
  universeMediaBucket,
  universeRoot,
} from "./catalog-taxonomy-rules.mjs";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

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

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const FINAL_MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const DRY_RUN = argFlag("dry-run");

const CATEGORY_ALIASES = new Map(
  Object.entries({
    acessorios: "acessorios",
    accessories: "acessorios",
    anime: "anime",
    animacao: "desenhos-animacao",
    animation: "desenhos-animacao",
    cartoon: "desenhos-animacao",
    cartoons: "desenhos-animacao",
    desenho: "desenhos-animacao",
    desenhos: "desenhos-animacao",
    "desenho animacao": "desenhos-animacao",
    "desenho-animacao": "desenhos-animacao",
    "desenhos animacao": "desenhos-animacao",
    "desenhos-animacao": "desenhos-animacao",
    comics: "quadrinhos",
    comic: "quadrinhos",
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
    musica: "musica",
    original: "original",
    "original characters": "original",
    "modelos originais": "original",
    props: "props",
    "sci fi": "sci-fi",
    "sci-fi": "sci-fi",
    serie: "filmes-series",
    series: "filmes-series",
    série: "filmes-series",
    séries: "filmes-series",
    sports: "esportes",
    tabletop: "tabletop",
    toy: "brinquedos",
    toys: "brinquedos",
    tv: "filmes-series",
    veiculos: "veiculos",
    "web series": "filmes-series",
    vtubers: "vtubers",
    "virtual youtubers": "vtubers",
  }),
);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

function slugPart(value, fallback) {
  const slug = normalizeComparable(value).replace(/\s+/g, "-");
  return (slug || fallback).slice(0, 90).replace(/-+$/g, "") || fallback;
}

function slugSubpathParts(value, fallback) {
  const parts = String(value || "")
    .split(/[\\/]+/)
    .map((part) => slugPart(part, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts : [fallback];
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalCategory(value) {
  const comparable = normalizeComparable(value);
  return CATEGORY_ALIASES.get(comparable) || slugPart(value, "outros");
}

function catalogRelParts(record) {
  const rel = String(record.catalog_relpath || record.original_catalog_relpath || "");
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  const isShallow = parts.length === 3 && !record.folder && !record.source_folder;
  return {
    category: record.category || record.final_category || record.source_category || parts[0] || "outros",
    franchise: record.franchise || record.source_franchise || parts[1] || "sem franquia",
    folder: record.folder || record.source_folder || (parts.length >= 4 ? parts[2] : "geral"),
    filename: record.filename || record.source_filename || parts.at(-1) || record.source_name || "item",
    isShallow,
  };
}

function applyOfficialPtBrRewrite(parts) {
  const rewrite = catalogOfficialPtBrRewrite(parts);
  if (!rewrite) return parts;
  return {
    ...parts,
    category: rewrite.category,
    franchise: rewrite.franchise,
    folder: rewrite.folder,
    preserveSubjectFolder:
      parts.preserveSubjectFolder ||
      rewrite.reasons.includes("shallow_filename_subject_folder") ||
      rewrite.reasons.includes("direct_main_subject_folder"),
  };
}

function dragonBallCharacterFranchise(value) {
  const text = cleanName(value);
  const match = text.match(/^dragon\s+ball\s+(.+)$/i);
  if (!match) return "";

  const character = cleanName(match[1]);
  const normalized = normalizeComparable(character);
  if (!character || ["style", "xenoverse"].includes(normalized)) return "";
  return character;
}

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

function animeFranchisePrefixFold(parts) {
  const franchise = normalizeComparable(parts.franchise);
  const folder = normalizeComparable(parts.folder);
  if (!franchise || !folder || GENERIC_MODEL_FOLDER_NAMES.has(folder)) return null;

  for (const canonical of ANIME_CANONICAL_FRANCHISES) {
    const canonicalComparable = normalizeComparable(canonical);
    const expected = `${canonicalComparable} ${folder}`;
    if (franchise === expected || franchise.startsWith(`${expected} `)) {
      return { franchise: canonical, folder: parts.folder };
    }
  }

  return null;
}

function curatedCatalogRelParts(record) {
  const parts = catalogRelParts(record);
  const reviewRestore = catalogReviewRestoreRewrite(parts);
  if (reviewRestore) {
    return {
      ...parts,
      category: reviewRestore.category,
      franchise: reviewRestore.franchise,
      folder: reviewRestore.folder,
      filename: reviewRestore.filename || parts.filename,
      preserveSubjectFolder: true,
    };
  }

  const category = canonicalCategory(parts.category);
  const animeFold = category === "anime" ? animeFranchisePrefixFold(parts) : null;
  const dragonBallCharacter = dragonBallCharacterFranchise(parts.franchise);
  const promotedUniverse = universeRoot(parts.franchise);
  const gameOrigin = gameOriginFranchise(parts.franchise, parts.folder, parts.filename);

  if (gameOrigin && category !== "games" && !universeRoot(parts.category) && !promotedUniverse) {
    return applyOfficialPtBrRewrite({
      ...parts,
      category: "games",
      franchise: gameOrigin,
      folder: parts.folder || parts.franchise,
    });
  }

  if (promotedUniverse && universeRoot(parts.category) !== promotedUniverse) {
    return applyOfficialPtBrRewrite({
      ...parts,
      category: promotedUniverse,
      franchise: universeContentGroup({
        category: parts.category,
        franchise: parts.franchise,
        folder: parts.folder,
        filename: parts.filename,
      }),
      folder: parts.folder,
    });
  }

  const currentUniverse = universeRoot(parts.category);
  if (currentUniverse) {
    const universeGroup = universeContentGroupCanonicalization({
      category: parts.category,
      franchise: parts.franchise,
      folder: parts.folder,
      filename: parts.filename,
    });
    if (universeGroup && universeGroup !== parts.franchise) {
      return applyOfficialPtBrRewrite({
        ...parts,
        category: currentUniverse,
        franchise: universeGroup,
      });
    }
  }

  const rootRewrite = catalogRootRewrite({
    category,
    franchise: parts.franchise,
    folder: parts.folder,
    filename: parts.filename,
  });
  if (rootRewrite) {
    return applyOfficialPtBrRewrite({
      ...parts,
      category: rootRewrite.category,
      franchise: rootRewrite.franchise,
      folder: rootRewrite.folder,
    });
  }

  if (animeFold) {
    return applyOfficialPtBrRewrite({
      ...parts,
      franchise: animeFold.franchise,
      folder: parts.folder || animeFold.folder,
    });
  }

  if (category === "anime" && dragonBallCharacter) {
    return applyOfficialPtBrRewrite({
      ...parts,
      franchise: "dragon ball",
      folder: parts.folder || dragonBallCharacter,
    });
  }

  return applyOfficialPtBrRewrite(parts);
}

function shouldNormalizeCatalogRelpath(record) {
  const relpaths = targetRelpaths(record);
  return relpaths.display !== record.display_relpath || relpaths.thumb !== record.thumb_relpath;
}

function normalizedRelpaths(record) {
  const parts = curatedCatalogRelParts(record);
  const category = canonicalCategory(parts.category);
  const franchise = slugPart(parts.franchise, "sem-franquia");
  const folderParts = slugSubpathParts(parts.folder, "geral");
  const folder = folderParts.join("/");
  const base = slugPart(cleanName(parts.filename), "item");
  const identity =
    String(record.message_id || "").trim() ||
    String(record.source_sha256 || record.sha256 || "").slice(0, 12) ||
    slugPart(record.source_name, "source");
  const filename = base.includes(identity) ? `${base}.webp` : `${base}-${identity}.webp`;
  const preserveFolderSubpath = folderParts.length > 1;
  const commonParts =
    parts.preserveSubjectFolder || preserveFolderSubpath || isDirectMainSubjectFolder({ category, franchise, folder })
      ? [category, franchise, ...folderParts, filename]
      : collapseRedundantAdjacentParts([category, franchise, ...folderParts, filename]).parts;
  const common = commonParts.join("/");

  return {
    display: `display/${common}`,
    thumb: `thumb/${common}`,
  };
}

function taxonomyPreservingRelpaths(record) {
  if (record.curation_status !== "taxonomy_applied" && !record.taxonomy_group) return null;

  const rewriteRoot = (relpath) => {
    const parts = String(relpath || "").split(/[\\/]+/).filter(Boolean);
    if (parts.length < 4) return relpath;

    let nextCategory = canonicalCategory(record.final_category || parts[1]);
    let nextFranchise = parts[2] || slugPart(record.source_franchise, "sem-franquia");
    let nextFolder = parts[3] || slugPart(record.source_folder, "geral");
    const rootRewrite = catalogRootRewrite({
      category: nextCategory,
      franchise: nextFranchise,
      folder: nextFolder,
      filename: parts.at(-1) || record.source_filename,
    });

    if (rootRewrite) {
      nextCategory = rootRewrite.category;
      nextFranchise = slugPart(rootRewrite.franchise, "sem-franquia");
      nextFolder = slugSubpathParts(rootRewrite.folder, "geral").join("/");
    }

    const officialRewrite = catalogOfficialPtBrRewrite({
      category: nextCategory,
      franchise: nextFranchise,
      folder: nextFolder,
      filename: parts.at(-1) || record.source_filename,
    });
    if (officialRewrite) {
      nextCategory = officialRewrite.category;
      nextFranchise = slugPart(officialRewrite.franchise, "sem-franquia");
      nextFolder = slugSubpathParts(officialRewrite.folder, "geral").join("/");
    }

    const nextFolderParts = slugSubpathParts(nextFolder, "geral");
    const nextParts = [...parts];
    nextParts[1] = nextCategory;
    nextParts[2] = nextFranchise;
    nextParts[3] = nextFolderParts.join("/");
    const preserveSubjectFolder =
      nextFolderParts.length > 1 ||
      officialRewrite?.reasons.includes("shallow_filename_subject_folder") ||
      officialRewrite?.reasons.includes("direct_main_subject_folder") ||
      isDirectMainSubjectFolder({
        category: nextCategory,
        franchise: nextFranchise,
        folder: nextFolderParts.at(-1),
      });
    return preserveSubjectFolder ? nextParts.join("/") : collapseRedundantAdjacentParts(nextParts).parts.join("/");
  };

  return {
    display: rewriteRoot(record.display_relpath),
    thumb: rewriteRoot(record.thumb_relpath),
  };
}

function targetRelpaths(record) {
  return taxonomyPreservingRelpaths(record) || normalizedRelpaths(record);
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function moveRelpath(oldRelpath, newRelpath) {
  const oldAbs = path.join(OUTPUT, oldRelpath);
  const newAbs = path.join(OUTPUT, newRelpath);
  if (oldAbs === newAbs) return { changed: false, missing: false };

  const oldExists = await exists(oldAbs);
  const newExists = await exists(newAbs);

  if (!oldExists && newExists) {
    return { changed: true, missing: false, alreadyMoved: true, oldRelpath, newRelpath };
  }

  if (!oldExists) {
    return { changed: true, missing: true, oldRelpath, newRelpath };
  }

  if (newExists) {
    return { changed: true, collision: true, oldRelpath, newRelpath };
  }

  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(newAbs), { recursive: true });
    await fs.rename(oldAbs, newAbs);
  }

  return { changed: true, missing: false, oldRelpath, newRelpath };
}

async function removeEmptyParents(startRelpath) {
  let current = path.dirname(path.join(OUTPUT, startRelpath));
  const floor = OUTPUT.toLowerCase();

  while (current.toLowerCase().startsWith(floor) && current.toLowerCase() !== floor) {
    try {
      if (!DRY_RUN) await fs.rmdir(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

async function main() {
  const records = await readJsonl(FINAL_MANIFEST);
  const moves = [];
  const missing = [];
  const collisions = [];
  const alreadyMoved = [];

  const updated = [];
  for (const record of records) {
    if (!shouldNormalizeCatalogRelpath(record)) {
      updated.push(record);
      continue;
    }

    const relpaths = targetRelpaths(record);
    const parts = curatedCatalogRelParts(record);
    const displayMove = await moveRelpath(record.display_relpath, relpaths.display);
    const thumbMove = await moveRelpath(record.thumb_relpath, relpaths.thumb);

    if (displayMove.changed) moves.push(displayMove);
    if (thumbMove.changed) moves.push(thumbMove);
    if (displayMove.missing) missing.push(displayMove);
    if (thumbMove.missing) missing.push(thumbMove);
    if (displayMove.collision) collisions.push(displayMove);
    if (thumbMove.collision) collisions.push(thumbMove);
    if (displayMove.alreadyMoved) alreadyMoved.push(displayMove);
    if (thumbMove.alreadyMoved) alreadyMoved.push(thumbMove);

    if (displayMove.missing || thumbMove.missing || displayMove.collision || thumbMove.collision) {
      updated.push(record);
      continue;
    }

    updated.push({
      ...record,
      display_relpath: relpaths.display,
      thumb_relpath: relpaths.thumb,
      final_category: canonicalCategory(parts.category),
      source_franchise: parts.franchise,
      source_folder: parts.folder,
      source_filename: parts.filename,
      original_name: cleanName(parts.folder || parts.filename || record.source_name),
    });
  }

  if (!DRY_RUN && moves.length > 0 && collisions.length === 0 && missing.length === 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.copyFile(FINAL_MANIFEST, `${FINAL_MANIFEST}.before-taxonomy-normalize-${stamp}.bak`);
    const tmp = `${FINAL_MANIFEST}.tmp`;
    await fs.writeFile(tmp, `${updated.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    await fs.rename(tmp, FINAL_MANIFEST);

    for (const move of moves) {
      if (!move.missing) await removeEmptyParents(move.oldRelpath);
    }
  }

  console.log(
    JSON.stringify(
      {
        output: OUTPUT,
        manifest: FINAL_MANIFEST,
        dry_run: DRY_RUN,
        records: records.length,
        changed_records: updated.filter(
          (row, index) =>
            row.display_relpath !== records[index].display_relpath ||
            row.thumb_relpath !== records[index].thumb_relpath,
        ).length,
        path_moves: moves.length,
        missing_inputs: missing.length,
        collisions: collisions.length,
        already_moved: alreadyMoved.length,
        examples: moves.slice(0, 12),
        missing_examples: missing.slice(0, 12),
        collision_examples: collisions.slice(0, 12),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
