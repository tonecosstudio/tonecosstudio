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

const ROOT = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
const CATALOG = path.resolve(argValue("catalog", path.join(ROOT, "catalogo")));
const CONTROL = path.join(CATALOG, "_controle");
const OPS = path.resolve(argValue("ops", path.join(CONTROL, "00_operacao_v2")));
const PLAN_ARG = argValue("plan", "");
const PLAN = PLAN_ARG ? path.resolve(PLAN_ARG) : "";
const MANIFEST = path.resolve(argValue("manifest", path.join(CONTROL, "catalog_manifest.jsonl")));

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

async function catalogImageSet() {
  const relpaths = new Set();
  const relpathsLower = new Set();
  for await (const file of walkImages(CATALOG)) {
    const relpath = path.relative(CATALOG, file).replaceAll("\\", "/");
    relpaths.add(relpath);
    relpathsLower.add(relpath.toLowerCase());
  }
  return { relpaths, relpathsLower };
}

async function manifestRelpathSet() {
  if (!(await exists(MANIFEST))) return { relpaths: new Set(), relpathsLower: new Set(), rows: 0 };
  const raw = await fs.readFile(MANIFEST, "utf8");
  const relpaths = new Set();
  let rows = 0;
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    rows += 1;
    const row = JSON.parse(line);
    const relpath = String(row.catalog_relpath || "").replaceAll("\\", "/");
    if (relpath) relpaths.add(relpath);
  }
  return {
    relpaths,
    relpathsLower: new Set([...relpaths].map((relpath) => relpath.toLowerCase())),
    rows,
  };
}

function topCategory(relpath) {
  return String(relpath || "").split(/[\\/]+/).filter(Boolean)[0] || "_sem_categoria";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function psQuote(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function issueCounter() {
  return {
    duplicate_source_in_plan: 0,
    duplicate_target_in_plan: 0,
    same_source_target: 0,
    missing_source: 0,
    target_exists: 0,
    manifest_missing_source: 0,
  };
}

function pushIssue(issuesByType, examples, type, move) {
  issuesByType[type] = (issuesByType[type] || 0) + 1;
  if (examples.length < 12) {
    examples.push({
      type,
      source_relpath: move.source_relpath,
      target_relpath: move.target_relpath,
      reasons: move.reasons,
    });
  }
}

function evaluateWave(moves, catalogRelpathsLower, manifestRelpaths, manifestRelpathsLower) {
  const issuesByType = issueCounter();
  const examples = [];
  const seenSources = new Map();
  const seenTargets = new Map();
  let manifestUpdates = 0;

  for (const move of moves) {
    const sourceLower = move.source_relpath.toLowerCase();
    const targetLower = move.target_relpath.toLowerCase();

    if (seenSources.has(sourceLower)) pushIssue(issuesByType, examples, "duplicate_source_in_plan", move);
    else seenSources.set(sourceLower, move);

    if (seenTargets.has(targetLower)) pushIssue(issuesByType, examples, "duplicate_target_in_plan", move);
    else seenTargets.set(targetLower, move);

    if (sourceLower === targetLower) pushIssue(issuesByType, examples, "same_source_target", move);
    if (!catalogRelpathsLower.has(sourceLower)) pushIssue(issuesByType, examples, "missing_source", move);
    if (catalogRelpathsLower.has(targetLower)) pushIssue(issuesByType, examples, "target_exists", move);

    if (manifestRelpaths.has(move.source_relpath) || manifestRelpathsLower.has(sourceLower)) manifestUpdates += 1;
    else pushIssue(issuesByType, examples, "manifest_missing_source", move);
  }

  const issueCount = Object.values(issuesByType).reduce((sum, count) => sum + count, 0);
  return { issueCount, issuesByType, examples, manifestUpdates };
}

function waveCommands(reason, sourceCategory, targetCategory) {
  const base =
    `npm run catalog:apply-staging-normalization -- ` +
    `--reason=${psQuote(reason)} --source-category=${psQuote(sourceCategory)} --target-category=${psQuote(targetCategory)}`;
  return {
    dry_run: base,
    apply: `${base} --apply`,
  };
}

async function main() {
  const planPath = await latestPlan();
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const { relpathsLower: catalogRelpathsLower } = await catalogImageSet();
  const manifest = await manifestRelpathSet();
  const groups = new Map();

  for (const move of plan.moves || []) {
    const normalized = {
      source_relpath: String(move.source_relpath || "").replaceAll("\\", "/"),
      target_relpath: String(move.target_relpath || "").replaceAll("\\", "/"),
      reasons: String(move.reasons || ""),
    };
    const sourceCategory = topCategory(normalized.source_relpath);
    const targetCategory = topCategory(normalized.target_relpath);
    for (const reason of normalized.reasons.split("|").filter(Boolean)) {
      const key = `${reason}\0${sourceCategory}\0${targetCategory}`;
      if (!groups.has(key)) {
        groups.set(key, {
          reason,
          source_category: sourceCategory,
          target_category: targetCategory,
          moves: [],
        });
      }
      groups.get(key).moves.push(normalized);
    }
  }

  const waves = [...groups.values()].map((group) => {
    const evaluation = evaluateWave(
      group.moves,
      catalogRelpathsLower,
      manifest.relpaths,
      manifest.relpathsLower,
    );
    return {
      reason: group.reason,
      source_category: group.source_category,
      target_category: group.target_category,
      planned_moves: group.moves.length,
      manifest_updates: evaluation.manifestUpdates,
      status: evaluation.issueCount === 0 ? "safe" : "blocked",
      issue_count: evaluation.issueCount,
      issues_by_type: evaluation.issuesByType,
      issue_examples: evaluation.examples,
      ...waveCommands(group.reason, group.source_category, group.target_category),
    };
  });

  waves.sort((a, b) => {
    if (a.status !== b.status) return a.status === "safe" ? -1 : 1;
    return b.planned_moves - a.planned_moves;
  });

  const summary = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    catalog: CATALOG,
    manifest: MANIFEST,
    manifest_rows: manifest.rows,
    plan: planPath,
    planned_moves: plan.planned_moves ?? (plan.moves || []).length,
    waves_total: waves.length,
    safe_waves: waves.filter((wave) => wave.status === "safe").length,
    blocked_waves: waves.filter((wave) => wave.status === "blocked").length,
    safe_moves: waves.filter((wave) => wave.status === "safe").reduce((sum, wave) => sum + wave.planned_moves, 0),
    blocked_moves: waves.filter((wave) => wave.status === "blocked").reduce((sum, wave) => sum + wave.planned_moves, 0),
    top_safe: waves.filter((wave) => wave.status === "safe").slice(0, 30),
    top_blocked: waves.filter((wave) => wave.status === "blocked").slice(0, 30),
  };

  const outDir = path.join(OPS, "05_validacoes");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `catalog_staging_normalization_waves_${stamp}.json`);
  const csvPath = path.join(outDir, `catalog_staging_normalization_waves_${stamp}.csv`);
  await fs.writeFile(jsonPath, `${JSON.stringify({ ...summary, waves }, null, 2)}\n`, "utf8");
  await fs.writeFile(
    csvPath,
    [
      "status,planned_moves,manifest_updates,issue_count,reason,source_category,target_category,dry_run_command,apply_command,issues_by_type",
      ...waves.map((wave) =>
        [
          wave.status,
          wave.planned_moves,
          wave.manifest_updates,
          wave.issue_count,
          wave.reason,
          wave.source_category,
          wave.target_category,
          wave.dry_run,
          wave.apply,
          JSON.stringify(wave.issues_by_type),
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(JSON.stringify({ ...summary, json: jsonPath, csv: csvPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
