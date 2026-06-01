import fs from "node:fs/promises";
import path from "node:path";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const DEFAULT_MANIFESTS = [
  "tmp/drive-folder-items.json",
  "tmp/catalog-identified-drive-items.json",
  "tmp/catalog-root-generic-identified-items.json",
  "tmp/catalog-root-drive-generic-items.json",
];

const MANIFESTS = argValue("manifests", DEFAULT_MANIFESTS.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const REPORT_DIR = argValue("report-dir", "tmp/drive-organization");
const OVERRIDES_PATH = argValue("overrides", "scripts/catalog/drive-curation-overrides.json");

const COLLECTION_SOURCES = new Set(["inimigos da vizinhanca", "quarteto fantastico", "terror", "thundercats"]);
const REVIEW_CATEGORIES = new Set(["revisao", "review", "sem-nome"]);
const GENERIC_PATH_SEGMENTS = new Set([
  "catalogo",
  "animes e desenhos",
  "animes",
  "classicos",
  "outros",
  "filmes e series",
  "01 terror",
  "02 series",
  "04 classicos antigos",
  "05 acao",
  "games",
  "00 fliperama",
  "tokusatsu e cultura japonesa",
  "colecao tonecos",
  "marvel dc",
  "marvel",
  "dc",
  "equipes e grupos",
  "herois individuais",
  "personagens extras e outros",
  "viloes",
  "viloes outros",
  "vilões inimigos da vizinhanca",
  "dioramas e confrontos",
  "dioramas do homem aranha",
]);
const DISPLAY_ALIASES = new Map(
  Object.entries({
    "ataque de tita": "Attack on Titan",
    "axterix e obelix": "Asterix e Obelix",
    berseck: "Berserk",
    batman: "Batman",
    brolly: "Broly",
    "boku no hero": "My Hero Academia",
    cheetara: "Cheetara",
    "chun lii": "Chun-Li",
    "cavaleiros do zodiaco": "Saint Seiya",
    cdz: "Saint Seiya",
    chainsawman: "Chainsaw Man",
    "capitao america": "Capitao America",
    "db super": "Dragon Ball Super",
    deathstrocke: "Deathstroke",
    "dr destino": "Doutor Destino",
    "dr octopus": "Doutor Octopus",
    "full metal": "Fullmetal Alchemist",
    gotenksgogeta: "Gotenks e Gogeta",
    "gotenks gogeta": "Gotenks e Gogeta",
    "godzila kingkong": "Godzilla e King Kong",
    "i t": "It",
    "indiana jones": "Indiana Jones",
    jil: "Jill Valentine",
    "lion o": "Lion-O",
    lol: "League of Legends",
    "mumm ra": "Mumm-Ra",
    "mulher hulk": "Mulher-Hulk",
    namor: "Namor",
    picolo: "Piccolo",
    "poderoso chefao": "O Poderoso Chefao",
    scopion: "Scorpion",
    snarf: "Snarf",
    "sreet fighter": "Street Fighter",
    superman: "Superman",
    "the king of fighter": "The King of Fighters",
    "tomb rader": "Tomb Raider",
    vegeta: "Vegeta",
    xmen: "X-Men",
    "x men": "X-Men",
    zatana: "Zatanna",
  }),
);
const DRIVE_FILE_OVERRIDES = {
  "1AyEzy7At9_6L69uc1kUtcdTaiLY9SHJH": {
    characterName: "Cheetara",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1vEfnJrGMpH8_Yo2p3gd9Ugzxc1PSVU7m": {
    characterName: "Lion-O",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1BLsVWqr258ZNmfmtTF7SVSiU2E3M34bQ": {
    characterName: "Mumm-Ra",
    variantName: "Forma Mumificada",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U": {
    characterName: "Mumm-Ra",
    variantName: "Forma Poderosa",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1B8Bg1dP_3Ej27tuYcRVFKjV0dZU-n0aY": {
    characterName: "Panthro",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1cv4BPldFIwYppLL-WItmpwPdxG-oGyIu": {
    characterName: "Snarf",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "14psqrPNUYJt0kaFYkcc-b3YBbTz6lzLW": {
    characterName: "Tygra",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
  "1ZVQQr5KPcS2-yS8pCPj_LFL1Ow5Kzw8F": {
    characterName: "WilyKit & WilyKat",
    sourceTitle: "ThunderCats",
    category: "series",
    subcategory: "thundercats",
    mediaType: "series",
  },
};
let driveFileOverrides = { ...DRIVE_FILE_OVERRIDES };

async function loadCurationOverrides(filePath) {
  if (!filePath) return {};

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.files || parsed;
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function stripExtension(value) {
  return String(value || "").replace(/\.[a-z0-9]+$/i, "");
}

function extension(value, mimeType) {
  const match = String(value || "").match(/\.([a-z0-9]+)$/i);
  if (match) return match[1].toLowerCase();
  if (String(mimeType || "").includes("png")) return "png";
  if (String(mimeType || "").includes("webp")) return "webp";
  return "jpg";
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

function slugSegment(value, fallback = "sem-nome") {
  return normalizeComparable(value).replace(/ /g, "-") || fallback;
}

function displaySegment(value, fallback = "Sem Nome") {
  const cleaned = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function canonicalDisplay(value, fallback = "Sem Nome") {
  const displayed = displaySegment(value, fallback);
  return DISPLAY_ALIASES.get(normalizeComparable(displayed)) || displayed;
}

function cleanDriveSegment(value) {
  return canonicalDisplay(value).replace(/\s+Shared$/i, "").trim();
}

function cleanPathParts(value) {
  const parts = String(value || "")
    .split("/")
    .map(cleanDriveSegment)
    .filter(Boolean);
  return normalizeComparable(parts[0]) === "catalogo" ? parts.slice(1) : parts;
}

function firstUsefulPart(parts, startIndex = 0) {
  return parts.slice(startIndex).find((part) => !GENERIC_PATH_SEGMENTS.has(normalizeComparable(part))) || null;
}

function firstUsefulPartAfter(parts, sourceIndex) {
  return parts
    .slice(sourceIndex + 1)
    .find((part) => !GENERIC_PATH_SEGMENTS.has(normalizeComparable(part))) || null;
}

function lastUsefulFolderPart(parts) {
  const folders = parts.slice(0, -1);
  for (let index = folders.length - 1; index >= 0; index--) {
    const part = folders[index];
    if (!GENERIC_PATH_SEGMENTS.has(normalizeComparable(part))) return part;
  }
  return null;
}

function indexOfNormalized(parts, names) {
  const normalizedNames = new Set(names.map((name) => normalizeComparable(name)));
  return parts.findIndex((part) => normalizedNames.has(normalizeComparable(part)));
}

function indexOfCanonical(parts, title, startIndex = 0) {
  return parts.findIndex(
    (part, index) => index >= startIndex && normalizeComparable(canonicalDisplay(part)) === normalizeComparable(title),
  );
}

function inferTaxonomyFromPath(row) {
  const parts = cleanPathParts(row.sourceDrivePath || row.source_drive_path);
  const folders = parts.slice(0, -1);
  const top = normalizeComparable(folders[0]);
  const second = normalizeComparable(folders[1]);
  const third = normalizeComparable(folders[2]);

  if (!parts.length) return {};

  if (top === "colecao tonecos") {
    const sourceTitle = canonicalDisplay(firstUsefulPart(folders, 1) || folders[1] || "Colecao Tonecos");
    return {
      category: "colecoes",
      subcategory: slugSegment(sourceTitle),
      mediaType: "other",
      sourceTitle,
      collectionCandidate: true,
      pathCharacterName: canonicalDisplay(lastUsefulFolderPart(parts) || stripExtension(parts.at(-1))),
    };
  }

  if (top === "games") {
    const sourceTitle = canonicalDisplay(firstUsefulPart(folders, 1) || "Games");
    const sourceIndex = indexOfCanonical(folders, sourceTitle, 1);
    return {
      category: "jogos",
      subcategory: slugSegment(sourceTitle),
      mediaType: "game",
      sourceTitle,
      pathCharacterName: canonicalDisplay(firstUsefulPartAfter(folders, sourceIndex) || ""),
    };
  }

  if (top === "animes e desenhos") {
    const sourceStart = second === "animes" || second === "classicos" || second === "outros" ? 2 : 1;
    const sourceTitle = canonicalDisplay(firstUsefulPart(folders, sourceStart) || "Animes e Desenhos");
    const sourceIndex = folders.findIndex(
      (part, index) => index >= sourceStart && normalizeComparable(canonicalDisplay(part)) === normalizeComparable(sourceTitle),
    );
    return {
      category: "animes",
      subcategory: slugSegment(sourceTitle),
      mediaType: "anime",
      sourceTitle,
      pathCharacterName: canonicalDisplay(firstUsefulPartAfter(folders, sourceIndex) || ""),
    };
  }

  if (top === "tokusatsu e cultura japonesa") {
    const sourceTitle = canonicalDisplay(firstUsefulPart(folders, 1) || "Tokusatsu");
    const sourceIndex = indexOfCanonical(folders, sourceTitle, 1);
    return {
      category: "series",
      subcategory: slugSegment(sourceTitle),
      mediaType: "tokusatsu",
      sourceTitle,
      pathCharacterName: canonicalDisplay(firstUsefulPartAfter(folders, sourceIndex) || ""),
    };
  }

  if (top === "fisiculturistas") {
    return {
      category: "outros",
      subcategory: "fisiculturistas",
      mediaType: "other",
      sourceTitle: "Fisiculturistas",
      pathCharacterName: null,
    };
  }

  if (top === "filmes e series") {
    if (second === "02 series") {
      const sourceTitle = canonicalDisplay(firstUsefulPart(folders, 2) || "Series");
      const sourceIndex = folders.findIndex(
        (part, index) => index >= 2 && normalizeComparable(canonicalDisplay(part)) === normalizeComparable(sourceTitle),
      );
      return {
        category: "series",
        subcategory: slugSegment(sourceTitle),
        mediaType: "series",
        sourceTitle,
        pathCharacterName: canonicalDisplay(firstUsefulPartAfter(folders, sourceIndex) || ""),
      };
    }

    if (second === "dc") {
      const sourceTitle = "DC";
      return {
        category: "quadrinhos",
        subcategory: slugSegment(sourceTitle),
        mediaType: "comic",
        sourceTitle,
        pathCharacterName: canonicalDisplay(firstUsefulPart(folders, 2) || ""),
      };
    }

    if (second === "marvel dc" || third === "marvel") {
      const baseIndex = third === "marvel" ? 3 : 2;
      const sourceIndex = [
        indexOfNormalized(folders, ["X-Men", "xmen"]),
        indexOfNormalized(folders, ["Vingadores"]),
        indexOfNormalized(folders, ["Quarteto Fantastico"]),
        indexOfNormalized(folders, ["Homem Aranha"]),
      ]
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0] ?? -1;
      const sourceTitle = canonicalDisplay(sourceIndex >= 0 ? folders[sourceIndex] : "Marvel");
      return {
        category: "quadrinhos",
        subcategory: slugSegment(sourceTitle),
        mediaType: "comic",
        sourceTitle,
        pathCharacterName: canonicalDisplay(
          sourceIndex >= 0 ? firstUsefulPartAfter(folders, sourceIndex) || "" : firstUsefulPart(folders, baseIndex) || "",
        ),
      };
    }

    const sourceTitle = canonicalDisplay(firstUsefulPart(folders, 1) || "Filmes e Series");
    const sourceIndex = folders.findIndex(
      (part, index) => index >= 1 && normalizeComparable(canonicalDisplay(part)) === normalizeComparable(sourceTitle),
    );
    return {
      category: second === "01 terror" || second === "04 classicos antigos" || second === "05 acao" ? "filmes" : "filmes",
      subcategory: slugSegment(sourceTitle),
      mediaType: "movie",
      sourceTitle,
      pathCharacterName: canonicalDisplay(firstUsefulPartAfter(folders, sourceIndex) || ""),
    };
  }

  return {
    pathCharacterName: canonicalDisplay(lastUsefulFolderPart(parts) || ""),
  };
}

function isGenericName(value) {
  const normalized = normalizeComparable(stripExtension(value));
  return (
    !normalized ||
    normalized === "sem nome" ||
    normalized === "unnamed" ||
    normalized === "images" ||
    normalized === "copy" ||
    /^[a-z]$/.test(normalized) ||
    /^[a-f0-9]{16,}$/.test(normalized) ||
    /^photo \d{4}/.test(normalized) ||
    /^img \d+/.test(normalized) ||
    /^screenshot /.test(normalized) ||
    /^image(\s|$)/.test(normalized) ||
    /^image processing/.test(normalized) ||
    /^il \d+xn/.test(normalized) ||
    /^image ?\d*$/.test(normalized) ||
    /^figura ?\d*$/.test(normalized) ||
    /^desconhecido$/.test(normalized) ||
    /^\d+$/.test(normalized) ||
    /^\d+\s+copy$/.test(normalized) ||
    /^\d{8,}\s+\d+$/.test(normalized)
  );
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  return data.items || data.files || data.results || [];
}

async function readManifest(file) {
  const raw = await fs.readFile(file, "utf8");
  return normalizeRows(JSON.parse(raw)).map((item) => {
    const id = item.id || item.fileId || item.file_id;
    const override = driveFileOverrides[id] || {};
    const pathTaxonomy = inferTaxonomyFromPath(item);
    return {
      manifest: file,
      id,
      originalName: item.name || item.title || item.file_name || "",
      mimeType: item.mime_type || item.mimeType || item.mime || null,
      url: item.url || item.link || item.webViewLink || null,
      downloadUrl: item.download_url || item.downloadUrl || null,
      size: item.size || null,
      characterName: item.characterName || null,
      variantName: item.variantName || null,
      sourceTitle: item.sourceTitle || item.franchise || item.source_title || pathTaxonomy.sourceTitle || null,
      category: item.category || pathTaxonomy.category || null,
      subcategory: item.subcategory || pathTaxonomy.subcategory || null,
      mediaType: item.mediaType || item.media_type || pathTaxonomy.mediaType || null,
      sourceFolderName: item.sourceFolderName || item.source_folder_name || null,
      sourceDrivePath: item.sourceDrivePath || item.source_drive_path || null,
      pathCharacterName: pathTaxonomy.pathCharacterName || null,
      collectionCandidate:
        pathTaxonomy.collectionCandidate ||
        Boolean(driveFileOverrides[id] && normalizeComparable(override.sourceTitle) === "thundercats"),
      tags: item.tags || [],
      notes: item.notes || null,
      ...override,
      overrideApplied: Boolean(driveFileOverrides[id]),
    };
  });
}

function inferFromName(row) {
  const base = stripExtension(row.originalName)
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (row.characterName && !isGenericName(row.characterName)) {
    return row.characterName;
  }
  if (!isGenericName(base)) return base;
  if (row.pathCharacterName && !isGenericName(row.pathCharacterName)) return row.pathCharacterName;
  return null;
}

function mergeRows(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row.id) continue;
    const current = byId.get(row.id);
    if (!current) {
      byId.set(row.id, row);
      continue;
    }

    const merged = { ...current };
    const preferText = (field, isGeneric = () => false) => {
      const incoming = row[field];
      const existing = merged[field];
      if (!incoming) return;
      if (!existing || isGeneric(existing)) {
        merged[field] = incoming;
        return;
      }
      if (!isGeneric(incoming) && normalizeComparable(existing).startsWith("catalogo")) {
        merged[field] = incoming;
      }
    };

    for (const field of ["originalName", "mimeType", "url", "downloadUrl", "size", "sourceFolderName", "sourceDrivePath"]) {
      if (!merged[field] && row[field]) merged[field] = row[field];
    }

    preferText("characterName", isGenericName);
    preferText("variantName", isGenericName);
    preferText("sourceTitle", (value) => ["catalogo raiz", "catalogo geral"].includes(normalizeComparable(value)));
    preferText("category", (value) => REVIEW_CATEGORIES.has(normalizeComparable(value)));
    preferText("subcategory", (value) => ["sem nome", "revisao"].includes(normalizeComparable(value)));
    preferText("mediaType", (value) => normalizeComparable(value) === "other");

    merged.overrideApplied = current.overrideApplied || row.overrideApplied || false;
    merged.manifests = Array.from(new Set([...(current.manifests || [current.manifest]), row.manifest]));
    merged.tags = Array.from(new Set([...(current.tags || []), ...(row.tags || [])]));
    merged.notes = [current.notes, row.notes].filter(Boolean).join(" | ") || null;
    byId.set(row.id, merged);
  }
  return Array.from(byId.values());
}

function classify(row) {
  const inferredCharacter = inferFromName(row);
  const characterName = inferredCharacter ? canonicalDisplay(inferredCharacter) : null;
  const sourceTitle = canonicalDisplay(row.sourceTitle || row.sourceFolderName || "Catalogo Geral", "Catalogo Geral");
  const category = canonicalDisplay(row.category || "revisao", "revisao");
  const subcategory = row.subcategory || slugSegment(sourceTitle);
  const originalGeneric = isGenericName(row.originalName);
  const genericWithoutPathIdentity = originalGeneric && !characterName;
  const needsReview =
    genericWithoutPathIdentity ||
    !characterName ||
    REVIEW_CATEGORIES.has(normalizeComparable(category)) ||
    (row.tags || []).some((tag) => String(tag).startsWith("needs-"));

  const categorySlug = slugSegment(category);
  const collection = row.collectionCandidate;
  const sourceFolder = displaySegment(sourceTitle, "Catalogo Geral");
  const characterFolder = displaySegment(characterName, "Sem Nome");

  let status = "ready_to_organize";
  if (needsReview) status = "needs_review";

  let destinationFolder;
  if (status === "needs_review") {
    if (originalGeneric && characterName) {
      destinationFolder = `01_REVISAR/confirmar-identificacao/${displaySegment(category)}/${sourceFolder}/${characterFolder}`;
    } else if (originalGeneric) {
      destinationFolder = `01_REVISAR/sem-nome-ou-generico/${displaySegment(category)}/${sourceFolder}`;
    } else {
      destinationFolder = `01_REVISAR/${categorySlug}/${sourceFolder}/${characterFolder}`;
    }
  } else if (collection) {
    destinationFolder = `03_COLECOES/${sourceFolder}/${characterFolder}`;
  } else {
    destinationFolder = `02_CATALOGO_GERAL/${displaySegment(category)}/${sourceFolder}/${characterFolder}`;
  }

  const variantName = row.variantName ? canonicalDisplay(row.variantName) : null;
  const parts = [sourceFolder];
  if (characterName && normalizeComparable(characterName) !== normalizeComparable(sourceTitle)) {
    parts.push(characterFolder);
  }
  if (variantName) parts.push(displaySegment(variantName));

  const proposedName = `${parts.join(" - ")}.${extension(row.originalName, row.mimeType)}`;

  return {
    ...row,
    characterName,
    variantName,
    sourceTitle,
    category,
    subcategory,
    mediaType: row.mediaType || "other",
    status,
    destinationFolder,
    proposedName,
    originalGeneric,
    genericWithoutPathIdentity,
    collection,
    curationLevel: status === "ready_to_organize" ? "path-curated" : "needs-review",
  };
}

function withDuplicateGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = [
      normalizeComparable(row.sourceTitle),
      normalizeComparable(row.characterName),
      normalizeComparable(row.variantName),
      normalizeComparable(stripExtension(row.originalName)),
      row.size || "",
    ].join("|");
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  }

  return rows.map((row) => {
    const key = [
      normalizeComparable(row.sourceTitle),
      normalizeComparable(row.characterName),
      normalizeComparable(row.variantName),
      normalizeComparable(stripExtension(row.originalName)),
      row.size || "",
    ].join("|");
    const group = groups.get(key) || [];
    const duplicateOf = group.length > 1 && group[0].id !== row.id ? group[0].id : null;
    return {
      ...row,
      duplicateGroupKey: group.length > 1 ? key : null,
      duplicateOf,
      status: duplicateOf ? "duplicate_candidate" : row.status,
      destinationFolder: duplicateOf ? "90_DUPLICATAS" : row.destinationFolder,
    };
  });
}

function appendNameSuffix(fileName, suffix) {
  const ext = fileName.match(/(\.[a-z0-9]+)$/i)?.[1] || "";
  const base = ext ? fileName.slice(0, -ext.length) : fileName;
  return `${base} - ${suffix}${ext}`;
}

function ensureUniqueNames(rows) {
  const counters = new Map();
  return rows.map((row) => {
    const key = `${row.destinationFolder.toLowerCase()}|${row.proposedName.toLowerCase()}`;
    const count = (counters.get(key) || 0) + 1;
    counters.set(key, count);

    if (count === 1) return row;
    return {
      ...row,
      proposedName: appendNameSuffix(row.proposedName, String(count).padStart(2, "0")),
      nameCollisionResolved: true,
    };
  });
}

function toCsvValue(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  driveFileOverrides = {
    ...DRIVE_FILE_OVERRIDES,
    ...(await loadCurationOverrides(OVERRIDES_PATH)),
  };

  const allRows = [];
  for (const file of MANIFESTS) {
    try {
      allRows.push(...(await readManifest(file)));
    } catch (error) {
      console.warn(`Skipping ${file}: ${error.message}`);
    }
  }

  const merged = mergeRows(allRows);
  const planned = ensureUniqueNames(withDuplicateGroups(merged.map(classify))).sort((a, b) => {
    const status = a.status.localeCompare(b.status);
    if (status !== 0) return status;
    return a.destinationFolder.localeCompare(b.destinationFolder) || a.proposedName.localeCompare(b.proposedName);
  });

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, "drive-organization-plan.json");
  const csvPath = path.join(REPORT_DIR, "drive-organization-plan.csv");
  const summary = {
    generatedAt: new Date().toISOString(),
    manifests: MANIFESTS,
    overridesPath: OVERRIDES_PATH,
    overridesApplied: planned.filter((row) => row.overrideApplied).length,
    sourceRows: allRows.length,
    uniqueFiles: planned.length,
    byStatus: planned.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {}),
    byDestinationFolder: planned.reduce((acc, row) => {
      acc[row.destinationFolder] = (acc[row.destinationFolder] || 0) + 1;
      return acc;
    }, {}),
  };

  await fs.writeFile(reportPath, `${JSON.stringify({ summary, items: planned }, null, 2)}\n`);

  const columns = [
    "status",
    "id",
    "originalName",
    "proposedName",
    "destinationFolder",
    "characterName",
    "variantName",
    "sourceTitle",
    "category",
    "subcategory",
    "mediaType",
    "duplicateOf",
    "sourceDrivePath",
    "url",
    "notes",
  ];
  const csv = [
    columns.join(","),
    ...planned.map((row) => columns.map((column) => toCsvValue(row[column])).join(",")),
  ].join("\n");
  await fs.writeFile(csvPath, `${csv}\n`);

  console.log(JSON.stringify({ summary, reportPath, csvPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
