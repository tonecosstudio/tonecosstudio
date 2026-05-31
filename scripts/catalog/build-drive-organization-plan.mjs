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

const COLLECTION_SOURCES = new Set(["thundercats"]);
const REVIEW_CATEGORIES = new Set(["revisao", "review", "sem-nome"]);
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

function isGenericName(value) {
  const normalized = normalizeComparable(stripExtension(value));
  return (
    !normalized ||
    /^photo \d{4}/.test(normalized) ||
    /^image ?\d*$/.test(normalized) ||
    /^figura ?\d*$/.test(normalized) ||
    /^desconhecido$/.test(normalized) ||
    /^\d+$/.test(normalized)
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
    const override = DRIVE_FILE_OVERRIDES[id] || {};
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
      sourceTitle: item.sourceTitle || item.franchise || item.source_title || null,
      category: item.category || null,
      subcategory: item.subcategory || null,
      mediaType: item.mediaType || item.media_type || null,
      sourceFolderName: item.sourceFolderName || item.source_folder_name || null,
      sourceDrivePath: item.sourceDrivePath || item.source_drive_path || null,
      tags: item.tags || [],
      notes: item.notes || null,
      ...override,
      overrideApplied: Boolean(DRIVE_FILE_OVERRIDES[id]),
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
  const characterName = inferFromName(row);
  const sourceTitle = row.sourceTitle || row.sourceFolderName || "Catalogo Geral";
  const category = row.category || "revisao";
  const subcategory = row.subcategory || slugSegment(sourceTitle);
  const originalGeneric = isGenericName(row.originalName);
  const needsReview =
    originalGeneric ||
    !characterName ||
    REVIEW_CATEGORIES.has(normalizeComparable(category)) ||
    (row.tags || []).some((tag) => String(tag).startsWith("needs-"));

  const sourceSlug = slugSegment(sourceTitle);
  const categorySlug = slugSegment(category);
  const collection = COLLECTION_SOURCES.has(sourceSlug);

  let status = "ready_to_organize";
  if (needsReview) status = "needs_review";

  let destinationFolder;
  if (status === "needs_review") {
    destinationFolder = originalGeneric && characterName
      ? "01_REVISAR/confirmar-identificacao"
      : originalGeneric
      ? "01_REVISAR/sem-nome-ou-generico"
      : `01_REVISAR/${categorySlug}`;
  } else if (collection) {
    destinationFolder = `03_COLECOES/${displaySegment(sourceTitle)}`;
  } else {
    destinationFolder = `02_CATALOGO_GERAL/${displaySegment(category)}/${displaySegment(sourceTitle)}`;
  }

  const parts = [
    displaySegment(sourceTitle, "Catalogo Geral"),
    displaySegment(characterName, "Sem Nome"),
    row.variantName ? displaySegment(row.variantName) : null,
  ].filter(Boolean);

  const proposedName = `${parts.join(" - ")}.${extension(row.originalName, row.mimeType)}`;

  return {
    ...row,
    characterName,
    sourceTitle,
    category,
    subcategory,
    mediaType: row.mediaType || "other",
    status,
    destinationFolder,
    proposedName,
    originalGeneric,
    collection,
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

function toCsvValue(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const allRows = [];
  for (const file of MANIFESTS) {
    try {
      allRows.push(...(await readManifest(file)));
    } catch (error) {
      console.warn(`Skipping ${file}: ${error.message}`);
    }
  }

  const merged = mergeRows(allRows);
  const planned = withDuplicateGroups(merged.map(classify)).sort((a, b) => {
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
