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

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const MANIFESTS_DIR = path.join(OUTPUT, "manifests");
const GROUPS = path.resolve(
  argValue(
    "groups",
    process.env.ORDAX_PTBR_GROUPS_QUEUE ||
      path.join(MANIFESTS_DIR, "grupos_curadoria_ptbr.csv"),
  ),
);
const PRIORITY = argValue("priority", "alta");
const LIMIT = Number.parseInt(argValue("limit", "0"), 10);
const GROUPS_PER_SHEET = Number.parseInt(argValue("groups-per-sheet", "12"), 10);
const EXAMPLES_PER_GROUP = Number.parseInt(argValue("examples-per-group", "3"), 10);
const OUT_DIR = path.resolve(
  argValue(
    "out-dir",
    path.join(MANIFESTS_DIR, "curadoria_visual", PRIORITY),
  ),
);

const FILTERED_GROUPS_CSV = path.join(OUT_DIR, `grupos_${PRIORITY}.csv`);
const VISUAL_INDEX_JSON = path.join(OUT_DIR, `indice_visual_${PRIORITY}.json`);

const CARD = {
  width: 760,
  height: 300,
  padding: 18,
  image: 132,
};
const GAP = 18;
const COLUMNS = 2;

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      values.push(value);
      value = "";
    } else value += char;
  }

  values.push(value);
  return values;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""]),
    );
  });

  return { headers, rows };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function wrapText(text, maxChars, maxLines = 2) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textSvg(lines, options = {}) {
  const {
    width = CARD.width,
    height = CARD.height,
    x = 0,
    y = 0,
    fontSize = 20,
    fill = "#111827",
    weight = 500,
    lineHeight = Math.round(fontSize * 1.35),
  } = options;

  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${y + index * lineHeight}">${xmlEscape(line)}</tspan>`,
    )
    .join("");

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${tspans}</text>
    </svg>
  `);
}

function displayCategory(value) {
  const normalized = normalizeComparable(value);
  const labels = new Map(
    Object.entries({
      dc: "DC",
      marvel: "Marvel",
      "sci-fi": "sci-fi",
      "sci fi": "sci-fi",
    }),
  );
  if (labels.has(normalized)) return labels.get(normalized);
  return titleCase(normalized.replaceAll("-", " "));
}

function categoryLabel(group) {
  const current = displayCategory(group.categoria_atual);
  const suggested = displayCategory(group.categoria_sugerida);
  if (!current) return suggested || "(sem categoria)";
  if (!suggested || normalizeComparable(current) === normalizeComparable(suggested)) {
    return current;
  }
  return `${current} -> ${suggested}`;
}

async function makeThumb(relpath) {
  const imagePath = path.join(OUTPUT, ...String(relpath).split(/[\\/]+/).filter(Boolean));
  if (!(await exists(imagePath))) return null;

  return sharp(imagePath)
    .resize({
      width: CARD.image,
      height: CARD.image,
      fit: "contain",
      background: "#ffffff",
    })
    .webp({ quality: 74 })
    .toBuffer();
}

function exampleRelpaths(group) {
  return String(group.exemplos_display || group.exemplo_display || "")
    .split(/;\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, EXAMPLES_PER_GROUP);
}

async function makeCard(group, absoluteIndex) {
  const title = `${absoluteIndex}. ${group.nome_sugerido_pt_br || "(sem nome)"}`;
  const subtitle = `categoria: ${categoryLabel(group)} | franquia: ${group.franquia_sugerida_pt_br || "(sem franquia)"}`;
  const meta = `${group.quantidade} itens | ${group.motivo_prioridade || "prioridade"}`;
  const card = sharp({
    create: {
      width: CARD.width,
      height: CARD.height,
      channels: 4,
      background: "#ffffff",
    },
  });

  const composites = [
    {
      input: Buffer.from(`
        <svg width="${CARD.width}" height="${CARD.height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${CARD.width}" height="${CARD.height}" rx="8" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
          <rect x="0" y="0" width="${CARD.width}" height="6" fill="${group.prioridade === "alta" ? "#b91c1c" : "#d97706"}"/>
        </svg>
      `),
      left: 0,
      top: 0,
    },
    {
      input: textSvg(wrapText(title, 58, 2), {
        width: CARD.width - CARD.padding * 2,
        height: 70,
        x: 0,
        y: 22,
        fontSize: 21,
        weight: 700,
      }),
      left: CARD.padding,
      top: 14,
    },
    {
      input: textSvg(wrapText(subtitle, 72, 2), {
        width: CARD.width - CARD.padding * 2,
        height: 48,
        x: 0,
        y: 18,
        fontSize: 16,
        fill: "#374151",
        weight: 500,
      }),
      left: CARD.padding,
      top: 78,
    },
    {
      input: textSvg(wrapText(meta, 90, 2), {
        width: CARD.width - CARD.padding * 2,
        height: 44,
        x: 0,
        y: 17,
        fontSize: 14,
        fill: "#6b7280",
        weight: 500,
      }),
      left: CARD.padding,
      top: 122,
    },
  ];

  const examples = exampleRelpaths(group);
  for (let index = 0; index < examples.length; index += 1) {
    const thumb = await makeThumb(examples[index]);
    if (!thumb) continue;
    composites.push({
      input: thumb,
      left: CARD.padding + index * (CARD.image + 12),
      top: 168,
    });
  }

  return card.composite(composites).png().toBuffer();
}

async function writeFilteredCsv(headers, groups) {
  const csv = [
    headers.join(","),
    ...groups.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  await fs.writeFile(FILTERED_GROUPS_CSV, `${csv}\n`, "utf8");
}

async function main() {
  const { headers, rows } = await readCsv(GROUPS);
  const filtered = rows
    .filter((row) => normalizeComparable(row.prioridade) === normalizeComparable(PRIORITY))
    .slice(0, Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : undefined);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await writeFilteredCsv(headers, filtered);

  const sheets = [];
  const sheetWidth = COLUMNS * CARD.width + (COLUMNS + 1) * GAP;
  const rowsPerSheet = Math.ceil(GROUPS_PER_SHEET / COLUMNS);
  const sheetHeight = rowsPerSheet * CARD.height + (rowsPerSheet + 1) * GAP;

  for (let start = 0; start < filtered.length; start += GROUPS_PER_SHEET) {
    const chunk = filtered.slice(start, start + GROUPS_PER_SHEET);
    const sheetIndex = Math.floor(start / GROUPS_PER_SHEET) + 1;
    const sheetName = `curadoria_${PRIORITY}_${String(sheetIndex).padStart(3, "0")}.jpg`;
    const sheetPath = path.join(OUT_DIR, sheetName);

    const composites = [];
    for (let index = 0; index < chunk.length; index += 1) {
      const cardBuffer = await makeCard(chunk[index], start + index + 1);
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      composites.push({
        input: cardBuffer,
        left: GAP + column * (CARD.width + GAP),
        top: GAP + row * (CARD.height + GAP),
      });
    }

    await sharp({
      create: {
        width: sheetWidth,
        height: sheetHeight,
        channels: 3,
        background: "#f3f4f6",
      },
    })
      .composite(composites)
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(sheetPath);

    sheets.push({
      sheet: sheetPath,
      groups: chunk.length,
      first_group: start + 1,
      last_group: start + chunk.length,
    });
  }

  const index = {
    generated_at: new Date().toISOString(),
    source_groups: GROUPS,
    priority: PRIORITY,
    groups: filtered.length,
    groups_per_sheet: GROUPS_PER_SHEET,
    examples_per_group: EXAMPLES_PER_GROUP,
    filtered_csv: FILTERED_GROUPS_CSV,
    sheets,
  };
  await fs.writeFile(VISUAL_INDEX_JSON, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        priority: PRIORITY,
        groups: filtered.length,
        sheets: sheets.length,
        filtered_csv: FILTERED_GROUPS_CSV,
        visual_index: VISUAL_INDEX_JSON,
        out_dir: OUT_DIR,
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
