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
const APPLY_LOCK = path.join(OPS, "06_migracoes", ".catalog-staging-normalization.lock");
let applyLockAcquired = false;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function acquireApplyLock() {
  if (!APPLY) return;
  await fs.mkdir(path.dirname(APPLY_LOCK), { recursive: true });
  try {
    await fs.writeFile(
      APPLY_LOCK,
      JSON.stringify({
        pid: process.pid,
        started_at: new Date().toISOString(),
        reason: "restore_catalog_missing_physical_from_source",
      }) + "\n",
      { flag: "wx" },
    );
    applyLockAcquired = true;
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`Another catalog staging apply is already running: ${APPLY_LOCK}`);
    }
    throw error;
  }
}

async function releaseApplyLock() {
  if (!applyLockAcquired) return;
  try {
    await fs.unlink(APPLY_LOCK);
  } catch {
    // Best effort cleanup; the next apply will still refuse if the lock remains.
  }
  applyLockAcquired = false;
}

async function* walkImages(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "_controle") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
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

function relToAbs(relpath) {
  return path.resolve(path.join(CATALOG, ...String(relpath || "").replaceAll("\\", "/").split("/")));
}

function assertInsideCatalog(absPath) {
  const floor = `${CATALOG.toLowerCase()}${path.sep}`;
  if (!absPath.toLowerCase().startsWith(floor)) throw new Error(`Path outside catalog: ${absPath}`);
}

function sourceCandidates(row) {
  const candidates = [];
  if (row.source_path) candidates.push(path.resolve(String(row.source_path)));
  if (row.source_name) candidates.push(path.join(ROOT, String(row.source_name)));
  if (row.filename) candidates.push(path.join(ROOT, String(row.filename)));
  return [...new Set(candidates)];
}

async function catalogRelpathSets() {
  const exact = new Set();
  const lower = new Set();
  for await (const file of walkImages(CATALOG)) {
    const relpath = path.relative(CATALOG, file).replaceAll("\\", "/");
    exact.add(relpath);
    lower.add(relpath.toLowerCase());
  }
  return { exact, lower };
}

async function findRestorable(row) {
  const expected = String(row.sha256 || "");
  for (const candidate of sourceCandidates(row)) {
    if (!(await exists(candidate))) continue;
    const digest = await sha256(candidate);
    return {
      source_path: candidate,
      source_sha256: digest,
      hash_matches: expected ? digest === expected : null,
    };
  }
  return null;
}

async function loadHashIndex() {
  if (!(await exists(HASH_INDEX))) {
    return { files: 0, hashes_by_size: {}, catalog_paths_by_sha256: {} };
  }
  const index = JSON.parse(await fs.readFile(HASH_INDEX, "utf8"));
  index.hashes_by_size ||= {};
  index.catalog_paths_by_sha256 ||= {};
  return index;
}

function updateHashIndex(index, restoredRows) {
  let addedPaths = 0;
  let existingPaths = 0;
  let canonicalHashesAdded = 0;

  for (const row of restoredRows) {
    const sizeKey = String(row.size);
    index.hashes_by_size[sizeKey] ||= {};
    if (!index.hashes_by_size[sizeKey][row.sha256]) {
      index.hashes_by_size[sizeKey][row.sha256] = row.catalog_relpath;
      canonicalHashesAdded += 1;
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
  index.normalized_by = "restore-catalog-missing-physical-from-source";
  return { addedPaths, existingPaths, canonicalHashesAdded };
}

async function main() {
  await acquireApplyLock();
  try {
    await fs.mkdir(OUT_DIR, { recursive: true });
    const generatedAt = new Date().toISOString();
    const manifestRows = await readJsonl(MANIFEST);
    const catalogSets = await catalogRelpathSets();
    const missingRows = manifestRows.filter((row) => {
      const relpath = String(row.catalog_relpath || "").replaceAll("\\", "/");
      return relpath && !catalogSets.exact.has(relpath) && !catalogSets.lower.has(relpath.toLowerCase());
    });

    const restorable = [];
    const blocked = [];

    for (const row of missingRows) {
      const relpath = String(row.catalog_relpath || "").replaceAll("\\", "/");
      const target = relToAbs(relpath);
      assertInsideCatalog(target);
      if (await exists(target)) {
        blocked.push({ relpath, reason: "target_exists" });
        continue;
      }

      const source = await findRestorable(row);
      if (!source) {
        blocked.push({ relpath, reason: "source_missing" });
        continue;
      }
      if (source.hash_matches === false) {
        blocked.push({
          relpath,
          reason: "source_hash_mismatch",
          source_path: source.source_path,
          source_sha256: source.source_sha256,
          expected_sha256: row.sha256 || "",
        });
        continue;
      }

      const stat = await fs.stat(source.source_path);
      restorable.push({
        relpath,
        target,
        source_path: source.source_path,
        sha256: source.source_sha256,
        size: stat.size,
      });
    }

    const restoredByRelpath = new Map(restorable.map((row) => [row.relpath, row]));
    const updatedManifestRows = manifestRows.map((row) => {
      const relpath = String(row.catalog_relpath || "").replaceAll("\\", "/");
      const restored = restoredByRelpath.get(relpath);
      if (!restored) return row;
      return {
        ...row,
        catalog_path: restored.target,
        size: restored.size,
        sha256: restored.sha256,
        restored_from_source_at: generatedAt,
        restored_from_source_path: restored.source_path,
        normalized_reason: row.normalized_reason || "restored_from_raw_source",
      };
    });

    let hashIndexStats = {
      addedPaths: 0,
      existingPaths: 0,
      canonicalHashesAdded: 0,
    };

    if (APPLY && restorable.length > 0) {
      const stamp = generatedAt.replace(/[:.]/g, "-");
      await fs.copyFile(MANIFEST, `${MANIFEST}.before-restore-missing-physical-${stamp}.bak`);
      if (await exists(HASH_INDEX)) await fs.copyFile(HASH_INDEX, `${HASH_INDEX}.before-restore-missing-physical-${stamp}.bak`);

      for (const row of restorable) {
        await fs.mkdir(path.dirname(row.target), { recursive: true });
        await fs.copyFile(row.source_path, row.target);
      }

      const manifestTmp = `${MANIFEST}.${process.pid}.tmp`;
      await fs.writeFile(manifestTmp, writeJsonlRows(updatedManifestRows), "utf8");
      await fs.rename(manifestTmp, MANIFEST);

      const hashIndex = await loadHashIndex();
      hashIndexStats = updateHashIndex(
        hashIndex,
        restorable.map((row) => ({
          catalog_relpath: row.relpath,
          size: row.size,
          sha256: row.sha256,
        })),
      );
      const hashTmp = `${HASH_INDEX}.${process.pid}.tmp`;
      await fs.writeFile(hashTmp, `${JSON.stringify(hashIndex, null, 2)}\n`, "utf8");
      await fs.rename(hashTmp, HASH_INDEX);
    }

    const report = {
      generated_at: generatedAt,
      apply: APPLY,
      root: ROOT,
      catalog: CATALOG,
      manifest: MANIFEST,
      missing_rows: missingRows.length,
      restorable: restorable.length,
      blocked: blocked.length,
      hash_index_stats: hashIndexStats,
      examples: restorable.slice(0, 40).map((row) => ({
        catalog_relpath: row.relpath,
        source_path: row.source_path,
        size: row.size,
        sha256: row.sha256,
      })),
      blocked_examples: blocked.slice(0, 40),
    };

    const stamp = generatedAt.replace(/[:.]/g, "-");
    const jsonPath = path.join(OUT_DIR, `catalog_missing_physical_restore_${stamp}.json`);
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, json: jsonPath }, null, 2));
  } finally {
    await releaseApplyLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
