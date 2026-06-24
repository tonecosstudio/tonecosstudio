import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

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
const PLAN_ARG = argValue("plan", "");
const PLAN = PLAN_ARG ? path.resolve(PLAN_ARG) : "";
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
        reason: "resolve_staging_normalization_conflicts",
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

async function latestPlan() {
  if (PLAN) return PLAN;
  const dir = path.join(OPS, "01_planos");
  const entries = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^catalog_staging_normalization_plan_.*\.json$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
  if (entries.length === 0) throw new Error(`No normalization plan found in ${dir}`);
  const stats = await Promise.all(entries.map(async (file) => ({ file, stat: await fs.stat(file) })));
  return stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0].file;
}

function relToAbs(relpath) {
  return path.resolve(path.join(CATALOG, ...String(relpath || "").split("/")));
}

function assertInsideCatalog(absPath) {
  const floor = `${CATALOG.toLowerCase()}${path.sep}`;
  if (!absPath.toLowerCase().startsWith(floor)) throw new Error(`Path outside catalog: ${absPath}`);
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

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
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

function updateHashIndex(index, moveMap) {
  if (!index || typeof index !== "object") return { updated: index, replacements: 0 };
  let replacements = 0;

  const replaceRel = (value) => {
    const normalized = String(value || "").replaceAll("\\", "/");
    const replacement = moveMap.get(normalized) || moveMap.get(normalized.toLowerCase());
    if (replacement) replacements += 1;
    return replacement || value;
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
      index.catalog_paths_by_sha256[digest] = paths.map(replaceRel);
    }
  }

  index.generated_at = new Date().toISOString();
  index.normalized_by = "resolve-catalog-staging-normalization-conflicts";
  return { updated: index, replacements };
}

async function removeEmptyParents(startRelpath) {
  let current = path.dirname(path.join(CATALOG, startRelpath));
  const floor = CATALOG.toLowerCase();

  while (current.toLowerCase().startsWith(floor) && current.toLowerCase() !== floor) {
    if (path.basename(current) === "_controle") break;
    try {
      if (APPLY) await fs.rmdir(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

function sourceContextSuffix(sourceRelpath, digest) {
  const parts = String(sourceRelpath || "").split("/").filter(Boolean);
  const context = parts.slice(0, -1).slice(-3, -1).map(slug).filter(Boolean).join("-");
  return [context, digest.slice(0, 8)].filter(Boolean).join("-");
}

function variantRelpath(targetRelpath, sourceRelpath, digest, reservedLower) {
  const parsed = path.posix.parse(targetRelpath);
  const suffix = sourceContextSuffix(sourceRelpath, digest);
  let candidate = path.posix.join(parsed.dir, `${parsed.name} - ${suffix}${parsed.ext}`);
  let counter = 2;
  while (reservedLower.has(candidate.toLowerCase()) || candidate.toLowerCase() === targetRelpath.toLowerCase()) {
    candidate = path.posix.join(parsed.dir, `${parsed.name} - ${suffix}-${counter}${parsed.ext}`);
    counter += 1;
  }
  reservedLower.add(candidate.toLowerCase());
  return candidate;
}

function duplicateRelpath(sourceRelpath, reservedLower) {
  const base = path.posix.join("_duplicados", "exatos-normalizacao", sourceRelpath);
  const parsed = path.posix.parse(base);
  let candidate = base;
  let counter = 2;
  while (reservedLower.has(candidate.toLowerCase())) {
    candidate = path.posix.join(parsed.dir, `${parsed.name} - ${counter}${parsed.ext}`);
    counter += 1;
  }
  reservedLower.add(candidate.toLowerCase());
  return candidate;
}

async function catalogRelpathLowerSet(dir) {
  const relpaths = new Set();
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.name === "_controle") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) relpaths.add(path.relative(dir, full).replaceAll("\\", "/").toLowerCase());
    }
  }
  await walk(dir);
  return relpaths;
}

async function buildActions(planPath) {
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const groups = new Map();
  const reservedLower = await catalogRelpathLowerSet(CATALOG);
  const actions = [];
  const skippedCaseOnly = [];
  const skippedMissingSource = [];

  for (const row of plan.moves || []) {
    const move = {
      source_relpath: String(row.source_relpath || "").replaceAll("\\", "/"),
      target_relpath: String(row.target_relpath || "").replaceAll("\\", "/"),
      reasons: String(row.reasons || ""),
    };
    if (move.source_relpath.toLowerCase() === move.target_relpath.toLowerCase()) {
      if (move.source_relpath !== move.target_relpath) skippedCaseOnly.push(move);
      continue;
    }
    const key = move.target_relpath.toLowerCase();
    if (!groups.has(key)) groups.set(key, { target_relpath: move.target_relpath, moves: [] });
    groups.get(key).moves.push(move);
  }

  for (const group of groups.values()) {
    const targetAbs = relToAbs(group.target_relpath);
    assertInsideCatalog(targetAbs);
    const targetExists = await exists(targetAbs);
    if (!targetExists && group.moves.length < 2) continue;
    const targetHash = targetExists ? await sha256(targetAbs) : "";

    for (const move of group.moves) {
      const sourceAbs = relToAbs(move.source_relpath);
      assertInsideCatalog(sourceAbs);
      if (!(await exists(sourceAbs))) {
        skippedMissingSource.push(move);
        continue;
      }

      const sourceHash = await sha256(sourceAbs);
      const exactDuplicate = Boolean(targetExists && targetHash && sourceHash === targetHash);
      const target_relpath = exactDuplicate
        ? duplicateRelpath(move.source_relpath, reservedLower)
        : variantRelpath(move.target_relpath, move.source_relpath, sourceHash, reservedLower);

      actions.push({
        ...move,
        resolved_relpath: target_relpath,
        resolution: exactDuplicate ? "exact_duplicate_quarantine" : "unique_variant_filename",
        source_sha256: sourceHash,
        duplicate_of_relpath: exactDuplicate ? group.target_relpath : "",
        duplicate_of_sha256: exactDuplicate ? targetHash : "",
      });
    }
  }

  return { plan, actions, skippedCaseOnly, skippedMissingSource };
}

async function main() {
  await acquireApplyLock();
  try {
    const planPath = await latestPlan();
    const { plan, actions, skippedCaseOnly, skippedMissingSource } = await buildActions(planPath);
    const moveMap = new Map(actions.map((action) => [action.source_relpath, action.resolved_relpath]));
    for (const action of actions) moveMap.set(action.source_relpath.toLowerCase(), action.resolved_relpath);

    const manifestRows = await readJsonl(MANIFEST);
    let manifestUpdates = 0;
    const generatedAt = new Date().toISOString();
    const updatedManifest = manifestRows.map((row) => {
      const current = String(row.catalog_relpath || "").replaceAll("\\", "/");
      const action = actions.find((candidate) => candidate.source_relpath.toLowerCase() === current.toLowerCase());
      if (!action) return row;
      manifestUpdates += 1;
      const parts = splitRelpath(action.resolved_relpath);
      return {
        ...row,
        status: action.resolution === "exact_duplicate_quarantine" ? "duplicate_exact_quarantined" : row.status,
        catalog_relpath: action.resolved_relpath,
        catalog_path: path.join(CATALOG, ...action.resolved_relpath.split("/")),
        category: parts.category || row.category,
        franchise: parts.franchise || row.franchise,
        folder: parts.folder || row.folder,
        filename: parts.filename || row.filename,
        normalized_at: generatedAt,
        normalized_reason: action.resolution,
        conflict_source_relpath: action.source_relpath,
        conflict_original_target_relpath: action.target_relpath,
        duplicate_of_relpath: action.duplicate_of_relpath || row.duplicate_of_relpath || "",
        duplicate_of_sha256: action.duplicate_of_sha256 || row.duplicate_of_sha256 || "",
      };
    });

    const report = {
      generated_at: generatedAt,
      apply: APPLY,
      root: ROOT,
      catalog: CATALOG,
      plan: planPath,
      planned_moves: plan.planned_moves ?? (plan.moves || []).length,
      actions: actions.length,
      manifest_updates: manifestUpdates,
      by_resolution: actions.reduce((acc, action) => {
        acc[action.resolution] = (acc[action.resolution] || 0) + 1;
        return acc;
      }, {}),
      skipped_case_only_moves: skippedCaseOnly.length,
      skipped_missing_source_moves: skippedMissingSource.length,
      examples: actions.slice(0, 40),
      skipped_case_only_examples: skippedCaseOnly.slice(0, 20),
      skipped_missing_source_examples: skippedMissingSource.slice(0, 20),
    };

    if (APPLY && actions.length > 0) {
      const stamp = generatedAt.replace(/[:.]/g, "-");
      await fs.copyFile(MANIFEST, `${MANIFEST}.before-conflict-resolve-${stamp}.bak`);
      if (await exists(HASH_INDEX)) await fs.copyFile(HASH_INDEX, `${HASH_INDEX}.before-conflict-resolve-${stamp}.bak`);

      for (const action of actions) {
        const source = relToAbs(action.source_relpath);
        const target = relToAbs(action.resolved_relpath);
        assertInsideCatalog(source);
        assertInsideCatalog(target);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.rename(source, target);
        await removeEmptyParents(action.source_relpath);
      }

      const manifestTmp = `${MANIFEST}.${process.pid}.tmp`;
      await fs.writeFile(manifestTmp, writeJsonlRows(updatedManifest), "utf8");
      await fs.rename(manifestTmp, MANIFEST);

      if (await exists(HASH_INDEX)) {
        const hashIndex = JSON.parse(await fs.readFile(HASH_INDEX, "utf8"));
        const { updated, replacements } = updateHashIndex(hashIndex, moveMap);
        report.hash_index_replacements = replacements;
        const hashTmp = `${HASH_INDEX}.${process.pid}.tmp`;
        await fs.writeFile(hashTmp, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
        await fs.rename(hashTmp, HASH_INDEX);
      }
    }

    const outDir = path.join(OPS, "06_migracoes");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(
      outDir,
      `catalog_staging_normalization_conflict_resolution_${generatedAt.replace(/[:.]/g, "-")}.json`,
    );
    await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, report: outPath }, null, 2));
  } finally {
    await releaseApplyLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
