import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createReadStream } from "node:fs";
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
import { isPrivateCuradoriaRecord } from "./telegram-private-staging-gate.mjs";

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
  if (isPrivateCuradoriaRecord(record)) {
    if (!PRIVATE_CURADORIA || status !== "prepared_private") return false;
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
    private_staging_only: isPrivateCuradoriaRecord(record),
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


const PRIVATE_ORIGIN_ID = "2370335738";
const PRIVATE_FORMATS = new Set(["jpeg", "png", "webp", "gif", "tiff", "avif", "heif"]);
function privateKey(record) {
  return ["telegram", String(record.telegram_origin_id || PRIVATE_ORIGIN_ID),
    String(record.sha256 || record.source_sha256 || "").toLowerCase(), PROFILE.version].join(":");
}
function privateMessageKey(record) {
  return privateKey(record) + ":" + String(record.message_id);
}
function privateAllowed(record) {
  const topic = String(record.original_topic || "").trim().toLowerCase().replace(/\s+/g, " ");
  return record.status === "prepared_private" && record.private_staging_only === true &&
    topic.length > 0 && topic !== "geral + 50k" &&
    /^\d+$/.test(String(record.message_id || "")) &&
    /^\d+$/.test(String(record.telegram_origin_id || "")) &&
    /^[a-f0-9]{64}$/i.test(String(record.sha256 || "")) &&
    typeof record.source_name === "string" && record.source_name.length > 0;
}
function privatePath(root, rel) {
  const base = path.resolve(root);
  const result = path.resolve(base, rel);
  if (!result.toLowerCase().startsWith((base + path.sep).toLowerCase())) {
    throw new Error("path_outside_private_root");
  }
  return result;
}
async function privateSha(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    createReadStream(file).on("data", (chunk) => hash.update(chunk))
      .on("error", reject).on("end", () => resolve(hash.digest("hex")));
  });
}
function privatePaths(record) {
  const sha = String(record.sha256).toLowerCase();
  const sub = path.join("telegram-" + record.telegram_origin_id,
    PROFILE.version, sha.slice(0, 2), sha + ".webp");
  return { display: path.join("display", sub), thumb: path.join("thumb", sub) };
}
async function privateInspect(rel, maxSize) {
  const file = privatePath(OUTPUT, rel);
  if (!(await exists(file))) return null;
  const m = await sharp(file).metadata();
  const stat = await fs.stat(file);
  if (m.format !== "webp" || !m.width || !m.height ||
      Math.max(m.width, m.height) > maxSize || stat.size < 16) {
    throw new Error("invalid_webp:" + rel);
  }
  return { bytes: stat.size, width: m.width, height: m.height,
    sha256: await privateSha(file), reused: true };
}
async function privatePair(rel) {
  const display = await privateInspect(rel.display, PROFILE.display.maxSize);
  const thumb = await privateInspect(rel.thumb, PROFILE.thumb.maxSize);
  return display && thumb ? { rel, display, thumb } : null;
}
async function privateCreate(source, relative, params) {
  const cached = await privateInspect(relative, params.maxSize);
  if (cached) return cached;
  const dest = privatePath(OUTPUT, relative);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = dest + "." + process.pid + ".partial.webp";
  try {
    const buffer = await sharp(source, { limitInputPixels: false }).rotate()
      .resize({ width: params.maxSize, height: params.maxSize, fit: "inside",
        withoutEnlargement: true })
      .webp({ quality: params.quality, effort: params.effort }).toBuffer();
    const meta = await sharp(buffer).metadata();
    if (meta.format !== "webp" || Math.max(meta.width, meta.height) > params.maxSize) {
      throw new Error("invalid_converted_webp");
    }
    // O Windows pode segurar o handle do arquivo temporário; grava com exclusão (wx).
    try { await fs.writeFile(dest, buffer, { flag: "wx" }); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      return await privateInspect(relative, params.maxSize);
    }
    return { ...(await privateInspect(relative, params.maxSize)), reused: false };
  } finally {
    await fs.rm(tmp, { force: true }).catch(() => {});
  }
}
function privateRecord(record, asset) {
  return {
    built_at: new Date().toISOString(),
    profile_version: PROFILE.version,
    asset_key: privateKey(record),
    telegram_origin_id: String(record.telegram_origin_id),
    source_type: "telegram", private_staging_only: true,
    message_id: Number(record.message_id), original_topic: record.original_topic,
    source_name: record.source_name, source_sha256: String(record.sha256).toLowerCase(),
    display_relpath: asset.rel.display.replaceAll("\\", "/"),
    thumb_relpath: asset.rel.thumb.replaceAll("\\", "/"),
    display_bytes: asset.display.bytes, display_width: asset.display.width,
    display_height: asset.display.height, display_sha256: asset.display.sha256,
    thumb_bytes: asset.thumb.bytes, thumb_width: asset.thumb.width,
    thumb_height: asset.thumb.height, thumb_sha256: asset.thumb.sha256,
    source_category: "curadoria-privada",
    original_name: String(record.franchise || "sem-nome"),
    curation_status: "private_not_authorized", public_name_pt_br: null
  };
}
async function privateCheckpoint(rows) {
  const tmp = FINAL_MANIFEST + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  await fs.rename(tmp, FINAL_MANIFEST);
}
async function privateCuradoriaMain() {
  const inputs = await readJsonl(MANIFEST);
  const rows = await exists(FINAL_MANIFEST) ? await readJsonl(FINAL_MANIFEST) : [];
  const byMessage = new Map(), byAsset = new Map();
  for (const item of rows) {
    if (item.profile_version !== PROFILE.version ||
        !/^[a-f0-9]{64}$/i.test(String(item.source_sha256 || ""))) continue;
    const record = { telegram_origin_id: item.telegram_origin_id || PRIVATE_ORIGIN_ID,
      source_sha256: item.source_sha256, message_id: item.message_id };
    byMessage.set(privateMessageKey(record), item);
    if (!byAsset.has(privateKey(record)) && item.display_relpath && item.thumb_relpath) {
      byAsset.set(privateKey(record), {
        display: item.display_relpath, thumb: item.thumb_relpath
      });
    }
  }
  const failures = await exists(FAILURE_LOG) ? await readJsonl(FAILURE_LOG) : [];
  const failedKeys = new Set(failures.map((row) => row.message_key).filter(Boolean));
  const stats = {
    root: ROOT, output: OUTPUT, manifest: MANIFEST,
    final_manifest: FINAL_MANIFEST, profile: PROFILE,
    input_records: inputs.length, old_records: rows.length,
    accepted: 0, new_records: 0, reconciled_legacy_records: 0,
    reused_existing_outputs: 0, new_unique_derivations: 0,
    skipped_checkpoint: 0, skipped_out_of_scope: 0,
    skipped_not_failed: 0, failed: 0, missing: 0,
    checkpoints_written: 0, private_curadoria: true,
    dry_run: DRY_RUN, public_upload_performed: false,
    errors: []
  };
  let dirty = 0;
  if (!DRY_RUN) await fs.mkdir(RUNS_DIR, { recursive: true });
  for (const item of inputs) {
    if (!privateAllowed(item)) { stats.skipped_out_of_scope++; continue; }
    const messageKey = privateMessageKey(item);
    if (RETRY_FAILED && !failedKeys.has(messageKey)) {
      stats.skipped_not_failed++; continue;
    }
    if (Number.isFinite(LIMIT) && stats.accepted >= LIMIT) break;
    stats.accepted++;
    const sourceKey = privateKey(item), current = byMessage.get(messageKey);
    try {
      const src = privatePath(ROOT, item.source_name);
      if (!(await exists(src))) { stats.missing++; throw new Error("original_missing"); }
      if (!current) {
        const meta = await sharp(src).metadata();
        if (!PRIVATE_FORMATS.has(meta.format) || !meta.width || !meta.height) {
          throw new Error("unsupported_or_invalid_original");
        }
        if (await privateSha(src) !== String(item.sha256).toLowerCase()) {
          throw new Error("original_sha256_mismatch_before");
        }
      }
      let asset = null;
      if (current) {
        asset = await privatePair({
          display: current.display_relpath, thumb: current.thumb_relpath
        });
        if (asset) {
          const enriched = { ...current, asset_key: sourceKey,
            telegram_origin_id: String(item.telegram_origin_id),
            original_topic: item.original_topic,
            source_name: item.source_name,
            source_sha256: String(item.sha256).toLowerCase(),
            display_sha256: asset.display.sha256,
            thumb_sha256: asset.thumb.sha256,
            curation_status: "private_not_authorized",
            private_staging_only: true };
          delete enriched.input_path;
          delete enriched.original_catalog_relpath;
          if (JSON.stringify(enriched) !== JSON.stringify(current)) {
            rows[rows.indexOf(current)] = enriched;
            byMessage.set(messageKey, enriched);
            stats.reconciled_legacy_records++;
            dirty++;
          }
          byAsset.set(sourceKey, asset.rel);
          stats.skipped_checkpoint++;
          if (dirty >= CHECKPOINT_SIZE && !DRY_RUN) {
            await privateCheckpoint(rows); dirty = 0; stats.checkpoints_written++;
          }
          continue;
        }
      }

      if (DRY_RUN) { stats.new_records++; continue; }
      const rel = byAsset.get(sourceKey) || privatePaths(item);
      asset = await privatePair(rel);
      if (asset) {
        stats.reused_existing_outputs++;
      } else {
        const display = await privateCreate(src, rel.display, PROFILE.display);
        const thumb = await privateCreate(src, rel.thumb, PROFILE.thumb);
        asset = { rel, display, thumb };
        if (!display.reused || !thumb.reused) stats.new_unique_derivations++;
      }
      if (await privateSha(src) !== String(item.sha256).toLowerCase()) {
        throw new Error("original_sha256_mismatch_after");
      }
      const updated = privateRecord(item, asset);
      if (current) {
        rows[rows.indexOf(current)] = updated;
        stats.reconciled_legacy_records++;
      } else {
        rows.push(updated);
        stats.new_records++;
      }
      byMessage.set(messageKey, updated);
      byAsset.set(sourceKey, asset.rel);
      dirty++;
      if (dirty >= CHECKPOINT_SIZE) {
        await privateCheckpoint(rows); dirty = 0; stats.checkpoints_written++;
      }
    } catch (error) {
      stats.failed++;
      const failure = {
        failed_at: new Date().toISOString(),
        message_key: messageKey, asset_key: sourceKey,
        message_id: item.message_id, source_name: item.source_name,
        original_topic: item.original_topic, profile_version: PROFILE.version,
        message: String(error.message)
      };
      stats.errors.push(failure);
      if (!DRY_RUN) await fs.appendFile(FAILURE_LOG, JSON.stringify(failure) + "\n");
    }
  }
  if (dirty && !DRY_RUN) {
    await privateCheckpoint(rows);
    stats.checkpoints_written++;
  }
  stats.final_records = rows.length;
  stats.final_unique_assets = new Set(rows.map((row) =>
    privateKey({ telegram_origin_id: row.telegram_origin_id,
      source_sha256: row.source_sha256 }))).size;
  if (!DRY_RUN) await fs.writeFile(reportPath(), JSON.stringify(stats, null, 2) + "\n");
  console.log(JSON.stringify(stats, null, 2));
  if (stats.failed) process.exitCode = 1;
}





(PRIVATE_CURADORIA ? privateCuradoriaMain() : main()).catch((error) => {
  console.error(error);
  process.exit(1);
});
