import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  catalogOfficialPtBrRewrite,
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
import { defaultTelegramRoot, defaultTelegramWebpOutput } from "./telegram-paths.mjs";

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

const ROOT = path.resolve(
  argValue(
    "root",
    process.env.TELEGRAM_ROOT ||
      defaultTelegramRoot(),
  ),
);
const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.TELEGRAM_CATALOG_MANIFEST ||
      path.join(ROOT, "catalogo", "_controle", "catalog_manifest.jsonl"),
  ),
);
const LIMIT = Number.parseInt(argValue("limit", "500"), 10);
const CHECKPOINT_SIZE = Number.parseInt(argValue("checkpoint-size", "100"), 10);
const DRY_RUN = argFlag("dry-run");
const PRIVATE_CURADORIA = argFlag("private-curadoria");
const INCLUDE_LOW = argFlag("include-low-confidence");
const OVERWRITE = argFlag("overwrite");
const RETRY_FAILED = argFlag("retry-failed");

const PROFILE = {
  version: "telegram-webp-final-v1",
  display: { maxSize: 900, quality: 68, effort: 4 },
  thumb: { maxSize: 512, quality: 68, effort: 4 },
};

const FINAL_MANIFEST = path.join(OUTPUT, "manifests", "manifest_final.jsonl");
const RUNS_DIR = path.join(OUTPUT, "manifests", "runs");
const FAILURE_LOG = path.join(OUTPUT, "manifests", "webp_failures.jsonl");

const SKIPPED_CATEGORIES = new Set([
  "duplicados",
  "fora catalogo",
  "problemas",
  "revisar",
  "adulto",
  "nao identificado",
  "não identificado",
]);

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
    "decoração": "decoracao",
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
    "música": "musica",
    original: "original",
    "original characters": "original",
    "modelos originais": "original",
    brands: "props",
    fantasy: "tabletop",
    historicos: "tabletop",
    holiday: "props",
    internet: "props",
    literature: "filmes-series",
    pokemon: "games",
    props: "props",
    "sci fi": "sci-fi",
    "sci-fi": "sci-fi",
    serie: "filmes-series",
    series: "filmes-series",
    série: "filmes-series",
    séries: "filmes-series",
    sports: "esportes",
    tabletop: "tabletop",
    tematicos: "props",
    toy: "brinquedos",
    toys: "brinquedos",
    tv: "filmes-series",
    veiculos: "veiculos",
    "web series": "filmes-series",
    veículos: "veiculos",
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
  const rel = String(record.catalog_relpath || "");
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  const isShallow = parts.length === 3 && !record.folder;
  return {
    category: record.category || parts[0] || "outros",
    franchise: record.franchise || parts[1] || "sem franquia",
    folder: record.folder || (parts.length >= 4 ? parts[2] : "geral"),
    filename: record.filename || parts.at(-1) || record.source_name || "item",
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
  const sourceCategory = normalizeComparable(parts.category).replace(/\s+/g, "-");
  const category = canonicalCategory(parts.category);
  const animeFold = category === "anime" ? animeFranchisePrefixFold(parts) : null;
  const dragonBallCharacter = dragonBallCharacterFranchise(parts.franchise);
  const promotedUniverse = universeRoot(parts.franchise);
  const gameOrigin = gameOriginFranchise(parts.franchise, parts.folder, parts.filename);

  if (sourceCategory === "pokemon") {
    return applyOfficialPtBrRewrite({
      ...parts,
      category: "games",
      franchise: "pokemon",
      folder: parts.folder || parts.franchise,
    });
  }

  if (
    sourceCategory === "internet" &&
    ["hololive", "vtubers"].includes(normalizeComparable(parts.franchise))
  ) {
    return applyOfficialPtBrRewrite({
      ...parts,
      category: "vtubers",
    });
  }

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
    category: category,
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

function acceptedConfidence(value) {
  if (INCLUDE_LOW) return true;
  const text = normalizeComparable(value);
  if (["alta", "media", "high", "medium"].includes(text)) return true;
  const numeric = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0.75;
}

function acceptedRecord(record) {
  const status = String(record.status || "");
  if (status === "prepared_private") {
    if (!PRIVATE_CURADORIA || record.private_staging_only !== true) return false;
  } else if (!["copied", "already_cataloged"].includes(status)) return false;
  if (!record.source_name || !record.catalog_relpath) return false;
  const { category } = catalogRelParts(record);
  if (SKIPPED_CATEGORIES.has(normalizeComparable(category))) return false;
  if (!acceptedConfidence(record.confidence)) return false;
  return true;
}

function finalRelpaths(record) {
  const parts = curatedCatalogRelParts(record);
  const category = canonicalCategory(parts.category);
  const franchise = slugPart(parts.franchise, "sem-franquia");
  const folder = slugPart(parts.folder, "geral");
  const base = slugPart(cleanName(parts.filename), "item");
  const identity =
    String(record.message_id || "").trim() ||
    String(record.sha256 || "").slice(0, 12) ||
    slugPart(record.source_name, "source");
  const filename = base.includes(identity) ? `${base}.webp` : `${base}-${identity}.webp`;
  const commonParts =
    parts.preserveSubjectFolder || isDirectMainSubjectFolder({ category, franchise, folder })
      ? [category, franchise, folder, filename]
      : collapseRedundantAdjacentParts([category, franchise, folder, filename]).parts;
  const common = path.join(...commonParts);
  return {
    display: path.join("display", common),
    thumb: path.join("thumb", common),
  };
}

async function inputPathFor(record) {
  const localCatalogPath = path.join(
    ROOT,
    "catalogo",
    ...String(record.catalog_relpath || "").split(/[\\/]+/).filter(Boolean),
  );
  if (await exists(localCatalogPath)) return localCatalogPath;

  const localSourcePath = path.join(ROOT, String(record.source_name || ""));
  if (await exists(localSourcePath)) return localSourcePath;

  return null;
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function recordKey(record) {
  return `${record.source_name || ""}\0${record.catalog_relpath || record.original_catalog_relpath || ""}\0${
    PROFILE.version
  }`;
}

async function readFinalKeys() {
  if (!(await exists(FINAL_MANIFEST))) return new Set();
  const rows = await readJsonl(FINAL_MANIFEST);
  return new Set(
    rows.map(
      (row) =>
        `${row.source_name || ""}\0${row.original_catalog_relpath || ""}\0${
          row.profile_version || ""
        }`,
    ),
  );
}

async function readFailedKeys() {
  if (RETRY_FAILED || !(await exists(FAILURE_LOG))) return new Set();

  const rows = await readJsonl(FAILURE_LOG);
  return new Set(
    rows.map(
      (row) =>
        row.key ||
        `${row.source_name || ""}\0${row.catalog_relpath || ""}\0${
          row.profile_version || PROFILE.version
        }`,
    ),
  );
}

async function appendFinalRecords(records) {
  if (DRY_RUN || records.length === 0) return;

  await fs.appendFile(
    FINAL_MANIFEST,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8",
  );
}

async function appendFailure(record, error, inputPath) {
  if (DRY_RUN) return;

  const failure = {
    failed_at: new Date().toISOString(),
    key: recordKey(record),
    profile_version: PROFILE.version,
    source_name: record.source_name || null,
    catalog_relpath: record.catalog_relpath || null,
    input_path: inputPath || null,
    message: error.message,
  };

  await fs.appendFile(FAILURE_LOG, `${JSON.stringify(failure)}\n`, "utf8");
}

async function convertOne(inputPath, outputPath, variant) {
  if (!OVERWRITE && (await exists(outputPath))) {
    const metadata = await sharp(outputPath).metadata();
    const stat = await fs.stat(outputPath);
    return {
      reused: true,
      bytes: stat.size,
      width: metadata.width || null,
      height: metadata.height || null,
    };
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const info = await sharp(inputPath, { limitInputPixels: false })
    .rotate()
    .resize({
      width: variant.maxSize,
      height: variant.maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: variant.quality, effort: variant.effort })
    .toFile(outputPath);

  return {
    reused: false,
    bytes: info.size,
    width: info.width,
    height: info.height,
  };
}

function finalRecord(record, inputPath, relpaths, display, thumb) {
  const parts = curatedCatalogRelParts(record);
  return {
    built_at: new Date().toISOString(),
    profile_version: PROFILE.version,
    source_type: "telegram",
    private_staging_only: record.private_staging_only === true,
    source_name: record.source_name || null,
    message_id: record.message_id || null,
    source_sha256: record.sha256 || null,
    original_catalog_relpath: record.catalog_relpath,
    input_path: inputPath,
    display_relpath: relpaths.display.replaceAll("\\", "/"),
    thumb_relpath: relpaths.thumb.replaceAll("\\", "/"),
    display_bytes: display.bytes,
    display_width: display.width,
    display_height: display.height,
    thumb_bytes: thumb.bytes,
    thumb_width: thumb.width,
    thumb_height: thumb.height,
    source_category: record.category || null,
    final_category: canonicalCategory(parts.category),
    source_franchise: parts.franchise || null,
    source_folder: parts.folder || null,
    source_filename: parts.filename || null,
    confidence: record.confidence || null,
    notes: record.notes || null,
    public_name_pt_br: null,
    original_name: cleanName(record.folder || record.filename || record.source_name),
    aliases: [],
    curation_status: record.private_staging_only === true ? "private_not_authorized" : "needs_ptbr_name",
  };
}

function reportPath() {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "Z");
  return path.join(RUNS_DIR, `webp_run_${stamp}.json`);
}

async function main() {
  await fs.mkdir(path.join(OUTPUT, "display"), { recursive: true });
  await fs.mkdir(path.join(OUTPUT, "thumb"), { recursive: true });
  await fs.mkdir(path.join(OUTPUT, "manifests"), { recursive: true });
  await fs.mkdir(RUNS_DIR, { recursive: true });

  const rows = await readJsonl(MANIFEST);
  const finalKeys = await readFinalKeys();
  const failedKeys = await readFailedKeys();
  const stats = {
    root: ROOT,
    output: OUTPUT,
    manifest: MANIFEST,
    final_manifest: FINAL_MANIFEST,
    dry_run: DRY_RUN,
    private_curadoria: PRIVATE_CURADORIA,
    limit: LIMIT,
    checkpoint_size: CHECKPOINT_SIZE,
    retry_failed: RETRY_FAILED,
    profile: PROFILE,
    manifest_rows: rows.length,
    accepted_seen: 0,
    processed: 0,
    reused_outputs: 0,
    skipped_existing_final_manifest: 0,
    skipped_known_failures: 0,
    skipped_unaccepted: 0,
    skipped_missing_input: 0,
    failed: 0,
    checkpoints_written: 0,
    display_bytes: 0,
    thumb_bytes: 0,
    failure_log: FAILURE_LOG,
    errors: [],
  };

  const outputRecords = [];

  for (const record of rows) {
    if (!acceptedRecord(record)) {
      stats.skipped_unaccepted += 1;
      continue;
    }

    stats.accepted_seen += 1;
    const key = recordKey(record);
    if (finalKeys.has(key)) {
      stats.skipped_existing_final_manifest += 1;
      continue;
    }
    if (failedKeys.has(key)) {
      stats.skipped_known_failures += 1;
      continue;
    }

    if (Number.isFinite(LIMIT) && stats.processed >= LIMIT) break;

    const inputPath = await inputPathFor(record);
    if (!inputPath) {
      stats.skipped_missing_input += 1;
      continue;
    }

    const relpaths = finalRelpaths(record);
    const displayPath = path.join(OUTPUT, relpaths.display);
    const thumbPath = path.join(OUTPUT, relpaths.thumb);

    try {
      if (DRY_RUN) {
        stats.processed += 1;
        continue;
      }

      const display = await convertOne(inputPath, displayPath, PROFILE.display);
      const thumb = await convertOne(inputPath, thumbPath, PROFILE.thumb);
      if (display.reused || thumb.reused) stats.reused_outputs += 1;
      stats.display_bytes += display.bytes;
      stats.thumb_bytes += thumb.bytes;
      outputRecords.push(finalRecord(record, inputPath, relpaths, display, thumb));
      finalKeys.add(key);
      stats.processed += 1;

      if (
        Number.isFinite(CHECKPOINT_SIZE) &&
        CHECKPOINT_SIZE > 0 &&
        outputRecords.length >= CHECKPOINT_SIZE
      ) {
        await appendFinalRecords(outputRecords);
        outputRecords.length = 0;
        stats.checkpoints_written += 1;
      }
    } catch (error) {
      stats.failed += 1;
      await appendFailure(record, error, inputPath);
      failedKeys.add(key);
      stats.errors.push({
        source_name: record.source_name || null,
        catalog_relpath: record.catalog_relpath || null,
        message: error.message,
      });
    }
  }

  if (outputRecords.length > 0) {
    await appendFinalRecords(outputRecords);
    outputRecords.length = 0;
    stats.checkpoints_written += 1;
  }

  stats.display_mb = Number((stats.display_bytes / 1024 / 1024).toFixed(2));
  stats.thumb_mb = Number((stats.thumb_bytes / 1024 / 1024).toFixed(2));
  stats.total_output_mb = Number(
    ((stats.display_bytes + stats.thumb_bytes) / 1024 / 1024).toFixed(2),
  );

  const runReport = reportPath();
  await fs.writeFile(runReport, `${JSON.stringify(stats, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ...stats, run_report: runReport }, null, 2));
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
