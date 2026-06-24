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
const CONTROL = path.join(CATALOG, "_controle");
const OPS = path.resolve(argValue("ops", path.join(CONTROL, "00_operacao_v2")));
const PLAN_ARG = argValue("plan", "");
const PLAN = PLAN_ARG ? path.resolve(PLAN_ARG) : "";
const REASON = argValue("reason", "anime_franchise_character_fold");
const SOURCE_CATEGORY = argValue("source-category", "");
const TARGET_CATEGORY = argValue("target-category", "");
const EXCLUDE_SOURCE_CATEGORY = argValue("exclude-source-category", "");
const EXCLUDE_TARGET_CATEGORY = argValue("exclude-target-category", "");
const SOURCE_PREFIX = argValue("source-prefix", "");
const TARGET_PREFIX = argValue("target-prefix", "");
const LIMIT_RAW = argValue("limit", "");
const LIMIT = LIMIT_RAW ? Number.parseInt(LIMIT_RAW, 10) : 0;
const APPLY = argFlag("apply");
const ALLOW_UNMANIFESTED = argFlag("allow-unmanifested");
const SKIP_CONFLICTS = argFlag("skip-conflicts");
const MANIFEST = path.resolve(argValue("manifest", path.join(CONTROL, "catalog_manifest.jsonl")));
const HASH_INDEX = path.resolve(argValue("hash-index", path.join(CONTROL, "catalog_hash_index.json")));
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
      JSON.stringify({ pid: process.pid, started_at: new Date().toISOString(), reason: REASON }) + "\n",
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
  return path.resolve(path.join(CATALOG, relpath));
}

function assertInsideCatalog(absPath) {
  const floor = `${CATALOG.toLowerCase()}${path.sep}`;
  if (!absPath.toLowerCase().startsWith(floor)) throw new Error(`Path outside catalog: ${absPath}`);
}

function splitRelpath(relpath) {
  const parts = relpath.split(/[\\/]+/).filter(Boolean);
  return {
    category: parts[0] || "",
    franchise: parts[1] || "",
    folder: parts[2] || "",
    filename: parts.at(-1) || "",
  };
}

function topCategory(relpath) {
  return splitRelpath(relpath).category;
}

function matchesTextFilter(value, filter) {
  if (!filter) return true;
  return String(value || "").toLowerCase() === String(filter).toLowerCase();
}

function doesNotMatchTextFilter(value, filter) {
  return !filter || !matchesTextFilter(value, filter);
}

function matchesPrefixFilter(value, filter) {
  if (!filter) return true;
  return String(value || "").replaceAll("\\", "/").toLowerCase().startsWith(String(filter).replaceAll("\\", "/").toLowerCase());
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJsonlRows(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
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

async function loadMoves(planPath) {
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const moves = (plan.moves || [])
    .map((row) => ({
      source_relpath: String(row.source_relpath || "").replaceAll("\\", "/"),
      target_relpath: String(row.target_relpath || "").replaceAll("\\", "/"),
      reasons: row.reasons || "",
    }))
    .filter((row) => String(row.reasons || "").split("|").includes(REASON))
    .filter((row) => matchesTextFilter(topCategory(row.source_relpath), SOURCE_CATEGORY))
    .filter((row) => matchesTextFilter(topCategory(row.target_relpath), TARGET_CATEGORY))
    .filter((row) => doesNotMatchTextFilter(topCategory(row.source_relpath), EXCLUDE_SOURCE_CATEGORY))
    .filter((row) => doesNotMatchTextFilter(topCategory(row.target_relpath), EXCLUDE_TARGET_CATEGORY))
    .filter((row) => matchesPrefixFilter(row.source_relpath, SOURCE_PREFIX))
    .filter((row) => matchesPrefixFilter(row.target_relpath, TARGET_PREFIX));

  if (Number.isFinite(LIMIT) && LIMIT > 0) return moves.slice(0, LIMIT);
  return moves;
}

function addDuplicateIssues(moves, issues, key, type) {
  const seen = new Map();
  for (const move of moves) {
    const value = String(move[key] || "").toLowerCase();
    const first = seen.get(value);
    if (first) issues.push({ type, first, duplicate: move });
    else seen.set(value, move);
  }
}

async function collectIssues(moves, manifestRelpaths, manifestRelpathsLower) {
  const issues = [];

  addDuplicateIssues(moves, issues, "source_relpath", "duplicate_source_in_plan");
  addDuplicateIssues(moves, issues, "target_relpath", "duplicate_target_in_plan");

  for (const move of moves) {
    const source = relToAbs(move.source_relpath);
    const target = relToAbs(move.target_relpath);
    assertInsideCatalog(source);
    assertInsideCatalog(target);
    if (move.source_relpath.toLowerCase() === move.target_relpath.toLowerCase()) {
      issues.push({ type: "same_source_target", ...move });
    }
    if (!(await exists(source))) issues.push({ type: "missing_source", ...move });
    if (await exists(target)) issues.push({ type: "target_exists", ...move });
  }

  if (!ALLOW_UNMANIFESTED) {
    for (const move of moves) {
      if (!manifestRelpaths.has(move.source_relpath) && !manifestRelpathsLower.has(move.source_relpath.toLowerCase())) {
        issues.push({ type: "manifest_missing_source", ...move });
      }
    }
  }

  return issues;
}

function conflictMoveKeys(issues) {
  const sourceKeys = new Set();
  const targetKeys = new Set();
  const byType = {};

  const mark = (move) => {
    if (!move) return;
    if (move.source_relpath) sourceKeys.add(String(move.source_relpath).toLowerCase());
    if (move.target_relpath) targetKeys.add(String(move.target_relpath).toLowerCase());
  };

  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
    mark(issue);
    mark(issue.first);
    mark(issue.duplicate);
  }

  return { sourceKeys, targetKeys, byType };
}

function countCategoryPairs(moves) {
  const counts = new Map();
  for (const move of moves) {
    const key = `${topCategory(move.source_relpath)} -> ${topCategory(move.target_relpath)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function updateHashIndex(index, moveMap) {
  if (!index || typeof index !== "object") return { updated: index, replacements: 0 };
  let replacements = 0;

  const replaceRel = (value) => {
    const normalized = String(value || "").replaceAll("\\", "/");
    const replacement = moveMap.get(normalized);
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
  index.normalized_by = "apply-catalog-staging-normalization-plan";
  return { updated: index, replacements };
}

async function main() {
  await acquireApplyLock();
  try {
  const planPath = await latestPlan();
  let moves = await loadMoves(planPath);
  const selectedMovesBeforeConflictFilter = moves.length;
  const manifestRows = await readJsonl(MANIFEST);
  const manifestRelpaths = new Set(manifestRows.map((row) => String(row.catalog_relpath || "").replaceAll("\\", "/")));
  const manifestRelpathsLower = new Set([...manifestRelpaths].map((relpath) => relpath.toLowerCase()));

  let issues = await collectIssues(moves, manifestRelpaths, manifestRelpathsLower);
  let skippedConflictMoves = [];
  let skippedConflictIssuesByType = {};

  if (SKIP_CONFLICTS && issues.length > 0) {
    const conflictKeys = conflictMoveKeys(issues);
    skippedConflictIssuesByType = conflictKeys.byType;
    const cleanMoves = [];
    for (const move of moves) {
      const sourceKey = move.source_relpath.toLowerCase();
      const targetKey = move.target_relpath.toLowerCase();
      if (conflictKeys.sourceKeys.has(sourceKey) || conflictKeys.targetKeys.has(targetKey)) {
        skippedConflictMoves.push(move);
      } else {
        cleanMoves.push(move);
      }
    }
    moves = cleanMoves;
    issues = await collectIssues(moves, manifestRelpaths, manifestRelpathsLower);
  }

  const moveMap = new Map(moves.map((move) => [move.source_relpath, move.target_relpath]));
  const moveMapLower = new Map(moves.map((move) => [move.source_relpath.toLowerCase(), move.target_relpath]));

  let manifestUpdates = 0;
  const updatedManifest = manifestRows.map((row) => {
    const current = String(row.catalog_relpath || "").replaceAll("\\", "/");
    const target = moveMap.get(current) || moveMapLower.get(current.toLowerCase());
    if (!target) return row;
    manifestUpdates += 1;
    const parts = splitRelpath(target);
    return {
      ...row,
      catalog_relpath: target,
      catalog_path: path.join(CATALOG, ...target.split("/")),
      category: parts.category || row.category,
      franchise: parts.franchise || row.franchise,
      folder: parts.folder || row.folder,
      filename: parts.filename || row.filename,
      normalized_at: new Date().toISOString(),
      normalized_reason: REASON,
    };
  });

  const migration = {
    generated_at: new Date().toISOString(),
    apply: APPLY,
    root: ROOT,
    catalog: CATALOG,
    plan: planPath,
    reason: REASON,
    filters: {
      source_category: SOURCE_CATEGORY || null,
      target_category: TARGET_CATEGORY || null,
      exclude_source_category: EXCLUDE_SOURCE_CATEGORY || null,
      exclude_target_category: EXCLUDE_TARGET_CATEGORY || null,
      source_prefix: SOURCE_PREFIX || null,
      target_prefix: TARGET_PREFIX || null,
      limit: Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : null,
      allow_unmanifested: ALLOW_UNMANIFESTED,
      skip_conflicts: SKIP_CONFLICTS,
    },
    selected_moves_before_conflict_filter: selectedMovesBeforeConflictFilter,
    planned_moves: moves.length,
    skipped_conflict_moves: skippedConflictMoves.length,
    skipped_conflict_issues_by_type: skippedConflictIssuesByType,
    skipped_conflict_examples: skippedConflictMoves.slice(0, 20),
    category_pairs: countCategoryPairs(moves),
    manifest_updates: manifestUpdates,
    issues,
  };

  if (APPLY && issues.length === 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.copyFile(MANIFEST, `${MANIFEST}.before-staging-normalize-${REASON}-${stamp}.bak`);
    if (await exists(HASH_INDEX)) await fs.copyFile(HASH_INDEX, `${HASH_INDEX}.before-staging-normalize-${REASON}-${stamp}.bak`);

    for (const move of moves) {
      const source = relToAbs(move.source_relpath);
      const target = relToAbs(move.target_relpath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(source, target);
      await removeEmptyParents(move.source_relpath);
    }

    const manifestTmp = `${MANIFEST}.${process.pid}.tmp`;
    await fs.writeFile(manifestTmp, writeJsonlRows(updatedManifest), "utf8");
    await fs.rename(manifestTmp, MANIFEST);

    if (await exists(HASH_INDEX)) {
      const hashIndex = JSON.parse(await fs.readFile(HASH_INDEX, "utf8"));
      const { updated, replacements } = updateHashIndex(hashIndex, moveMap);
      migration.hash_index_replacements = replacements;
      const hashTmp = `${HASH_INDEX}.${process.pid}.tmp`;
      await fs.writeFile(hashTmp, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
      await fs.rename(hashTmp, HASH_INDEX);
    }
  }

  const outDir = path.join(OPS, "06_migracoes");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `catalog_staging_normalization_${REASON}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await fs.writeFile(outPath, `${JSON.stringify(migration, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ...migration, report: outPath }, null, 2));
  if (issues.length > 0) process.exitCode = 1;
  } finally {
    await releaseApplyLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
