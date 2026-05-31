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

const ROOT_FOLDER_ID = argValue("root-folder-id", "1HcU2eCTb-jwar2yixG3f31PlWDbdvDuF");
const ROOT_NAME = argValue("root-name", "Catalogo");
const OUT_PATH = argValue("out", "tmp/drive-public-recursive-inventory.json");
const CACHE_DIR = argValue("cache-dir", "tmp/drive-public-html");
const MAX_FOLDERS = Number.parseInt(argValue("max-folders", "100000"), 10);
const REFRESH = argFlag("refresh");

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function cleanDriveName(value) {
  return decodeHtml(value).replace(/\s+Shared$/i, "").replace(/\s+/g, " ").trim();
}

function driveFolderUrl(id) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

function cachePath(id) {
  return path.join(CACHE_DIR, `${id}.html`);
}

async function readCached(id) {
  if (REFRESH) return null;
  try {
    const file = cachePath(id);
    const stat = await fs.stat(file);
    if (stat.size > 0) return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
  return null;
}

async function fetchFolderHtml(id) {
  const cached = await readCached(id);
  if (cached) return { html: cached, source: "cache" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(driveFolderUrl(id), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
        "user-agent": "Mozilla/5.0 OrdaxCatalogInventory/1.0",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath(id), html);
    return { html, source: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

function parseSize(sizeLabel) {
  const text = String(sizeLabel || "").replace(",", ".").trim();
  const match = text.match(/^([\d.]+)\s*([KMGT]?B|bytes?)$/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2].toLowerCase();
  if (unit.startsWith("byte")) return Math.round(value);
  const multipliers = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };
  return Math.round(value * (multipliers[unit] || 1));
}

function extractRows(html) {
  return [...String(html || "").matchAll(/<tr\b(?=[^>]*\bdata-selectable\b)[\s\S]*?<\/tr>/g)].map(
    (match) => match[0],
  );
}

function extractNameAndType(row) {
  const tooltipMatch = row.match(/data-tooltip="([^"]+?)\s+(Folder|Image|Video|Audio|PDF|Shortcut|Google Docs|Google Sheets|Google Slides)"/i);
  if (tooltipMatch) {
    return {
      name: cleanDriveName(tooltipMatch[1]),
      driveType: tooltipMatch[2],
    };
  }

  const ariaMatch = row.match(/aria-label="([^"]+?)\s+(Folder|Image|Video|Audio|PDF|Shortcut|Google Docs|Google Sheets|Google Slides)(?:\s+Shared)?"/i);
  if (ariaMatch) {
    return {
      name: cleanDriveName(ariaMatch[1]),
      driveType: ariaMatch[2],
    };
  }

  const titleMatch = row.match(/<title>(Folder|Image|Video|Audio|PDF|Shortcut|Google Docs|Google Sheets|Google Slides)<\/title>/i);
  const strongMatch = row.match(/<strong[^>]*class="DNoYtb"[^>]*>([\s\S]*?)<\/strong>/i);
  if (titleMatch && strongMatch) {
    return {
      name: cleanDriveName(stripTags(strongMatch[1])),
      driveType: titleMatch[1],
    };
  }

  return { name: null, driveType: null };
}

function mimeFromType(type, name) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "folder") return "application/vnd.google-apps.folder";
  if (normalized === "image") return `image/${String(name || "").toLowerCase().endsWith(".png") ? "png" : "jpeg"}`;
  if (normalized === "video") return "video/*";
  if (normalized === "audio") return "audio/*";
  if (normalized === "pdf") return "application/pdf";
  if (normalized === "google docs") return "application/vnd.google-apps.document";
  if (normalized === "google sheets") return "application/vnd.google-apps.spreadsheet";
  if (normalized === "google slides") return "application/vnd.google-apps.presentation";
  return null;
}

function parseFolderItems(html, folder) {
  const rows = extractRows(html);
  return rows
    .map((row, index) => {
      const id = row.match(/data-id="([^"]+)"/)?.[1];
      const { name, driveType } = extractNameAndType(row);
      if (!id || !name || id === folder.id) return null;

      const sizeLabel = decodeHtml(row.match(/(?:aria-label|data-tooltip)="Size:\s*([^"\n]+)(?:\n|")/i)?.[1] || "");
      const mimeType = mimeFromType(driveType, name);
      const isFolder = mimeType === "application/vnd.google-apps.folder";
      const sourceDrivePath = `${folder.path}/${name}`;
      return {
        id,
        name,
        title: name,
        mime: mimeType,
        mime_type: mimeType,
        file_or_folder: isFolder ? "folder" : "file",
        size_label: sizeLabel || null,
        size: parseSize(sizeLabel),
        link: isFolder ? driveFolderUrl(id) : `https://drive.google.com/file/d/${id}/view`,
        url: isFolder ? driveFolderUrl(id) : `https://drive.google.com/file/d/${id}/view`,
        download_url: isFolder ? null : `https://drive.google.com/uc?export=download&id=${id}`,
        sourceFolderName: folder.name,
        sourceFolderId: folder.id,
        sourceDrivePath,
        depth: folder.depth + 1,
        rowIndex: index,
      };
    })
    .filter(Boolean);
}

async function main() {
  const queue = [{ id: ROOT_FOLDER_ID, name: ROOT_NAME, path: ROOT_NAME, depth: 0 }];
  const visitedFolders = new Set();
  const folders = [];
  const files = [];
  const errors = [];
  let networkFetches = 0;
  let cacheHits = 0;

  while (queue.length) {
    if (visitedFolders.size >= MAX_FOLDERS) {
      errors.push({ reason: "max-folders-reached", maxFolders: MAX_FOLDERS, remaining: queue.length });
      break;
    }

    const folder = queue.shift();
    if (visitedFolders.has(folder.id)) continue;
    visitedFolders.add(folder.id);
    folders.push(folder);

    try {
      const { html, source } = await fetchFolderHtml(folder.id);
      if (source === "cache") cacheHits++;
      if (source === "network") networkFetches++;

      const items = parseFolderItems(html, folder);
      const childFolders = items.filter((item) => item.file_or_folder === "folder");
      const childFiles = items.filter((item) => item.file_or_folder !== "folder");
      files.push(...childFiles);
      queue.push(
        ...childFolders.map((item) => ({
          id: item.id,
          name: item.name,
          path: item.sourceDrivePath,
          parentId: folder.id,
          depth: folder.depth + 1,
        })),
      );
      console.log(
        `[folder] ${folder.path} files=${childFiles.length} folders=${childFolders.length} source=${source}`,
      );
    } catch (error) {
      errors.push({ folderId: folder.id, folderPath: folder.path, error: error.message });
      console.warn(`[error] ${folder.path}: ${error.message}`);
    }
  }

  const uniqueFiles = Array.from(new Map(files.map((item) => [item.id, item])).values());
  const summary = {
    generatedAt: new Date().toISOString(),
    rootFolderId: ROOT_FOLDER_ID,
    rootName: ROOT_NAME,
    foldersVisited: visitedFolders.size,
    foldersQueued: queue.length,
    files: uniqueFiles.length,
    rawFiles: files.length,
    errors: errors.length,
    networkFetches,
    cacheHits,
  };
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(
    OUT_PATH,
    `${JSON.stringify({ summary, folders, files: uniqueFiles, errors }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ summary, outPath: OUT_PATH }, null, 2));
  if (errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
