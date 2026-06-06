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
const DRY_RUN = argFlag("dry-run");

const CATEGORY_ALIASES = new Map(
  Object.entries({
    acessorios: "acessorios",
    accessories: "acessorios",
    anime: "anime",
    animation: "animacao",
    cartoon: "desenhos",
    cartoons: "desenhos",
    desenhos: "desenhos",
    comics: "quadrinhos",
    comic: "quadrinhos",
    hq: "quadrinhos",
    decor: "decoracao",
    decoracao: "decoracao",
    game: "games",
    games: "games",
    jogo: "games",
    jogos: "games",
    filmes: "filmes",
    movie: "filmes",
    movies: "filmes",
    musica: "musica",
    original: "original",
    props: "props",
    "sci fi": "sci-fi",
    "sci-fi": "sci-fi",
    series: "series",
    sports: "esportes",
    tabletop: "tabletop",
    toy: "brinquedos",
    toys: "brinquedos",
    tv: "tv",
    veiculos: "veiculos",
    vtubers: "vtubers",
  }),
);

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

function canonicalCategory(value) {
  const comparable = normalizeComparable(value);
  return CATEGORY_ALIASES.get(comparable) || slugPart(value, "outros");
}

function catalogRelParts(record) {
  const rel = String(record.catalog_relpath || record.original_catalog_relpath || "");
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  return {
    category: record.category || record.source_category || parts[0] || "outros",
    franchise: record.franchise || record.source_franchise || parts[1] || "sem franquia",
    folder: record.folder || record.source_folder || parts[2] || "geral",
    filename: record.filename || record.source_filename || parts.at(-1) || record.source_name || "item",
  };
}

function dragonBallCharacterFranchise(value) {
  const text = cleanName(value);
  const match = text.match(/^dragon\s+ball\s+(.+)$/i);
  if (!match) return "";

  const character = cleanName(match[1]);
  const normalized = normalizeComparable(character);
  if (!character || ["style", "xenoverse"].includes(normalized)) return "";
  return character;
}

function curatedCatalogRelParts(record) {
  const parts = catalogRelParts(record);
  const category = canonicalCategory(parts.category);
  const dragonBallCharacter = dragonBallCharacterFranchise(parts.franchise);

  if (category === "anime" && dragonBallCharacter) {
    return {
      ...parts,
      franchise: "dragon ball",
      folder: parts.folder || dragonBallCharacter,
    };
  }

  return parts;
}

function shouldFoldDragonBallFranchise(record) {
  const parts = catalogRelParts(record);
  return canonicalCategory(parts.category) === "anime" && Boolean(dragonBallCharacterFranchise(parts.franchise));
}

function normalizedRelpaths(record) {
  const parts = curatedCatalogRelParts(record);
  const category = canonicalCategory(parts.category);
  const franchise = slugPart(parts.franchise, "sem-franquia");
  const folder = slugPart(parts.folder, "geral");
  const base = slugPart(cleanName(parts.filename), "item");
  const identity =
    String(record.message_id || "").trim() ||
    String(record.source_sha256 || record.sha256 || "").slice(0, 12) ||
    slugPart(record.source_name, "source");
  const filename = base.includes(identity) ? `${base}.webp` : `${base}-${identity}.webp`;
  const common = path.join(category, franchise, folder, filename).replaceAll("\\", "/");

  return {
    display: `display/${common}`,
    thumb: `thumb/${common}`,
  };
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function moveRelpath(oldRelpath, newRelpath) {
  const oldAbs = path.join(OUTPUT, oldRelpath);
  const newAbs = path.join(OUTPUT, newRelpath);
  if (oldAbs === newAbs) return { changed: false, missing: false };

  if (!(await exists(oldAbs))) {
    return { changed: true, missing: true, oldRelpath, newRelpath };
  }

  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(newAbs), { recursive: true });
    if (!(await exists(newAbs))) {
      await fs.rename(oldAbs, newAbs);
    }
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
  const moves = [];
  const missing = [];

  const updated = [];
  for (const record of records) {
    if (!shouldFoldDragonBallFranchise(record)) {
      updated.push(record);
      continue;
    }

    const relpaths = normalizedRelpaths(record);
    const parts = curatedCatalogRelParts(record);
    const displayMove = await moveRelpath(record.display_relpath, relpaths.display);
    const thumbMove = await moveRelpath(record.thumb_relpath, relpaths.thumb);

    if (displayMove.changed) moves.push(displayMove);
    if (thumbMove.changed) moves.push(thumbMove);
    if (displayMove.missing) missing.push(displayMove);
    if (thumbMove.missing) missing.push(thumbMove);

    updated.push({
      ...record,
      display_relpath: relpaths.display,
      thumb_relpath: relpaths.thumb,
      final_category: canonicalCategory(parts.category),
      source_franchise: parts.franchise,
      source_folder: parts.folder,
      source_filename: parts.filename,
      original_name: cleanName(parts.folder || parts.filename || record.source_name),
    });
  }

  if (!DRY_RUN && moves.length > 0) {
    const tmp = `${FINAL_MANIFEST}.tmp`;
    await fs.writeFile(tmp, `${updated.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    await fs.rename(tmp, FINAL_MANIFEST);

    for (const move of moves) {
      if (!move.missing) await removeEmptyParents(move.oldRelpath);
    }
  }

  console.log(
    JSON.stringify(
      {
        output: OUTPUT,
        manifest: FINAL_MANIFEST,
        dry_run: DRY_RUN,
        records: records.length,
        changed_records: updated.filter(
          (row, index) =>
            row.display_relpath !== records[index].display_relpath ||
            row.thumb_relpath !== records[index].thumb_relpath,
        ).length,
        path_moves: moves.length,
        missing_inputs: missing.length,
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
