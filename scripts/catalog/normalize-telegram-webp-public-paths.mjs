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

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      "C:/Users/Casa/Downloads/ordax-catalogo-webp-final",
  ),
);
const FINAL_MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const QUEUE = path.resolve(
  argValue(
    "queue",
    process.env.ORDAX_PTBR_NAME_QUEUE ||
      path.join(OUTPUT, "manifests", "revisao_nomes_ptbr.csv"),
  ),
);
const CATEGORIES = new Set(
  argValue("categories", "marvel,dc")
    .split(",")
    .map((value) => normalizeComparable(value).replace(/\s+/g, "-"))
    .filter(Boolean),
);
const FROM_CATEGORIES = new Set(
  argValue("from-categories", "")
    .split(",")
    .map((value) => normalizeComparable(value).replace(/\s+/g, "-"))
    .filter(Boolean),
);
const FROM_PREFIXES = argValue("from-prefixes", "")
  .split(",")
  .map((value) => value.trim().replaceAll("\\", "/").replace(/\/+$/g, ""))
  .filter(Boolean);
const DRY_RUN = argFlag("dry-run");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

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

function slugPart(value, fallback) {
  const slug = normalizeComparable(value).replace(/\s+/g, "-");
  return (slug || fallback).slice(0, 90).replace(/-+$/g, "") || fallback;
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function queueKeys(row) {
  return [
    row.display_relpath,
    row.source_name ? `source:${row.source_name}` : "",
    row.message_id ? `message:${row.message_id}` : "",
  ].filter(Boolean);
}

function buildQueueIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    for (const key of queueKeys(row)) {
      if (!index.has(key)) index.set(key, row);
    }
  }
  return index;
}

function queueRowFor(record, index) {
  return (
    index.get(record.display_relpath) ||
    index.get(`source:${record.source_name || ""}`) ||
    index.get(`message:${record.message_id || ""}`) ||
    null
  );
}

function targetRelpath(kind, record, row) {
  const category = slugPart(row.categoria_final, "outros");
  const franchise = slugPart(row.franquia_publica_pt_br || row.sugestao_franquia_pt_br, "sem-franquia");
  const name = slugPart(row.nome_publico_pt_br || row.sugestao_nome_pt_br, "sem-nome");
  const current = kind === "display" ? record.display_relpath : record.thumb_relpath;
  const filename = path.basename(current || row.display_relpath || row.thumb_relpath || "item.webp");
  return path.join(kind, category, franchise, name, filename).replaceAll("\\", "/");
}

function currentTopCategory(record) {
  const parts = String(record.display_relpath || "").split(/[\\/]+/).filter(Boolean);
  return normalizeComparable(parts[1]).replace(/\s+/g, "-");
}

function matchesFromPrefixes(record) {
  if (FROM_PREFIXES.length === 0) return true;
  const display = String(record.display_relpath || "").replaceAll("\\", "/");
  const thumb = String(record.thumb_relpath || "").replaceAll("\\", "/");
  return FROM_PREFIXES.some(
    (prefix) =>
      display === prefix ||
      display.startsWith(`${prefix}/`) ||
      thumb === prefix ||
      thumb.startsWith(`${prefix}/`),
  );
}

async function moveRelpath(oldRelpath, newRelpath, collisions) {
  const oldAbs = path.join(OUTPUT, oldRelpath);
  const newAbs = path.join(OUTPUT, newRelpath);
  if (oldAbs === newAbs) return { changed: false, missing: false };

  const oldExists = await exists(oldAbs);
  const newExists = await exists(newAbs);
  if (!oldExists && newExists) return { changed: true, missing: false, alreadyMoved: true };
  if (!oldExists) return { changed: true, missing: true, oldRelpath, newRelpath };
  if (newExists) {
    collisions.push({ oldRelpath, newRelpath });
    return { changed: true, collision: true, oldRelpath, newRelpath };
  }

  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(newAbs), { recursive: true });
    await fs.rename(oldAbs, newAbs);
  }

  return { changed: true, missing: false, oldRelpath, newRelpath };
}

async function removeEmptyParents(startRelpath) {
  let current = path.dirname(path.join(OUTPUT, startRelpath));
  const floor = OUTPUT.toLowerCase();

  while (current.toLowerCase().startsWith(floor) && current.toLowerCase() !== floor) {
    try {
      if (!DRY_RUN) await fs.rmdir(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

async function main() {
  const records = await readJsonl(FINAL_MANIFEST);
  const queueRows = await readCsv(QUEUE);
  const queueIndex = buildQueueIndex(queueRows);
  const moves = [];
  const missing = [];
  const collisions = [];
  const updated = [];

  for (const record of records) {
    const row = queueRowFor(record, queueIndex);
    const category = normalizeComparable(row?.categoria_final).replace(/\s+/g, "-");
    const sourceCategory = currentTopCategory(record);

    if (
      !row ||
      !CATEGORIES.has(category) ||
      (FROM_CATEGORIES.size > 0 && !FROM_CATEGORIES.has(sourceCategory)) ||
      !matchesFromPrefixes(record)
    ) {
      updated.push(record);
      continue;
    }

    const displayRelpath = targetRelpath("display", record, row);
    const thumbRelpath = targetRelpath("thumb", record, row);
    const displayMove = await moveRelpath(record.display_relpath, displayRelpath, collisions);
    const thumbMove = await moveRelpath(record.thumb_relpath, thumbRelpath, collisions);

    if (displayMove.changed) moves.push(displayMove);
    if (thumbMove.changed) moves.push(thumbMove);
    if (displayMove.missing) missing.push(displayMove);
    if (thumbMove.missing) missing.push(thumbMove);

    updated.push({
      ...record,
      display_relpath: displayRelpath,
      thumb_relpath: thumbRelpath,
      final_category: category,
      source_franchise: row.franquia_publica_pt_br || row.sugestao_franquia_pt_br || record.source_franchise,
      source_folder: row.nome_publico_pt_br || row.sugestao_nome_pt_br || record.source_folder,
      original_name: cleanName(row.nome_original || row.sugestao_nome_pt_br || record.original_name),
    });
  }

  if (collisions.length > 0) {
    throw new Error(`Path collision detected: ${JSON.stringify(collisions.slice(0, 5))}`);
  }

  if (!DRY_RUN && moves.length > 0) {
    const tmp = `${FINAL_MANIFEST}.tmp`;
    await fs.writeFile(tmp, `${updated.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    await fs.rename(tmp, FINAL_MANIFEST);

    for (const move of moves) {
      if (!move.missing && !move.alreadyMoved) await removeEmptyParents(move.oldRelpath);
    }
  }

  console.log(
    JSON.stringify(
      {
        output: OUTPUT,
        manifest: FINAL_MANIFEST,
        queue: QUEUE,
        dry_run: DRY_RUN,
        categories: [...CATEGORIES],
        from_categories: [...FROM_CATEGORIES],
        from_prefixes: FROM_PREFIXES,
        records: records.length,
        changed_records: updated.filter(
          (row, index) =>
            row.display_relpath !== records[index].display_relpath ||
            row.thumb_relpath !== records[index].thumb_relpath,
        ).length,
        path_moves: moves.length,
        missing_inputs: missing.length,
        collisions: collisions.length,
        examples: moves.slice(0, 12),
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
