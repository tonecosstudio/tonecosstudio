import fs from "node:fs/promises";
import path from "node:path";
import { isDirectMainSubjectFolder } from "./catalog-taxonomy-rules.mjs";
import { defaultTelegramRoot } from "./telegram-paths.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
const MAIN_ROOTS = new Set(["anime", "dc", "desenhos-animacao", "filmes-series", "games", "marvel", "outros"]);
const QUARANTINE_ROOTS = new Set(["_duplicados", "_fora-catalogo", "_problemas", "_revisar"]);
const GENERIC_LEAFS = new Set([
  "acessorios",
  "cenas",
  "cenas dioramas",
  "diorama",
  "dioramas",
  "geral",
  "grupo",
  "outros",
  "props",
  "set",
  "sets",
]);
const STUDIO_TERMS = [
  "3d art",
  "3dhexes",
  "3dplanet",
  "ca studio",
  "castudio",
  "c27",
  "c27 studio",
  "designer",
  "estudio",
  "fab365",
  "loot studios",
  "modelador",
  "modeler",
  "patreon",
  "pink studio",
  "rn estudio",
  "studio",
  "studios",
  "wicked",
];

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const ROOT = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
const CATALOG = path.resolve(argValue("catalog", path.join(ROOT, "catalogo")));
const OPS = path.resolve(argValue("ops", path.join(CATALOG, "_controle", "00_operacao_v2")));
const OUT_DIR = path.resolve(argValue("out-dir", path.join(OPS, "05_validacoes")));

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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function isImage(filePath) {
  return IMAGE_EXTS.has(path.extname(filePath).toLowerCase());
}

function isStudioLike(value) {
  const text = normalizeComparable(value);
  if (!text) return false;
  if (/^c\d+\b/.test(text)) return true;
  return STUDIO_TERMS.some((term) => {
    const comparable = normalizeComparable(term);
    return text === comparable || text.startsWith(`${comparable} `) || text.endsWith(` ${comparable}`) || text.includes(` ${comparable} `);
  });
}

function addCount(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function mapRecord(map, key, create) {
  const existing = map.get(key);
  if (existing) return existing;
  const next = create();
  map.set(key, next);
  return next;
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield { type: "dir", full };
      yield* walk(full);
    } else if (entry.isFile() && isImage(entry.name)) {
      yield { type: "image", full };
    }
  }
}

function relpath(full) {
  return path.relative(CATALOG, full).replaceAll("\\", "/");
}

function adjacentDuplicate(parts) {
  for (let index = 1; index < parts.length; index += 1) {
    if (normalizeComparable(parts[index]) === normalizeComparable(parts[index - 1])) return true;
  }
  return false;
}

function isProtectedDirectMainSubjectRelpath(parts) {
  if (parts.length < 3) return false;
  return isDirectMainSubjectFolder({
    category: parts[0],
    franchise: parts[1],
    folder: parts[2],
  });
}

function publicSample(values, limit = 12) {
  return [...values].sort((a, b) => a.localeCompare(b)).slice(0, limit);
}

async function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ];
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const rootCounts = new Map();
  const shallowFiles = [];
  const redundantAdjacentFiles = [];
  const studioDirs = new Map();
  const dirsByParentAndComparable = new Map();
  const leafDirs = new Map();
  const depthCounts = new Map();
  let imageCount = 0;
  let dirCount = 0;

  for await (const item of walk(CATALOG)) {
    const rel = relpath(item.full);
    const parts = rel.split("/").filter(Boolean);
    const root = parts[0] || "";
    if (root === "_controle") continue;

    if (item.type === "dir") {
      dirCount += 1;
      const dirName = parts.at(-1) || "";
      const parent = parts.slice(0, -1).join("/");
      const comparable = normalizeComparable(dirName);

      const siblingKey = `${parent}|${comparable}`;
      const siblingGroup = mapRecord(dirsByParentAndComparable, siblingKey, () => ({
        parent,
        comparable,
        names: new Set(),
        paths: new Set(),
      }));
      siblingGroup.names.add(dirName);
      siblingGroup.paths.add(rel);

      if (MAIN_ROOTS.has(root)) {
        const leafGroup = mapRecord(leafDirs, comparable, () => ({
          comparable,
          names: new Set(),
          paths: new Set(),
          roots: new Set(),
        }));
        leafGroup.names.add(dirName);
        leafGroup.paths.add(rel);
        leafGroup.roots.add(root);
      }

      if (isStudioLike(dirName)) {
        const group = mapRecord(studioDirs, rel, () => ({
          relpath: rel,
          root,
          dirname: dirName,
          images_under: 0,
          examples: new Set(),
        }));
        group.examples.add(rel);
      }
      continue;
    }

    imageCount += 1;
    addCount(rootCounts, root || "(sem raiz)");
    addCount(depthCounts, String(parts.length));

    if (MAIN_ROOTS.has(root) && parts.length === 3) shallowFiles.push(rel);
    if (adjacentDuplicate(parts.slice(0, -1)) && !isProtectedDirectMainSubjectRelpath(parts)) {
      redundantAdjacentFiles.push(rel);
    }

    for (let index = 1; index < parts.length; index += 1) {
      const segment = parts[index - 1];
      if (!isStudioLike(segment)) continue;
      const studioPath = parts.slice(0, index).join("/");
      const group = mapRecord(studioDirs, studioPath, () => ({
        relpath: studioPath,
        root,
        dirname: segment,
        images_under: 0,
        examples: new Set(),
      }));
      group.images_under += 1;
      group.examples.add(rel);
    }
  }

  const duplicateSiblingDirs = [...dirsByParentAndComparable.values()]
    .filter((group) => group.names.size > 1)
    .map((group) => ({
      parent: group.parent,
      comparable: group.comparable,
      variants: group.names.size,
      names: publicSample(group.names).join(" | "),
      paths: publicSample(group.paths).join(" | "),
    }))
    .sort((a, b) => b.variants - a.variants || a.parent.localeCompare(b.parent));

  const duplicateLeafDirs = [...leafDirs.values()]
    .filter((group) => group.paths.size > 1 && !GENERIC_LEAFS.has(group.comparable))
    .map((group) => ({
      comparable: group.comparable,
      roots: publicSample(group.roots).join(" | "),
      paths_count: group.paths.size,
      names: publicSample(group.names).join(" | "),
      paths: publicSample(group.paths).join(" | "),
    }))
    .sort((a, b) => b.paths_count - a.paths_count || a.comparable.localeCompare(b.comparable));

  const studioDirRows = [...studioDirs.values()]
    .map((group) => ({
      relpath: group.relpath,
      root: group.root,
      dirname: group.dirname,
      images_under: group.images_under,
      examples: publicSample(group.examples, 8).join(" | "),
    }))
    .sort((a, b) => b.images_under - a.images_under || a.relpath.localeCompare(b.relpath));

  const activeRoots = Object.fromEntries([...rootCounts.entries()].filter(([root]) => !root.startsWith("_")).sort((a, b) => b[1] - a[1]));
  const quarantineRoots = Object.fromEntries([...rootCounts.entries()].filter(([root]) => QUARANTINE_ROOTS.has(root)).sort((a, b) => b[1] - a[1]));
  const unexpectedRoots = Object.fromEntries(
    [...rootCounts.entries()]
      .filter(([root]) => !MAIN_ROOTS.has(root) && !QUARANTINE_ROOTS.has(root) && root !== "_controle")
      .sort((a, b) => b[1] - a[1]),
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `catalog_structure_suspects_${stamp}.json`);
  const shallowCsv = path.join(OUT_DIR, `catalog_structure_shallow_files_${stamp}.csv`);
  const duplicateSiblingCsv = path.join(OUT_DIR, `catalog_structure_duplicate_sibling_dirs_${stamp}.csv`);
  const duplicateLeafCsv = path.join(OUT_DIR, `catalog_structure_duplicate_leaf_dirs_${stamp}.csv`);
  const studioCsv = path.join(OUT_DIR, `catalog_structure_studio_like_dirs_${stamp}.csv`);

  const summary = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    catalog: CATALOG,
    images: imageCount,
    directories: dirCount,
    active_roots: activeRoots,
    quarantine_roots: quarantineRoots,
    unexpected_roots: unexpectedRoots,
    path_depth_counts: Object.fromEntries([...depthCounts.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    shallow_active_files: shallowFiles.length,
    redundant_adjacent_files: redundantAdjacentFiles.length,
    duplicate_sibling_dir_groups: duplicateSiblingDirs.length,
    duplicate_leaf_dir_groups: duplicateLeafDirs.length,
    studio_like_dirs: studioDirRows.length,
    examples: {
      shallow_active_files: shallowFiles.slice(0, 60),
      redundant_adjacent_files: redundantAdjacentFiles.slice(0, 60),
      duplicate_sibling_dirs: duplicateSiblingDirs.slice(0, 40),
      duplicate_leaf_dirs: duplicateLeafDirs.slice(0, 40),
      studio_like_dirs: studioDirRows.slice(0, 40),
    },
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeCsv(
    shallowCsv,
    shallowFiles.map((file) => ({ relpath: file })),
    ["relpath"],
  );
  await writeCsv(duplicateSiblingCsv, duplicateSiblingDirs, ["parent", "comparable", "variants", "names", "paths"]);
  await writeCsv(duplicateLeafCsv, duplicateLeafDirs, ["comparable", "roots", "paths_count", "names", "paths"]);
  await writeCsv(studioCsv, studioDirRows, ["relpath", "root", "dirname", "images_under", "examples"]);

  console.log(
    JSON.stringify(
      {
        ...summary,
        json: jsonPath,
        shallow_csv: shallowCsv,
        duplicate_sibling_csv: duplicateSiblingCsv,
        duplicate_leaf_csv: duplicateLeafCsv,
        studio_csv: studioCsv,
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
