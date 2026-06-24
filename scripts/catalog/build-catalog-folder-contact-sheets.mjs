import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function argNumber(name, fallback) {
  const parsed = Number.parseInt(argValue(name, String(fallback)), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRelpath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
}

const ROOT = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
const CATALOG = path.resolve(argValue("catalog", path.join(ROOT, "catalogo")));
const OPS = path.resolve(argValue("ops", path.join(CATALOG, "_controle", "00_operacao_v2")));
const SCAN_PREFIX = normalizeRelpath(argValue("scan-prefix", "_revisar/identificar"));
const STAMP = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OPS, "02_auditorias", `folder_contact_sheets_${STAMP}`)),
);
const COLUMNS = argNumber("columns", 4);
const ROWS = argNumber("rows", 4);
const MAX_IMAGES = argNumber("max-images", 0);
const MAX_FOLDERS = argNumber("max-folders", 0);
const SORT = argValue("sort", "folder-count-desc");

const TILE = {
  width: 300,
  imageHeight: 248,
  labelHeight: 112,
  gap: 16,
  padding: 24,
};

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function folderKeyFor(relpath) {
  const parts = normalizeRelpath(relpath).split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}

function compareItems(a, b, counts) {
  if (SORT === "path") return a.relpath.localeCompare(b.relpath, "pt-BR", { sensitivity: "base" });
  if (SORT === "folder-name") {
    const byFolder = a.folder.localeCompare(b.folder, "pt-BR", { sensitivity: "base" });
    return byFolder || a.filename.localeCompare(b.filename, "pt-BR", { sensitivity: "base" });
  }

  const byCount = (counts.get(b.folder) || 0) - (counts.get(a.folder) || 0);
  if (byCount) return byCount;
  const byFolder = a.folder.localeCompare(b.folder, "pt-BR", { sensitivity: "base" });
  return byFolder || a.filename.localeCompare(b.filename, "pt-BR", { sensitivity: "base" });
}

function labelSvg(item, index) {
  const folder = truncate(item.folder.replace(SCAN_PREFIX, "").replace(/^\/+/, "") || item.folder, 42);
  const filename = truncate(item.filename, 38);
  const relpath = truncate(item.relpath, 54);

  return Buffer.from(`
    <svg width="${TILE.width}" height="${TILE.labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0b0b0b"/>
      <text x="12" y="21" fill="#f5c542" font-family="Arial, sans-serif" font-size="14" font-weight="700">${String(index).padStart(4, "0")}</text>
      <text x="12" y="44" fill="#f5f5f5" font-family="Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(folder)}</text>
      <text x="12" y="65" fill="#cfcfcf" font-family="Arial, sans-serif" font-size="11">${escapeXml(filename)}</text>
      <text x="12" y="86" fill="#858585" font-family="Arial, sans-serif" font-size="9">${escapeXml(relpath)}</text>
      <text x="12" y="103" fill="#666666" font-family="Arial, sans-serif" font-size="9">${escapeXml(item.sizeLabel)}</text>
    </svg>
  `);
}

async function makeTile(item, index) {
  const image = await sharp(item.absolute)
    .rotate()
    .resize({
      width: TILE.width,
      height: TILE.imageHeight,
      fit: "contain",
      background: "#080808",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();

  return sharp({
    create: {
      width: TILE.width,
      height: TILE.imageHeight + TILE.labelHeight,
      channels: 3,
      background: "#080808",
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: labelSvg(item, index), top: TILE.imageHeight, left: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

function sheetFileName(page) {
  return `sheet_${String(page).padStart(3, "0")}.jpg`;
}

async function collectItems(scanDir) {
  const items = [];
  for await (const file of walk(scanDir)) {
    const stat = await fs.stat(file);
    const relpath = normalizeRelpath(path.relative(CATALOG, file));
    items.push({
      absolute: file,
      relpath,
      folder: folderKeyFor(relpath),
      filename: path.basename(file),
      bytes: stat.size,
      sizeLabel: `${Math.round(stat.size / 1024)} KB`,
    });
  }

  const counts = new Map();
  for (const item of items) counts.set(item.folder, (counts.get(item.folder) || 0) + 1);

  let selected = items.sort((a, b) => compareItems(a, b, counts));
  if (MAX_FOLDERS > 0) {
    const folders = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR", { sensitivity: "base" }))
      .slice(0, MAX_FOLDERS)
      .map(([folder]) => folder);
    const allowed = new Set(folders);
    selected = selected.filter((item) => allowed.has(item.folder));
  }
  if (MAX_IMAGES > 0) selected = selected.slice(0, MAX_IMAGES);

  return { items: selected, counts };
}

async function writeSheets(items) {
  const pageSize = COLUMNS * ROWS;
  const width = TILE.padding * 2 + COLUMNS * TILE.width + (COLUMNS - 1) * TILE.gap;
  const height = TILE.padding * 2 + ROWS * (TILE.imageHeight + TILE.labelHeight) + (ROWS - 1) * TILE.gap;
  const sheets = [];

  for (let start = 0; start < items.length; start += pageSize) {
    const page = Math.floor(start / pageSize) + 1;
    const pageItems = items.slice(start, start + pageSize);
    const composites = [];

    for (let offset = 0; offset < pageItems.length; offset += 1) {
      const column = offset % COLUMNS;
      const row = Math.floor(offset / COLUMNS);
      composites.push({
        input: await makeTile(pageItems[offset], start + offset + 1),
        left: TILE.padding + column * (TILE.width + TILE.gap),
        top: TILE.padding + row * (TILE.imageHeight + TILE.labelHeight + TILE.gap),
      });
    }

    const file = path.join(OUT_DIR, sheetFileName(page));
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#050505",
      },
    })
      .composite(composites)
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(file);

    sheets.push({
      page,
      file,
      first_index: start + 1,
      last_index: start + pageItems.length,
      items: pageItems.length,
    });
  }

  return sheets;
}

async function main() {
  const scanDir = path.resolve(path.join(CATALOG, SCAN_PREFIX));
  const catalogFloor = `${CATALOG.toLowerCase()}${path.sep}`;
  if (!scanDir.toLowerCase().startsWith(catalogFloor)) throw new Error(`Scan prefix outside catalog: ${SCAN_PREFIX}`);
  if (!(await exists(scanDir))) throw new Error(`Scan prefix not found: ${scanDir}`);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const { items, counts } = await collectItems(scanDir);
  const sheets = await writeSheets(items);

  const folderCounts = [...counts.entries()]
    .filter(([folder]) => items.some((item) => item.folder === folder))
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder, "pt-BR", { sensitivity: "base" }));

  const index = {
    generated_at: new Date().toISOString(),
    catalog: CATALOG,
    scan_prefix: SCAN_PREFIX,
    sort: SORT,
    max_images: MAX_IMAGES || null,
    max_folders: MAX_FOLDERS || null,
    columns: COLUMNS,
    rows: ROWS,
    output_dir: OUT_DIR,
    images: items.length,
    folders: folderCounts.length,
    folder_counts: folderCounts,
    sheets,
    items: items.map((item, index) => ({
      index: index + 1,
      relpath: item.relpath,
      folder: item.folder,
      filename: item.filename,
      bytes: item.bytes,
      sheet: sheetFileName(Math.floor(index / (COLUMNS * ROWS)) + 1),
    })),
  };

  await fs.writeFile(path.join(OUT_DIR, "contact-sheet-index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(OUT_DIR, "contact-sheet-items.csv"),
    [
      "index,relpath,folder,filename,bytes,sheet",
      ...index.items.map((item) =>
        [item.index, item.relpath, item.folder, item.filename, item.bytes, item.sheet].map(csvEscape).join(","),
      ),
    ].join("\n") + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        scan_prefix: SCAN_PREFIX,
        out_dir: OUT_DIR,
        images: index.images,
        folders: index.folders,
        sheets: sheets.length,
        index: path.join(OUT_DIR, "contact-sheet-index.json"),
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
