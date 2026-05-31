import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const MANIFEST_PATH = argValue("manifest", "catalog-assets/drive-curated-v2/_manifest/catalog-assets-manifest.json");
const OUT_DIR = argValue("out", "catalog-assets/drive-curated-v2/_review/contact-sheets");
const STATUSES = new Set(
  argValue("statuses", "needs_review,duplicate_candidate")
    .split(",")
    .map((status) => status.trim())
    .filter(Boolean),
);
const COLUMNS = Number.parseInt(argValue("columns", "5"), 10);
const ROWS = Number.parseInt(argValue("rows", "5"), 10);
const TILE_WIDTH = 240;
const IMAGE_HEIGHT = 190;
const LABEL_HEIGHT = 92;
const TILE_HEIGHT = IMAGE_HEIGHT + LABEL_HEIGHT;
const PAGE_PADDING = 28;
const GAP = 14;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function sheetSlug(status, pageNumber) {
  return `${status.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${String(pageNumber).padStart(3, "0")}.jpg`;
}

function labelSvg(item, index, status) {
  const title = truncate(item.originalName, 34);
  const proposed = truncate(item.proposedName, 34);
  const folder = truncate(item.destinationFolder, 42);
  const id = truncate(item.id, 18);

  return Buffer.from(`
    <svg width="${TILE_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0c0c0c"/>
      <text x="12" y="19" fill="#f4c63d" font-family="Arial, sans-serif" font-size="13" font-weight="700">${String(index).padStart(3, "0")} - ${escapeXml(status)}</text>
      <text x="12" y="40" fill="#f3f3f3" font-family="Arial, sans-serif" font-size="12">${escapeXml(title)}</text>
      <text x="12" y="58" fill="#b9b9b9" font-family="Arial, sans-serif" font-size="11">${escapeXml(proposed)}</text>
      <text x="12" y="76" fill="#8f8f8f" font-family="Arial, sans-serif" font-size="10">${escapeXml(folder)}</text>
      <text x="12" y="89" fill="#696969" font-family="Arial, sans-serif" font-size="9">${escapeXml(id)}</text>
    </svg>
  `);
}

async function makeTile(item, globalIndex, status) {
  const imagePath = path.resolve(item.localPath);
  const image = await sharp(imagePath)
    .rotate()
    .resize({
      width: TILE_WIDTH,
      height: IMAGE_HEIGHT,
      fit: "contain",
      background: "#080808",
      withoutEnlargement: true,
    })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: "#080808",
    })
    .jpeg({ quality: 84 })
    .toBuffer();

  const label = labelSvg(item, globalIndex, status);
  return sharp({
    create: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      channels: 3,
      background: "#080808",
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: label, top: IMAGE_HEIGHT, left: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function writeStatusSheets(status, rows) {
  const usableRows = [];
  for (const row of rows) {
    if (row.localPath && row.exportStatus !== "non_image" && (await fileExists(path.resolve(row.localPath)))) {
      usableRows.push(row);
    }
  }

  const pageSize = COLUMNS * ROWS;
  const sheetRows = [];
  const width = PAGE_PADDING * 2 + COLUMNS * TILE_WIDTH + (COLUMNS - 1) * GAP;
  const height = PAGE_PADDING * 2 + ROWS * TILE_HEIGHT + (ROWS - 1) * GAP;

  for (let pageStart = 0; pageStart < usableRows.length; pageStart += pageSize) {
    const pageRows = usableRows.slice(pageStart, pageStart + pageSize);
    const pageNumber = Math.floor(pageStart / pageSize) + 1;
    const composites = [];

    for (let offset = 0; offset < pageRows.length; offset += 1) {
      const item = pageRows[offset];
      const column = offset % COLUMNS;
      const row = Math.floor(offset / COLUMNS);
      composites.push({
        input: await makeTile(item, pageStart + offset + 1, status),
        left: PAGE_PADDING + column * (TILE_WIDTH + GAP),
        top: PAGE_PADDING + row * (TILE_HEIGHT + GAP),
      });
    }

    const fileName = sheetSlug(status, pageNumber);
    const sheetPath = path.join(OUT_DIR, fileName);
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#050505",
      },
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(sheetPath);

    sheetRows.push({
      status,
      page: pageNumber,
      file: path.relative(process.cwd(), sheetPath),
      items: pageRows.length,
    });
  }

  return sheetRows;
}

function toCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  await fs.mkdir(OUT_DIR, { recursive: true });

  const sheetRows = [];
  for (const status of STATUSES) {
    const rows = (manifest.items || []).filter((row) => row.status === status);
    sheetRows.push(...(await writeStatusSheets(status, rows)));
  }

  const columns = ["status", "page", "file", "items"];
  await fs.writeFile(
    path.join(OUT_DIR, "review-index.csv"),
    `${columns.join(",")}\n${sheetRows.map((row) => columns.map((column) => toCsvValue(row[column])).join(",")).join("\n")}\n`,
  );

  console.log(JSON.stringify({ manifest: MANIFEST_PATH, outDir: OUT_DIR, sheets: sheetRows.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
