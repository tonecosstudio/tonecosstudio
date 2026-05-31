import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIMIT = Number.parseInt(argValue("limit", "100"), 10);
const FETCH_LIMIT = Number.parseInt(argValue("fetch-limit", "1000"), 10);
const BUCKET_FALLBACK = argValue("bucket", "models");
const STORAGE_PREFIX = argValue("storage-prefix", "catalog-bg-removed/v1");
const REPORT_DIR = argValue("report-dir", "tmp/catalog-bg-removed-batch");
const MODEL = argValue("model", "small");
const WORKER_TIMEOUT_MS = Number.parseInt(argValue("worker-timeout-ms", "240000"), 10);
const DRY_RUN = argFlag("dry-run");
const INCLUDE_DUPLICATE_ROWS = argFlag("include-duplicate-rows");
const FORCE = argFlag("force");
const WORKER_PATH = fileURLToPath(new URL("./remove-background-worker.mjs", import.meta.url));

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

if (!Number.isFinite(LIMIT) || LIMIT < 1) {
  throw new Error("--limit must be a positive integer.");
}

if (!Number.isFinite(FETCH_LIMIT) || FETCH_LIMIT < LIMIT) {
  throw new Error("--fetch-limit must be greater than or equal to --limit.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(value) {
  return String(value || "modelo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "modelo";
}

function uniqueTags(tags) {
  return Array.from(
    new Set(
      (tags || [])
        .map((tag) => String(tag || "").trim())
        .filter(Boolean),
    ),
  );
}

function hasBgRemovedTag(row) {
  return (row.tags || []).some((tag) => String(tag).startsWith("bg-removed"));
}

function identityKey(row) {
  return (
    row.canonical_identity_key ||
    row.optimized_sha256 ||
    row.image_path ||
    row.thumbnail_url ||
    row.id
  );
}

function visibilityScore(row) {
  if (row.catalog_visibility === "both") return 40;
  if (row.catalog_visibility === "general") return 30;
  if (row.catalog_visibility === "collection") return 20;
  return 0;
}

function rowScore(row) {
  let score = 0;
  if (row.is_active) score += 100;
  score += visibilityScore(row);
  if (row.duplicate_status === "unique") score += 30;
  if (!row.duplicate_status) score += 10;
  if ((row.tags || []).includes("catalog-staging")) score += 5;
  return score;
}

function chooseUniqueRows(rows) {
  const sorted = [...rows].sort((a, b) => {
    const scoreDiff = rowScore(b) - rowScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  });

  if (INCLUDE_DUPLICATE_ROWS) return sorted.slice(0, LIMIT);

  const seen = new Set();
  const chosen = [];
  for (const row of sorted) {
    const key = identityKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(row);
    if (chosen.length >= LIMIT) break;
  }
  return chosen;
}

async function fetchCandidates() {
  const { data, error } = await supabase
    .from("models")
    .select(
      "id,name,franchise,category,subcategory,tags,is_active,catalog_visibility,image_bucket,image_path,thumbnail_url,duplicate_status,duplicate_of_model_id,canonical_identity_key,optimized_sha256,updated_at",
    )
    .not("image_path", "is", null)
    .order("updated_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) throw error;

  const rows = data || [];
  return FORCE ? rows : rows.filter((row) => !hasBgRemovedTag(row));
}

async function downloadStorageObject(row) {
  const bucket = row.image_bucket || BUCKET_FALLBACK;
  const { data, error } = await supabase.storage.from(bucket).download(row.image_path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

function runWorker(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(process.execPath, [
      WORKER_PATH,
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--model",
      MODEL,
    ], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`background worker timeout after ${WORKER_TIMEOUT_MS}ms`));
    }, WORKER_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `background worker failed with ${signal || code}: ${stderr || stdout || "no output"}`,
        ),
      );
    });
  });
}

async function removeImageBackground(bytes, row, outDir) {
  const inputPng = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .png()
    .toBuffer();

  const workerDir = path.join(outDir, ".worker");
  await fs.mkdir(workerDir, { recursive: true });
  const inputPath = path.join(workerDir, `${row.id}-input.png`);
  const outputPath = path.join(workerDir, `${row.id}-output.png`);
  await fs.writeFile(inputPath, inputPng);
  await runWorker(inputPath, outputPath);
  const outputPng = await fs.readFile(outputPath);
  await fs.rm(inputPath, { force: true });
  await fs.rm(outputPath, { force: true });
  return outputPng;
}

async function uploadCutout(row, png) {
  const storagePath = `${STORAGE_PREFIX}/${row.id}-${slugify(row.name)}.png`;
  const bucket = row.image_bucket || BUCKET_FALLBACK;
  const { error } = await supabase.storage.from(bucket).upload(storagePath, png, {
    upsert: true,
    contentType: "image/png",
  });
  if (error) throw error;

  return {
    bucket,
    storagePath,
    publicUrl: supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl,
  };
}

async function updateModel(row, publicUrl) {
  const tags = uniqueTags([
    ...(row.tags || []),
    "bg-removed",
    "bg-removed-v1",
    "bg-imgly",
  ]);

  const { error } = await supabase
    .from("models")
    .update({
      thumbnail_url: publicUrl,
      tags,
    })
    .eq("id", row.id);

  if (error) throw error;
  return tags;
}

function checkerboardSvg(width, height, square = 18) {
  const parts = [`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`];
  for (let y = 0; y < height; y += square) {
    for (let x = 0; x < width; x += square) {
      const even = (Math.floor(x / square) + Math.floor(y / square)) % 2 === 0;
      parts.push(
        `<rect x="${x}" y="${y}" width="${square}" height="${square}" fill="${even ? "#f8fafc" : "#cbd5e1"}"/>`,
      );
    }
  }
  parts.push("</svg>");
  return Buffer.from(parts.join("\n"));
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function buildContactSheet(results, filePath) {
  const okResults = results.filter((result) => result.ok && result.localPath).slice(0, 100);
  if (!okResults.length) return null;

  const columns = 5;
  const tileW = 260;
  const tileH = 320;
  const rows = Math.ceil(okResults.length / columns);
  const width = columns * tileW;
  const height = rows * tileH;
  const composites = [];
  const svg = [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#050505"/>`,
  ];

  for (const [index, result] of okResults.entries()) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * tileW;
    const y = row * tileH;
    const label = escapeXml(`${String(index + 1).padStart(2, "0")} ${result.name}`.slice(0, 32));
    const franchise = escapeXml(String(result.franchise || "").slice(0, 32));
    const preview = await sharp(result.localPath)
      .resize({ width: 220, height: 235, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const previewMeta = await sharp(preview).metadata();

    svg.push(`<rect x="${x + 10}" y="${y + 10}" width="240" height="250" fill="#0f0f0f" stroke="#a98b2d" stroke-opacity="0.45"/>`);
    svg.push(`<text x="${x + 16}" y="${y + 286}" fill="#f7d04a" font-size="13" font-family="Arial" font-weight="700">${label}</text>`);
    svg.push(`<text x="${x + 16}" y="${y + 306}" fill="#9ca3af" font-size="11" font-family="Arial">${franchise}</text>`);
    composites.push({ input: checkerboardSvg(240, 250), left: x + 10, top: y + 10 });
    composites.push({
      input: preview,
      left: x + 20 + Math.round((220 - (previewMeta.width || 220)) / 2),
      top: y + 18 + Math.round((235 - (previewMeta.height || 235)) / 2),
    });
  }

  svg.push("</svg>");
  const base = await sharp(Buffer.from(svg.join("\n"))).png().toBuffer();
  await sharp(base)
    .composite(composites)
    .webp({ quality: 86 })
    .toFile(filePath);
  return filePath;
}

async function processRow(row, index, total, outDir) {
  const startedAt = new Date().toISOString();
  console.log(`[${index + 1}/${total}] ${row.name} (${row.id})`);

  if (DRY_RUN) {
    return {
      ok: true,
      dryRun: true,
      id: row.id,
      name: row.name,
      franchise: row.franchise,
      duplicateStatus: row.duplicate_status,
      previousThumbnailUrl: row.thumbnail_url,
      sourcePath: row.image_path,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  const originalBytes = await downloadStorageObject(row);
  const png = await removeImageBackground(originalBytes, row, outDir);
  const metadata = await sharp(png).metadata();
  const localPath = path.join(outDir, `${String(index + 1).padStart(3, "0")}-${row.id}-${slugify(row.name)}.png`);
  await fs.writeFile(localPath, png);
  const upload = await uploadCutout(row, png);
  const tags = await updateModel(row, upload.publicUrl);

  return {
    ok: true,
    id: row.id,
    name: row.name,
    franchise: row.franchise,
    category: row.category,
    subcategory: row.subcategory,
    catalogVisibility: row.catalog_visibility,
    isActive: row.is_active,
    duplicateStatus: row.duplicate_status,
    identityKey: identityKey(row),
    sourceBucket: row.image_bucket || BUCKET_FALLBACK,
    sourcePath: row.image_path,
    previousThumbnailUrl: row.thumbnail_url,
    cutoutBucket: upload.bucket,
    cutoutPath: upload.storagePath,
    cutoutUrl: upload.publicUrl,
    localPath,
    width: metadata.width,
    height: metadata.height,
    pngBytes: png.length,
    tags,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

async function main() {
  const batchId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(REPORT_DIR, batchId);
  await fs.mkdir(outDir, { recursive: true });

  const candidates = await fetchCandidates();
  const selected = chooseUniqueRows(candidates);
  const skippedDuplicateRows = INCLUDE_DUPLICATE_ROWS
    ? 0
    : Math.max(0, candidates.length - selected.length);

  const results = [];
  for (const [index, row] of selected.entries()) {
    try {
      results.push(await processRow(row, index, selected.length, outDir));
    } catch (error) {
      console.error(`[erro] ${row.name}: ${error.message}`);
      results.push({
        ok: false,
        id: row.id,
        name: row.name,
        franchise: row.franchise,
        sourcePath: row.image_path,
        error: error.message,
      });
    }
  }

  const contactSheetPath = await buildContactSheet(results, path.join(outDir, "contact-sheet.webp"));
  const report = {
    batchId,
    dryRun: DRY_RUN,
    model: MODEL,
    requestedLimit: LIMIT,
    fetchedCandidates: candidates.length,
    selected: selected.length,
    processed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    skippedDuplicateRows,
    storagePrefix: STORAGE_PREFIX,
    reportDir: outDir,
    contactSheetPath,
    results,
  };

  const reportPath = path.join(outDir, "report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        batchId,
        requestedLimit: LIMIT,
        fetchedCandidates: candidates.length,
        selected: selected.length,
        processed: report.processed,
        failed: report.failed,
        skippedDuplicateRows,
        reportPath,
        contactSheetPath,
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
