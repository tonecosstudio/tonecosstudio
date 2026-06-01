import { createHash } from "node:crypto";
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

const MANIFEST_PATH = argValue("manifest", "catalog-assets/drive-curated-v12/_manifest/catalog-assets-manifest.json");
const OUT_DIR = argValue("out", path.join(path.dirname(MANIFEST_PATH), "..", "_audit", "visual-groups"));
const NEAR_THRESHOLD = Number.parseInt(argValue("near-threshold", "6"), 10);
const MIN_GROUP_SIZE = Number.parseInt(argValue("min-group-size", "2"), 10);
const STATUSES = new Set(
  argValue("statuses", "ready_to_organize,duplicate_candidate,duplicate_exact")
    .split(",")
    .map((status) => status.trim())
    .filter(Boolean),
);

const TILE_WIDTH = 220;
const IMAGE_HEIGHT = 180;
const LABEL_HEIGHT = 86;
const TILE_HEIGHT = IMAGE_HEIGHT + LABEL_HEIGHT;
const GAP = 12;
const PADDING = 24;
const COLUMNS = Number.parseInt(argValue("columns", "4"), 10);

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

function displayIdentity(row) {
  return [row.sourceTitle || "Catalogo", row.characterName || "Sem Nome"]
    .filter(Boolean)
    .join(" / ");
}

function identityKey(row) {
  return [row.sourceTitle, row.characterName].map(normalizeComparable).join("|");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hammingDistanceHex(left, right) {
  if (!left || !right || left.length !== right.length) return null;
  let xor = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

async function dHash64(filePath) {
  const pixels = await sharp(filePath)
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  let bits = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = pixels[y * 9 + x];
      const right = pixels[y * 9 + x + 1];
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

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

function toCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function groupSlug(group, index) {
  return `${String(index + 1).padStart(3, "0")}-${normalizeComparable(group.identity).replace(/ /g, "-") || "sem-identidade"}`;
}

async function analyzeItem(row) {
  const filePath = path.resolve(row.localPath);
  const bytes = await fs.readFile(filePath);
  const metadata = await sharp(bytes).metadata();
  return {
    ...row,
    filePath,
    visualSha256: row.sha256 || sha256(bytes),
    perceptualHash: await dHash64(filePath),
    width: metadata.width || null,
    height: metadata.height || null,
    variantName: row.variantName || null,
  };
}

function classifyGroup(items) {
  const exactGroups = new Map();
  for (const item of items) {
    const group = exactGroups.get(item.visualSha256) || [];
    group.push(item);
    exactGroups.set(item.visualSha256, group);
  }

  const nearPairs = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[i].visualSha256 === items[j].visualSha256) continue;
      const distance = hammingDistanceHex(items[i].perceptualHash, items[j].perceptualHash);
      if (distance !== null && distance <= NEAR_THRESHOLD) {
        nearPairs.push({ leftId: items[i].id, rightId: items[j].id, distance });
      }
    }
  }

  const variants = new Set(items.map((item) => item.variantName || "default"));
  const hasExactDuplicates = [...exactGroups.values()].some((group) => group.length > 1);
  const hasVariants = variants.size > 1;

  let reviewType = "same_model_or_angle_review";
  if (hasVariants) reviewType = "variant_candidate";
  else if (nearPairs.length > 0) reviewType = "near_duplicate_review";
  else if (hasExactDuplicates) reviewType = "exact_duplicate_group";

  return {
    reviewType,
    exactDuplicateSets: [...exactGroups.values()].filter((group) => group.length > 1).map((group) => group.map((item) => item.id)),
    nearPairs,
  };
}

function labelSvg(item, index) {
  const title = truncate(item.proposedName || item.originalName, 32);
  const variant = truncate(item.variantName || "default", 28);
  const status = truncate(item.status, 28);
  const id = truncate(item.id, 18);

  return Buffer.from(`
    <svg width="${TILE_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0b0b0b"/>
      <text x="10" y="18" fill="#f4c63d" font-family="Arial, sans-serif" font-size="13" font-weight="700">${String(index + 1).padStart(2, "0")} ${escapeXml(status)}</text>
      <text x="10" y="39" fill="#f3f3f3" font-family="Arial, sans-serif" font-size="11">${escapeXml(title)}</text>
      <text x="10" y="57" fill="#bdbdbd" font-family="Arial, sans-serif" font-size="10">variante: ${escapeXml(variant)}</text>
      <text x="10" y="75" fill="#777" font-family="Arial, sans-serif" font-size="9">${escapeXml(id)}</text>
    </svg>
  `);
}

async function makeTile(item, index) {
  const image = await sharp(item.filePath)
    .rotate()
    .resize({
      width: TILE_WIDTH,
      height: IMAGE_HEIGHT,
      fit: "contain",
      background: "#080808",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 84 })
    .toBuffer();

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
      { input: labelSvg(item, index), top: IMAGE_HEIGHT, left: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function writeGroupSheet(group, index) {
  const columns = Math.min(COLUMNS, group.items.length);
  const rows = Math.ceil(group.items.length / columns);
  const width = PADDING * 2 + columns * TILE_WIDTH + (columns - 1) * GAP;
  const headerHeight = 54;
  const height = PADDING * 2 + headerHeight + rows * TILE_HEIGHT + (rows - 1) * GAP;
  const composites = [];

  const header = Buffer.from(`
    <svg width="${width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505"/>
      <text x="0" y="20" fill="#f4c63d" font-family="Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(group.identity)}</text>
      <text x="0" y="42" fill="#cfcfcf" font-family="Arial, sans-serif" font-size="12">${escapeXml(group.reviewType)} | itens: ${group.items.length}</text>
    </svg>
  `);
  composites.push({ input: header, left: PADDING, top: PADDING });

  for (let offset = 0; offset < group.items.length; offset += 1) {
    const column = offset % columns;
    const row = Math.floor(offset / columns);
    composites.push({
      input: await makeTile(group.items[offset], offset),
      left: PADDING + column * (TILE_WIDTH + GAP),
      top: PADDING + headerHeight + row * (TILE_HEIGHT + GAP),
    });
  }

  const fileName = `${groupSlug(group, index)}.jpg`;
  const sheetPath = path.join(OUT_DIR, "sheets", fileName);
  await fs.mkdir(path.dirname(sheetPath), { recursive: true });
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

  return path.relative(process.cwd(), sheetPath);
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const usableRows = (manifest.items || []).filter(
    (row) =>
      row.localPath &&
      row.exportStatus === "exported" &&
      STATUSES.has(row.status) &&
      row.characterName &&
      row.sourceTitle,
  );

  const analyzed = [];
  for (const row of usableRows) {
    try {
      analyzed.push(await analyzeItem(row));
    } catch (error) {
      analyzed.push({ ...row, error: error.message });
    }
  }

  const groupsByIdentity = new Map();
  for (const item of analyzed.filter((row) => !row.error)) {
    const key = identityKey(item);
    const group = groupsByIdentity.get(key) || [];
    group.push(item);
    groupsByIdentity.set(key, group);
  }

  const groups = [...groupsByIdentity.values()]
    .filter((items) => items.length >= MIN_GROUP_SIZE)
    .map((items) => {
      const classification = classifyGroup(items);
      return {
        identity: displayIdentity(items[0]),
        key: identityKey(items[0]),
        itemCount: items.length,
        ...classification,
        items: items.sort((left, right) =>
          String(left.variantName || left.proposedName || left.originalName).localeCompare(
            String(right.variantName || right.proposedName || right.originalName),
          ),
        ),
      };
    })
    .sort((left, right) => {
      const type = left.reviewType.localeCompare(right.reviewType);
      if (type !== 0) return type;
      return right.itemCount - left.itemCount || left.identity.localeCompare(right.identity);
    });

  await fs.mkdir(OUT_DIR, { recursive: true });

  for (let index = 0; index < groups.length; index += 1) {
    groups[index].sheetPath = await writeGroupSheet(groups[index], index);
  }

  const reportGroups = groups.map((group) => ({
    identity: group.identity,
    reviewType: group.reviewType,
    itemCount: group.itemCount,
    sheetPath: group.sheetPath,
    exactDuplicateSets: group.exactDuplicateSets,
    nearPairs: group.nearPairs,
    items: group.items.map((item) => ({
      id: item.id,
      originalName: item.originalName,
      proposedName: item.proposedName,
      status: item.status,
      sourceDrivePath: item.sourceDrivePath,
      variantName: item.variantName,
      localPath: item.localPath,
      sha256: item.visualSha256,
      perceptualHash: item.perceptualHash,
    })),
  }));

  const summary = {
    generatedAt: new Date().toISOString(),
    manifest: MANIFEST_PATH,
    nearThreshold: NEAR_THRESHOLD,
    analyzedItems: analyzed.filter((row) => !row.error).length,
    failedItems: analyzed.filter((row) => row.error).length,
    groups: reportGroups.length,
    byReviewType: reportGroups.reduce((acc, group) => {
      acc[group.reviewType] = (acc[group.reviewType] || 0) + 1;
      return acc;
    }, {}),
  };

  await fs.writeFile(
    path.join(OUT_DIR, "visual-groups-report.json"),
    `${JSON.stringify({ summary, groups: reportGroups }, null, 2)}\n`,
  );

  const columns = ["identity", "reviewType", "itemCount", "sheetPath"];
  await fs.writeFile(
    path.join(OUT_DIR, "visual-groups-index.csv"),
    `${columns.join(",")}\n${reportGroups.map((group) => columns.map((column) => toCsvValue(group[column])).join(",")).join("\n")}\n`,
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
