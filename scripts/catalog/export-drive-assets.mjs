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
const LIMIT = Number.parseInt(argValue("limit", ""), 10);
const DOWNLOAD = argFlag("download");
const FORCE = argFlag("force");
const INCLUDE_REVIEW = !argFlag("skip-review");

const IMAGE_SIGNATURES = [
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "webp", bytes: [0x52, 0x49, 0x46, 0x46], extra: [8, 0x57, 0x45, 0x42, 0x50] },
  { type: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

async function readSourceBytes(item) {
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
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, bytes);
  await fs.rename(tmpPath, filePath);
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

async function main() {
  const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  const plannedItems = (plan.items || []).filter(shouldExport);
  const items = Number.isFinite(LIMIT) && LIMIT > 0 ? plannedItems.slice(0, LIMIT) : plannedItems;
  const rows = [];

  for (const [index, item] of items.entries()) {
    const localPath = destinationPath(item);
    const relativePath = path.relative(process.cwd(), localPath);

    try {
      if (!FORCE) {
        try {
          const existing = await fs.readFile(localPath);
          rows.push({
            ...item,
            exportStatus: "already_exists",
            localPath: relativePath,
            plannedLocalPath: relativePath,
            bytes: existing.length,
            sha256: sha256(existing),
            source: "existing",
            error: null,
          });
          console.log(`[${index + 1}/${items.length}] exists ${relativePath}`);
          continue;
        } catch {
          // Missing file; export it below.
        }
      }

      const source = await readSourceBytes(item);
      if (!isImage(source.bytes)) {
        const invalidPath = invalidDestinationPath(item, source.bytes);
        await writeFileAtomic(invalidPath, source.bytes);
        rows.push({
          ...item,
          exportStatus: "non_image",
          localPath: path.relative(process.cwd(), invalidPath),
          plannedLocalPath: relativePath,
          bytes: source.bytes.length,
          sha256: sha256(source.bytes),
          source: source.source,
          sourceFile: source.sourceFile,
          error: "Source content is not a supported image.",
        });
        console.warn(`[${index + 1}/${items.length}] non-image ${item.originalName}`);
        continue;
      }

      await writeFileAtomic(localPath, source.bytes);
      rows.push({
        ...item,
        exportStatus: "exported",
        localPath: relativePath,
        plannedLocalPath: relativePath,
        bytes: source.bytes.length,
        sha256: sha256(source.bytes),
        source: source.source,
        sourceFile: source.sourceFile,
        error: null,
      });
      console.log(`[${index + 1}/${items.length}] exported ${relativePath}`);
    } catch (error) {
      rows.push({
        ...item,
        exportStatus: "error",
        localPath: relativePath,
        plannedLocalPath: relativePath,
        bytes: null,
        sha256: null,
        source: null,
        error: error.message,
      });
      console.warn(`[${index + 1}/${items.length}] error ${item.originalName}: ${error.message}`);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    planPath: PLAN_PATH,
    outDir: OUT_DIR,
    sourceRoot: SOURCE_ROOT,
    download: DOWNLOAD,
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
