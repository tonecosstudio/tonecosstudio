import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

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

const OUTPUT = path.resolve(
  argValue("output", process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput()),
);
const SITE_PLAN = path.resolve(
  argValue(
    "site-plan",
    path.join(OUTPUT, "manifests", "site_import", "telegram_webp_site_import_plan.json"),
  ),
);
const STAMP = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OUTPUT, "manifests", "visual_audit", STAMP)),
);
const CATEGORY_FILTER = normalizeComparable(argValue("category", "anime"));
const SOURCE_FILTER = normalizeComparable(argValue("source", ""));
const SLUG_FILTER = normalizeComparable(argValue("slug", ""));
const IMAGE_FIELD = normalizeComparable(argValue("image", "thumb")) === "display" ? "display_relpath" : "thumb_relpath";
const COLUMNS = argNumber("columns", 5);
const ROWS = argNumber("rows", 4);
const MAX_ITEMS = argNumber("max-items", 0);

const TILE = {
  width: 300,
  imageHeight: 300,
  labelHeight: 132,
  gap: 14,
  padding: 20,
};

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function sourceKey(item) {
  return slug(item.source_title || item.subcategory || item.category || "catalogo");
}

function compareItems(left, right) {
  return (
    String(left.source_title || "").localeCompare(String(right.source_title || ""), "pt-BR", { sensitivity: "base" }) ||
    String(left.taxonomy_slug || "").localeCompare(String(right.taxonomy_slug || ""), "pt-BR", { sensitivity: "base" }) ||
    String(left.variant_name || "").localeCompare(String(right.variant_name || ""), "pt-BR", { sensitivity: "base" }) ||
    Number.parseInt(String(left.message_id || "0"), 10) - Number.parseInt(String(right.message_id || "0"), 10)
  );
}

function labelSvg(item, index) {
  const source = truncate(item.source_title || item.subcategory || "", 36);
  const name = truncate(item.name || item.character_name || "", 36);
  const slugText = truncate(item.taxonomy_slug || "", 34);
  const variant = truncate(item.variant_name || item.variant_type || "", 38);
  const id = truncate(item.message_id || item.import_id || "", 24);
  const pathText = truncate(item.display_relpath || "", 54);

  return Buffer.from(`
    <svg width="${TILE.width}" height="${TILE.labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#080808"/>
      <text x="12" y="22" fill="#f7c948" font-family="Arial, sans-serif" font-size="14" font-weight="700">${String(index).padStart(4, "0")} ${escapeXml(source)}</text>
      <text x="12" y="45" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeXml(name)}</text>
      <text x="12" y="66" fill="#b9e6ff" font-family="Arial, sans-serif" font-size="11">${escapeXml(slugText)}</text>
      <text x="12" y="86" fill="#cfcfcf" font-family="Arial, sans-serif" font-size="10">${escapeXml(variant)}</text>
      <text x="12" y="105" fill="#858585" font-family="Arial, sans-serif" font-size="9">id ${escapeXml(id)}</text>
      <text x="12" y="122" fill="#666666" font-family="Arial, sans-serif" font-size="8">${escapeXml(pathText)}</text>
    </svg>
  `);
}

async function makeTile(item, index) {
  const relpath = item[IMAGE_FIELD] || item.display_relpath;
  const image = await sharp(path.join(OUTPUT, relpath))
    .resize({
      width: TILE.width,
      height: TILE.imageHeight,
      fit: "contain",
      background: "#050505",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  return sharp({
    create: {
      width: TILE.width,
      height: TILE.imageHeight + TILE.labelHeight,
      channels: 3,
      background: "#050505",
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: labelSvg(item, index), top: TILE.imageHeight, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

async function writeSheet(items, filePath, globalOffset) {
  const width = TILE.padding * 2 + COLUMNS * TILE.width + (COLUMNS - 1) * TILE.gap;
  const height = TILE.padding * 2 + ROWS * (TILE.imageHeight + TILE.labelHeight) + (ROWS - 1) * TILE.gap;
  const composites = [];

  for (let offset = 0; offset < items.length; offset += 1) {
    const column = offset % COLUMNS;
    const row = Math.floor(offset / COLUMNS);
    composites.push({
      input: await makeTile(items[offset], globalOffset + offset + 1),
      left: TILE.padding + column * (TILE.width + TILE.gap),
      top: TILE.padding + row * (TILE.imageHeight + TILE.labelHeight + TILE.gap),
    });
  }

  await sharp({
    create: { width, height, channels: 3, background: "#030303" },
  })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(filePath);
}

async function main() {
  const plan = JSON.parse(await fs.readFile(SITE_PLAN, "utf8"));
  let items = (plan.items || [])
    .filter((item) => item.status === "ready_for_import")
    .filter((item) => !CATEGORY_FILTER || CATEGORY_FILTER === "all" || normalizeComparable(item.category) === CATEGORY_FILTER)
    .filter((item) => !SOURCE_FILTER || normalizeComparable(item.source_title || item.subcategory) === SOURCE_FILTER)
    .filter((item) => !SLUG_FILTER || normalizeComparable(item.taxonomy_slug) === SLUG_FILTER)
    .sort(compareItems);
  if (MAX_ITEMS > 0) items = items.slice(0, MAX_ITEMS);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const pageSize = COLUMNS * ROWS;
  const sheets = [];
  for (let start = 0; start < items.length; start += pageSize) {
    const page = Math.floor(start / pageSize) + 1;
    const pageItems = items.slice(start, start + pageSize);
    const source = pageItems[0] ? sourceKey(pageItems[0]) : CATEGORY_FILTER || "catalogo";
    const file = path.join(OUT_DIR, `${source}_sheet_${String(page).padStart(3, "0")}.jpg`);
    await writeSheet(pageItems, file, start);
    sheets.push({ page, file, items: pageItems.length });
  }

  const indexRows = [
    ["index", "message_id", "source_title", "name", "taxonomy_slug", "variant_name", "display_relpath"].join(","),
    ...items.map((item, index) =>
      [
        index + 1,
        item.message_id,
        item.source_title,
        item.name,
        item.taxonomy_slug,
        item.variant_name,
        item.display_relpath,
      ].map(csvEscape).join(","),
    ),
  ];
  const indexCsv = path.join(OUT_DIR, `${CATEGORY_FILTER || "catalogo"}_visual_audit_index.csv`);
  await fs.writeFile(indexCsv, `${indexRows.join("\n")}\n`, "utf8");

  const bySource = {};
  for (const item of items) {
    const key = item.source_title || item.subcategory || "";
    bySource[key] = (bySource[key] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        site_plan: SITE_PLAN,
        out_dir: OUT_DIR,
        index_csv: indexCsv,
        category_filter: CATEGORY_FILTER || "all",
        image_field: IMAGE_FIELD,
        items: items.length,
        sheets: sheets.length,
        by_source: Object.fromEntries(Object.entries(bySource).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        first_sheets: sheets.slice(0, 12),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
