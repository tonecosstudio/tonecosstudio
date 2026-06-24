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
const CONTROL = path.resolve(argValue("control", path.join(CATALOG, "_controle")));
const OPS = path.resolve(argValue("ops", path.join(CONTROL, "00_operacao_v2")));
const MANIFEST = path.resolve(argValue("manifest", path.join(CONTROL, "catalog_manifest.jsonl")));
const OUT_DIR = path.resolve(argValue("out-dir", path.join(OPS, "05_validacoes")));

async function* walkImages(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "_controle") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

async function readManifestRelpaths(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const relpaths = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const relpath = String(row.catalog_relpath || "").replaceAll("\\", "/");
    if (relpath) relpaths.push(relpath);
  }
  return relpaths;
}

function categoryOf(relpath) {
  return String(relpath || "").split(/[\\/]+/).filter(Boolean)[0] || "_sem_categoria";
}

function isQuarantineRelpath(relpath) {
  return categoryOf(relpath).startsWith("_");
}

function countByCategory(relpaths) {
  const counts = new Map();
  for (const relpath of relpaths) {
    const category = categoryOf(relpath);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const physicalRelpaths = [];
  for await (const file of walkImages(CATALOG)) {
    physicalRelpaths.push(path.relative(CATALOG, file).replaceAll("\\", "/"));
  }
  physicalRelpaths.sort();

  const manifestRelpaths = (await readManifestRelpaths(MANIFEST)).sort();
  const physicalSet = new Set(physicalRelpaths);
  const physicalLowerSet = new Set(physicalRelpaths.map((relpath) => relpath.toLowerCase()));
  const manifestSet = new Set(manifestRelpaths);
  const manifestLowerSet = new Set(manifestRelpaths.map((relpath) => relpath.toLowerCase()));

  const physicalNotInManifest = physicalRelpaths.filter((relpath) => !manifestSet.has(relpath));
  const physicalNotInManifestCaseOnly = physicalNotInManifest.filter((relpath) => manifestLowerSet.has(relpath.toLowerCase()));
  const physicalNotInManifestTrue = physicalNotInManifest.filter((relpath) => !manifestLowerSet.has(relpath.toLowerCase()));
  const physicalNotInManifestActive = physicalNotInManifestTrue.filter((relpath) => !isQuarantineRelpath(relpath));
  const physicalNotInManifestQuarantine = physicalNotInManifestTrue.filter(isQuarantineRelpath);
  const manifestMissingExact = manifestRelpaths.filter((relpath) => !physicalSet.has(relpath));
  const manifestMissingCaseOnly = manifestMissingExact.filter((relpath) => physicalLowerSet.has(relpath.toLowerCase()));
  const manifestMissingFile = manifestMissingExact.filter((relpath) => !physicalLowerSet.has(relpath.toLowerCase()));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `catalog_manifest_coverage_${stamp}.json`);
  const csvPath = path.join(OUT_DIR, `catalog_manifest_coverage_missing_physical_${stamp}.csv`);
  const unmanifestedCsvPath = path.join(OUT_DIR, `catalog_manifest_coverage_unmanifested_files_${stamp}.csv`);
  const activeUnmanifestedCsvPath = path.join(OUT_DIR, `catalog_manifest_coverage_unmanifested_active_${stamp}.csv`);

  const report = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    catalog: CATALOG,
    manifest: MANIFEST,
    physical_images: physicalRelpaths.length,
    manifest_rows: manifestRelpaths.length,
    physical_not_in_manifest: physicalNotInManifest.length,
    physical_not_in_manifest_case_only: physicalNotInManifestCaseOnly.length,
    physical_not_in_manifest_true: physicalNotInManifestTrue.length,
    physical_not_in_manifest_active: physicalNotInManifestActive.length,
    physical_not_in_manifest_quarantine: physicalNotInManifestQuarantine.length,
    manifest_missing_exact: manifestMissingExact.length,
    manifest_missing_case_only: manifestMissingCaseOnly.length,
    manifest_missing_file: manifestMissingFile.length,
    physical_not_in_manifest_by_category: countByCategory(physicalNotInManifest),
    physical_not_in_manifest_case_only_by_category: countByCategory(physicalNotInManifestCaseOnly),
    physical_not_in_manifest_true_by_category: countByCategory(physicalNotInManifestTrue),
    physical_not_in_manifest_active_by_category: countByCategory(physicalNotInManifestActive),
    physical_not_in_manifest_quarantine_by_category: countByCategory(physicalNotInManifestQuarantine),
    manifest_missing_file_by_category: countByCategory(manifestMissingFile),
    examples: {
      physical_not_in_manifest: physicalNotInManifest.slice(0, 80),
      physical_not_in_manifest_case_only: physicalNotInManifestCaseOnly.slice(0, 80),
      physical_not_in_manifest_true: physicalNotInManifestTrue.slice(0, 80),
      manifest_missing_case_only: manifestMissingCaseOnly.slice(0, 80),
      manifest_missing_file: manifestMissingFile.slice(0, 80),
    },
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    unmanifestedCsvPath,
    ["relpath,category", ...physicalNotInManifest.map((relpath) => [relpath, categoryOf(relpath)].map(csvEscape).join(","))].join(
      "\n",
    ) + "\n",
    "utf8",
  );
  await fs.writeFile(
    activeUnmanifestedCsvPath,
    [
      "relpath,category",
      ...physicalNotInManifestActive.map((relpath) => [relpath, categoryOf(relpath)].map(csvEscape).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );
  await fs.writeFile(
    csvPath,
    ["relpath,category", ...manifestMissingFile.map((relpath) => [relpath, categoryOf(relpath)].map(csvEscape).join(","))].join(
      "\n",
    ) + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        ...report,
        json: jsonPath,
        unmanifested_csv: unmanifestedCsvPath,
        active_unmanifested_csv: activeUnmanifestedCsvPath,
        missing_csv: csvPath,
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
