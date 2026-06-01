import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

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

const PLAN_PATH = argValue("plan", "tmp/drive-organization/drive-organization-plan.json");
const OUT_DIR = argValue("out", "catalog-assets/drive-organized");
const SOURCE_ROOT = argValue("source-root");
const EXISTING_ASSETS_MANIFEST = argValue("existing-assets-manifest");
const LIMIT = Number.parseInt(argValue("limit", ""), 10);
const CONCURRENCY = Number.parseInt(argValue("concurrency", "6"), 10);
const DOWNLOAD = argFlag("download");
const FORCE = argFlag("force");
const INCLUDE_REVIEW = !argFlag("skip-review");
const HASH_DEDUPE = !argFlag("no-hash-dedupe");
const PRUNE = argFlag("prune");
let existingAssetsById = new Map();
let directoryCaseQueue = Promise.resolve();

const IMAGE_SIGNATURES = [
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "webp", bytes: [0x52, 0x49, 0x46, 0x46], extra: [8, 0x57, 0x45, 0x42, 0x50] },
  { type: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function sanitizePathPart(value, fallback = "sem-nome") {
  const cleaned = String(value || "")
    .replace(/[<>:"\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function destinationPath(item) {
  const folderParts = String(item.destinationFolder || "01_REVISAR/sem-pasta")
    .split("/")
    .filter(Boolean)
    .map((part) => sanitizePathPart(part));
  return path.join(OUT_DIR, ...folderParts, sanitizePathPart(item.proposedName, `${item.id}.jpg`));
}

function looksLikeText(bytes) {
  if (!bytes.length) return true;
  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  return sample.every(
    (byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128,
  );
}

function stripExtension(value) {
  return String(value || "").replace(/\.[a-z0-9]+$/i, "");
}

function invalidDestinationPath(item, bytes) {
  const base = sanitizePathPart(stripExtension(item.originalName || item.proposedName || item.id), item.id || "arquivo");
  const ext = looksLikeText(bytes) ? "txt" : "bin";
  return path.join(OUT_DIR, "00_INVALIDOS", "nao-imagens", `${base} - ${item.id}.${ext}`);
}

function shouldExport(item) {
  if (item.status === "ready_to_organize") return true;
  if (INCLUDE_REVIEW && item.status === "needs_review") return true;
  if (item.status === "duplicate_candidate") return true;
  return false;
}

function isImage(bytes) {
  return IMAGE_SIGNATURES.some((signature) => {
    const prefixMatches = signature.bytes.every((byte, index) => bytes[index] === byte);
    if (!prefixMatches) return false;
    if (!signature.extra) return true;
    return signature.extra.slice(1).every((byte, index) => bytes[signature.extra[0] + index] === byte);
  });
}

function collectCookies(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return "";
  return setCookie
    .split(/,(?=[^;,]+=)/g)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

function findConfirmUrl(html) {
  const match = html.match(/href="([^"]*confirm=[^"]*)"/i);
  if (!match) return null;
  return match[1].replace(/&amp;/g, "&");
}

async function fetchDriveFile(id) {
  const firstUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  const first = await fetch(firstUrl, { redirect: "follow" });
  const cookie = collectCookies(first);
  let bytes = Buffer.from(await first.arrayBuffer());

  if (isImage(bytes)) return bytes;

  const contentType = first.headers.get("content-type") || "";
  if (contentType.includes("text/html") || bytes.toString("utf8", 0, 128).includes("<")) {
    const html = bytes.toString("utf8");
    const confirmPath = findConfirmUrl(html);
    if (confirmPath) {
      const confirmUrl = confirmPath.startsWith("http")
        ? confirmPath
        : `https://drive.google.com${confirmPath}`;
      const second = await fetch(confirmUrl, {
        redirect: "follow",
        headers: cookie ? { cookie } : {},
      });
      bytes = Buffer.from(await second.arrayBuffer());
      if (isImage(bytes)) return bytes;
      const secondType = second.headers.get("content-type") || "";
      if (!secondType.includes("text/html") && !bytes.toString("utf8", 0, 128).includes("<")) {
        return bytes;
      }
    }
    throw new Error(`Drive returned an HTML page instead of a downloadable file for ${id}.`);
  }

  return bytes;
}

async function findSourceFile(item) {
  if (!SOURCE_ROOT) return null;
  const candidates = [
    item.sourceDrivePath ? path.join(SOURCE_ROOT, item.sourceDrivePath) : null,
    item.originalName ? path.join(SOURCE_ROOT, item.originalName) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function loadExistingAssetsMap(manifestPath) {
  if (!manifestPath) return new Map();
  const manifest = await readJsonFile(manifestPath);
  const rows = manifest.items || [];
  const byId = new Map();

  for (const row of rows) {
    if (!row.id || !row.localPath || row.exportStatus === "error") continue;
    byId.set(row.id, path.resolve(row.localPath));
  }

  return byId;
}

async function loadOutputManifest() {
  const manifestPath = path.join(OUT_DIR, "_manifest", "catalog-assets-manifest.json");
  try {
    const manifest = await readJsonFile(manifestPath);
    return manifest.items || [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function isInsideOutDir(filePath) {
  const relative = path.relative(path.resolve(OUT_DIR), path.resolve(filePath));
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isExactDuplicatePath(filePath) {
  const relative = path.relative(path.resolve(OUT_DIR), path.resolve(filePath));
  return relative.split(path.sep).slice(0, 2).join("/") === "90_DUPLICATAS/exatas";
}

async function readSourceBytes(item) {
  const existingAsset = item.id ? existingAssetsById.get(item.id) : null;
  if (existingAsset) {
    try {
      return {
        source: "existing-manifest",
        sourceFile: existingAsset,
        bytes: await fs.readFile(existingAsset),
      };
    } catch {
      // Fall back to source-root or Drive download when the manifest path is stale.
    }
  }

  const sourceFile = await findSourceFile(item);
  if (sourceFile) {
    return {
      source: "local",
      sourceFile,
      bytes: await fs.readFile(sourceFile),
    };
  }

  if (!DOWNLOAD) {
    throw new Error("No local source file found and --download was not provided.");
  }
  if (!item.id) {
    throw new Error("Missing Drive file id.");
  }

  return {
    source: "drive",
    sourceFile: null,
    bytes: await fetchDriveFile(item.id),
  };
}

async function writeFileAtomic(filePath, bytes) {
  await ensureDirectoryPathCase(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, bytes);
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    if (!["EEXIST", "EPERM"].includes(error.code)) throw error;
    await fs.rm(filePath, { force: true });
    await fs.rename(tmpPath, filePath);
  }
}

async function ensureDirectoryPathCase(dirPath) {
  const run = directoryCaseQueue.then(() => ensureDirectoryPathCaseUnlocked(dirPath));
  directoryCaseQueue = run.catch(() => {});
  return run;
}

async function ensureDirectoryPathCaseUnlocked(dirPath) {
  const outRoot = path.resolve(OUT_DIR);
  const resolvedDir = path.resolve(dirPath);
  const relative = path.relative(outRoot, resolvedDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    await fs.mkdir(resolvedDir, { recursive: true });
    return;
  }

  let current = outRoot;
  await fs.mkdir(current, { recursive: true });

  for (const part of relative.split(path.sep).filter(Boolean)) {
    const target = path.join(current, part);
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const existing = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === part.toLowerCase());
    if (!existing) {
      await fs.mkdir(target, { recursive: true });
      current = target;
      continue;
    }

    const existingPath = path.join(current, existing.name);
    if (existing.name !== part) {
      const tempPath = path.join(current, `.__casefix-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      await fs.rename(existingPath, tempPath);
      await fs.rename(tempPath, target);
    }
    current = target;
  }
}

async function uniqueFilePath(filePath) {
  const ext = path.extname(filePath);
  const base = ext ? filePath.slice(0, -ext.length) : filePath;
  let candidate = filePath;
  let count = 2;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = `${base} - ${String(count).padStart(2, "0")}${ext}`;
      count += 1;
    } catch {
      return candidate;
    }
  }
}

async function unlinkIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function findReusableFileByHash(dirPath, expectedHash) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const candidate = path.join(dirPath, entry.name);
      const bytes = await fs.readFile(candidate);
      if (sha256(bytes) === expectedHash) return candidate;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return null;
}

async function moveOrReuseFile(currentPath, targetPath, expectedHash) {
  if (path.resolve(currentPath) === path.resolve(targetPath)) return targetPath;

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    const existing = await fs.readFile(targetPath);
    if (sha256(existing) === expectedHash) {
      await unlinkIfExists(currentPath);
      return targetPath;
    }

    const collisionPath = await uniqueFilePath(targetPath);
    await fs.rename(currentPath, collisionPath);
    return collisionPath;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try {
      await fs.rename(currentPath, targetPath);
    } catch (renameError) {
      if (renameError.code !== "ENOENT") throw renameError;
      const reusablePath = await findReusableFileByHash(path.dirname(targetPath), expectedHash);
      if (reusablePath) return reusablePath;
      throw renameError;
    }
    return targetPath;
  }
}

function toCsvValue(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function writeManifest(rows, summary) {
  const manifestDir = path.join(OUT_DIR, "_manifest");
  await fs.mkdir(manifestDir, { recursive: true });
  const jsonPath = path.join(manifestDir, "catalog-assets-manifest.json");
  const csvPath = path.join(manifestDir, "catalog-assets-manifest.csv");
  const readmePath = path.join(manifestDir, "README.md");
  await fs.writeFile(jsonPath, `${JSON.stringify({ summary, items: rows }, null, 2)}\n`);

  const columns = [
    "status",
    "exportStatus",
    "id",
    "originalName",
    "proposedName",
    "destinationFolder",
    "characterName",
    "characterNames",
    "variantName",
    "modelGroup",
    "modelKind",
    "modelFolder",
    "localPath",
    "plannedLocalPath",
    "bytes",
    "sha256",
    "source",
    "error",
  ];
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => toCsvValue(row[column])).join(",")),
  ].join("\n");
  await fs.writeFile(csvPath, `${csv}\n`);
  await fs.writeFile(
    readmePath,
    [
      "# Catalog assets export",
      "",
      "Esta pasta e ignorada pelo git. Ela serve como staging local rastreavel entre Google Drive, processamento de imagens e Supabase Storage.",
      "",
      "- `catalog-assets-manifest.json`: manifesto completo com id do Drive, destino local, bytes e sha256.",
      "- `catalog-assets-manifest.csv`: versao tabular para conferencia rapida.",
      "- As imagens ficam nas mesmas pastas planejadas para Drive/Supabase.",
      "",
    ].join("\n"),
  );
}

async function exportItem(item, index, total) {
  const localPath = destinationPath(item);
  const relativePath = path.relative(process.cwd(), localPath);

  try {
    await ensureDirectoryPathCase(path.dirname(localPath));
    if (!FORCE) {
      const existingAsset = item.id ? existingAssetsById.get(item.id) : null;
      if (existingAsset && isInsideOutDir(existingAsset) && isExactDuplicatePath(existingAsset)) {
        try {
          const existing = await fs.readFile(existingAsset);
          console.log(`[${index + 1}/${total}] exists ${path.relative(process.cwd(), existingAsset)}`);
          return {
            ...item,
            planIndex: index,
            exportStatus: "already_exists",
            localPath: path.relative(process.cwd(), existingAsset),
            plannedLocalPath: relativePath,
            bytes: existing.length,
            sha256: sha256(existing),
            source: "existing-duplicate",
            error: null,
          };
        } catch {
          // Missing duplicate file; continue with the planned destination.
        }
      }

      try {
        const existing = await fs.readFile(localPath);
        console.log(`[${index + 1}/${total}] exists ${relativePath}`);
        return {
          ...item,
          planIndex: index,
          exportStatus: "already_exists",
          localPath: relativePath,
          plannedLocalPath: relativePath,
          bytes: existing.length,
          sha256: sha256(existing),
          source: "existing",
          error: null,
        };
      } catch {
        // Missing file; export it below.
      }

      if (existingAsset && isInsideOutDir(existingAsset) && path.resolve(existingAsset) !== path.resolve(localPath)) {
        try {
          const existing = await fs.readFile(existingAsset);
          if (isImage(existing)) {
            const movedPath = await moveOrReuseFile(existingAsset, localPath, sha256(existing));
            const movedRelativePath = path.relative(process.cwd(), movedPath);
            console.log(`[${index + 1}/${total}] moved ${movedRelativePath}`);
            return {
              ...item,
              planIndex: index,
              exportStatus: "exported",
              localPath: movedRelativePath,
              plannedLocalPath: relativePath,
              bytes: existing.length,
              sha256: sha256(existing),
              source: "moved-existing-manifest",
              sourceFile: path.relative(process.cwd(), existingAsset),
              error: null,
            };
          }
        } catch {
          // Fall back to source-root or Drive download when the manifest path is stale.
        }
      }
    }

    const source = await readSourceBytes(item);
    if (!isImage(source.bytes)) {
      const invalidPath = invalidDestinationPath(item, source.bytes);
      await writeFileAtomic(invalidPath, source.bytes);
      console.warn(`[${index + 1}/${total}] non-image ${item.originalName}`);
      return {
        ...item,
        planIndex: index,
        exportStatus: "non_image",
        localPath: path.relative(process.cwd(), invalidPath),
        plannedLocalPath: relativePath,
        bytes: source.bytes.length,
        sha256: sha256(source.bytes),
        source: source.source,
        sourceFile: source.sourceFile,
        error: "Source content is not a supported image.",
      };
    }

    await writeFileAtomic(localPath, source.bytes);
    console.log(`[${index + 1}/${total}] exported ${relativePath}`);
    return {
      ...item,
      planIndex: index,
      exportStatus: "exported",
      localPath: relativePath,
      plannedLocalPath: relativePath,
      bytes: source.bytes.length,
      sha256: sha256(source.bytes),
      source: source.source,
      sourceFile: source.sourceFile,
      error: null,
    };
  } catch (error) {
    console.warn(`[${index + 1}/${total}] error ${item.originalName}: ${error.message}`);
    return {
      ...item,
      planIndex: index,
      exportStatus: "error",
      localPath: relativePath,
      plannedLocalPath: relativePath,
      bytes: null,
      sha256: null,
      source: null,
      error: error.message,
    };
  }
}

async function runPool(items, workerCount) {
  const rows = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, workerCount) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      rows.push(await exportItem(items[index], index, items.length));
    }
  });
  await Promise.all(workers);
  return rows.sort((a, b) => a.planIndex - b.planIndex);
}

function duplicateKeeperRank(row) {
  if (row.status === "ready_to_organize") return 0;
  if (row.status === "needs_review") return 1;
  if (row.status === "duplicate_candidate") return 2;
  return 3;
}

async function applyExactHashDedupe(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.sha256 || row.exportStatus === "non_image" || row.exportStatus === "error") continue;
    const group = groups.get(row.sha256) || [];
    group.push(row);
    groups.set(row.sha256, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const keeper = [...group].sort((a, b) => {
      const rankDiff = duplicateKeeperRank(a) - duplicateKeeperRank(b);
      if (rankDiff) return rankDiff;
      return a.planIndex - b.planIndex;
    })[0];

    if (
      keeper.plannedLocalPath &&
      keeper.localPath &&
      path.resolve(keeper.localPath) !== path.resolve(keeper.plannedLocalPath) &&
      isInsideOutDir(keeper.localPath) &&
      isInsideOutDir(keeper.plannedLocalPath)
    ) {
      const keeperPath = await moveOrReuseFile(
        path.resolve(keeper.localPath),
        path.resolve(keeper.plannedLocalPath),
        keeper.sha256,
      );
      keeper.localPath = path.relative(process.cwd(), keeperPath);
    }

    for (const row of group) {
      if (row === keeper) continue;

      const currentPath = path.resolve(row.localPath);
      const ext = path.extname(currentPath) || path.extname(row.proposedName || row.originalName) || ".jpg";
      const baseName = sanitizePathPart(
        [row.sourceTitle, row.characterName, row.variantName || row.proposedName || row.originalName, row.id]
          .filter(Boolean)
          .join(" - "),
        row.id || row.sha256.slice(0, 12),
      );
      let duplicatePath = path.join(OUT_DIR, "90_DUPLICATAS", "exatas", row.sha256.slice(0, 12), `${baseName}${ext}`);

      duplicatePath = await moveOrReuseFile(currentPath, duplicatePath, row.sha256);

      row.statusBeforeHashDedupe = row.status;
      row.status = "duplicate_exact";
      row.destinationFolder = "90_DUPLICATAS/exatas";
      row.localPath = path.relative(process.cwd(), duplicatePath);
      row.duplicateOf = keeper.id;
      row.duplicateOfHash = row.sha256;
    }
  }
}

async function removeEmptyParents(startDir) {
  const outRoot = path.resolve(OUT_DIR);
  let current = path.resolve(startDir);

  while (current.startsWith(outRoot) && current !== outRoot) {
    try {
      await fs.rmdir(current);
      current = path.dirname(current);
    } catch {
      return;
    }
  }
}

async function pruneStaleFiles(previousRows, currentRows) {
  if (!PRUNE || !previousRows.length) return 0;

  const keepPaths = new Set(
    currentRows
      .map((row) => row.localPath)
      .filter(Boolean)
      .map((localPath) => path.resolve(localPath)),
  );
  let pruned = 0;

  for (const row of previousRows) {
    if (!row.localPath) continue;
    const filePath = path.resolve(row.localPath);
    if (!isInsideOutDir(filePath) || keepPaths.has(filePath)) continue;

    try {
      await fs.unlink(filePath);
      pruned += 1;
      await removeEmptyParents(path.dirname(filePath));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return pruned;
}

async function pruneEmptyDirectories(rootDir = OUT_DIR) {
  if (!PRUNE) return 0;

  const outRoot = path.resolve(OUT_DIR);
  const root = path.resolve(rootDir);
  if (root !== outRoot && !isInsideOutDir(root)) return 0;

  let pruned = 0;

  async function visit(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      await visit(path.join(dir, entry.name));
    }

    if (path.resolve(dir) === outRoot) return;

    try {
      const remaining = await fs.readdir(dir);
      if (remaining.length === 0) {
        await fs.rmdir(dir);
        pruned += 1;
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
    }
  }

  await visit(root);
  return pruned;
}

async function main() {
  const plan = await readJsonFile(PLAN_PATH);
  const previousOutputRows = await loadOutputManifest();
  existingAssetsById = await loadExistingAssetsMap(EXISTING_ASSETS_MANIFEST);
  const plannedItems = (plan.items || []).filter(shouldExport);
  const items = Number.isFinite(LIMIT) && LIMIT > 0 ? plannedItems.slice(0, LIMIT) : plannedItems;
  const rows = await runPool(items, CONCURRENCY);
  if (HASH_DEDUPE) await applyExactHashDedupe(rows);
  const prunedFiles = await pruneStaleFiles(previousOutputRows, rows);
  const prunedEmptyDirectories = await pruneEmptyDirectories();

  const summary = {
    generatedAt: new Date().toISOString(),
    planPath: PLAN_PATH,
    outDir: OUT_DIR,
    sourceRoot: SOURCE_ROOT,
    existingAssetsManifest: EXISTING_ASSETS_MANIFEST,
    download: DOWNLOAD,
    hashDedupe: HASH_DEDUPE,
    prune: PRUNE,
    prunedFiles,
    prunedEmptyDirectories,
    concurrency: CONCURRENCY,
    total: rows.length,
    byExportStatus: rows.reduce((acc, row) => {
      acc[row.exportStatus] = (acc[row.exportStatus] || 0) + 1;
      return acc;
    }, {}),
    byPlanStatus: rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {}),
  };

  await writeManifest(rows, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (rows.some((row) => row.exportStatus === "error")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
