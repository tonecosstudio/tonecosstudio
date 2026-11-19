import fs from "node:fs/promises";
import path from "node:path";
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
    process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const OUT_DIR = path.resolve(
  argValue("out-dir", path.join(OUTPUT, "manifests", "site_import")),
);
const STORAGE_PREFIX = argValue("storage-prefix", "catalog-webp-final");
const BUILD_CONCURRENCY = Number.parseInt(argValue("concurrency", "64"), 10);

const JSON_OUT = path.join(OUT_DIR, "telegram_webp_site_import_plan.json");
const CSV_OUT = path.join(OUT_DIR, "telegram_webp_site_import_plan.csv");
const READY_CSV_OUT = path.join(OUT_DIR, "telegram_webp_site_import_ready.csv");
const SUMMARY_OUT = path.join(
  OUT_DIR,
  "telegram_webp_site_import_summary.json",
);

const CSV_COLUMNS = [
  "import_id",
  "status",
  "reject_reason",
  "source_type",
  "source_file_name",
  "message_id",
  "original_sha256",
  "storage_bucket",
  "storage_path",
  "thumbnail_storage_path",
  "display_relpath",
  "thumb_relpath",
  "name",
  "proposed_name",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "source_type_sugerido",
  "media_type",
  "category",
  "subcategory",
  "taxonomy_slug",
  "catalog_visibility",
  "duplicate_status",
  "name_review_status",
  "visual_review_status",
  "tags",
  "image_width",
  "image_height",
  "image_format",
  "display_bytes",
  "thumb_bytes",
];
const PUBLIC_TAG_STOPWORDS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "the",
]);
const PUBLIC_OBJECT_TAG_ALIASES = {
  cabeca: "mascara",
  capacete: "mascara",
  capacetes: "mascara",
  chifre: "mascara",
  chifres: "mascara",
  coroa: "mascara",
  cowl: "mascara",
  helmet: "mascara",
  mascara: "mascara",
  mascaras: "mascara",
  mask: "mascara",
  masks: "mascara",
};
const PUBLIC_PRODUCT_TYPE_TAGS = new Set([
  "armadura",
  "bastao",
  "busto",
  "cetro",
  "colar",
  "conjunto",
  "escudo",
  "figura",
  "mascara",
  "miniatura",
  "ornamento",
  "set",
  "simbolo",
]);
const NON_PUBLIC_PRODUCT_TAGS = new Set([
  "acessorio",
  "acessorios",
  "decoracao",
  "objeto",
  "objetos",
  "peca",
  "pecas",
  "prop",
  "props",
]);
const PUBLIC_MODIFIER_TAG_WORDS = new Set([
  "amarela",
  "amarelas",
  "amarelo",
  "amarelos",
  "azul",
  "azuis",
  "branca",
  "brancas",
  "branco",
  "brancos",
  "cinza",
  "cinzas",
  "colorida",
  "coloridas",
  "colorido",
  "coloridos",
  "dourada",
  "douradas",
  "dourado",
  "dourados",
  "normal",
  "preta",
  "pretas",
  "preto",
  "pretos",
  "roxa",
  "roxas",
  "roxo",
  "roxos",
  "vermelha",
  "vermelhas",
  "vermelho",
  "vermelhos",
]);
const ALLOWED_MULTIWORD_PUBLIC_TAGS = new Set([
  "capitao america",
  "capuz vermelho",
  "forca ginyu",
  "dick vigarista",
  "doutor destino",
  "doutor estranho",
  "dragon ball super",
  "dragon ball z",
  "duende verde",
  "homem aranha",
  "homem de ferro",
  "lady loki",
  "lanterna verde",
  "mulher aranha",
  "mulher hulk",
  "mulher maravilha",
  "one piece",
  "pantera negra",
  "raca do freeza",
  "senhor das estrelas",
  "speed demon",
  "tartarugas ninja",
  "the batman",
  "tropa do orgulho",
  "viuva negra",
  "x men",
]);
const COLLAPSIBLE_MULTIWORD_PUBLIC_TAGS = new Set([
  "chi chi",
  "dragon ball super",
  "dragon ball z",
  "homem de ferro",
  "senhor das estrelas",
]);
const HIDDEN_SITE_SUBCATEGORIES = new Set(["objetos"]);

const DRAGON_BALL_GROUP_RULES = [
  {
    subcategory: "Robos",
    tags: ["robos"],
    matches: ["giru"],
  },
  {
    subcategory: "Criaturas",
    tags: ["criaturas"],
    matches: ["shenlong", "shenron"],
  },
  {
    subcategory: "Viloes",
    tags: ["viloes"],
    matches: ["bojack", "janemba", "kunshi", "piano", "zarbon"],
  },
  {
    subcategory: "Majins",
    tags: ["majins", "majin-boo"],
    matches: [
      "majin-boo",
      "majin-buu",
      "kid-buu",
      "kid buu",
      "super-buu",
      "evil-buu",
      "fat-buu",
      "majin-21",
    ],
  },
  {
    subcategory: "Tropa do Orgulho",
    tags: ["tropa-do-orgulho"],
    matches: ["tropa-do-orgulho", "jiren", "toppo", "dyspo", "universo-11"],
  },
  {
    subcategory: "Forca Ginyu",
    tags: ["forca-ginyu", "ginyu"],
    matches: [
      "forca-ginyu",
      "jeice",
      "burter",
      "recoome",
      "guldo",
      "capitao-ginyu",
      "captain-ginyu",
    ],
  },
  {
    subcategory: "Raca do Freeza",
    tags: ["raca-do-freeza"],
    matches: [
      "freeza",
      "frieza",
      "mecha-freeza",
      "cooler",
      "king-cold",
      "frost",
      "chilled",
      "metal-cooler",
    ],
  },
  {
    subcategory: "Android",
    tags: ["android"],
    matches: [
      "androide-21",
      "android-21",
      "androide-8",
      "android-8",
      "androide-13",
      "android-13",
      "androide-16",
      "android-16",
      "androide-17",
      "android-17",
      "androide-18",
      "android-18",
      "androide-19",
      "android-19",
      "androide-20",
      "android-20",
      "cell",
      "doutor-gero",
      "dr-gero",
    ],
  },
  {
    subcategory: "Namekusei",
    tags: ["namekusei"],
    matches: [
      "piccolo",
      "rei-piccolo",
      "king-piccolo",
      "dende",
      "nail",
      "slug",
    ],
  },
  {
    subcategory: "Deuses",
    tags: ["deuses", "kaioshin"],
    matches: [
      "kaioshin",
      "kaioshin-do-sul",
      "beerus",
      "bills",
      "whis",
      "vados",
      "champa",
      "zeno",
      "zeno-sama",
      "daishinkan",
      "grand-priest",
      "senhor-kaio",
      "king-kai",
      "zamasu",
    ],
  },
  {
    subcategory: "Terraqueo",
    tags: ["terraqueo"],
    matches: [
      "capitao-yellow",
      "dr-hedo",
      "great-saiyaman-2",
      "magenta",
      "red-ribbon",
      "ten-shin-han",
      "tenshinhan",
      "tien-shinhan",
      "videl",
      "bulma",
      "chi-chi",
      "kuririn",
      "krillin",
      "launch",
      "lunch",
      "mestre-kame",
      "master-roshi",
      "yamcha",
      "yajirobe",
      "videl",
      "mr-satan",
    ],
  },
  {
    subcategory: "Sayajins",
    tags: ["sayajins", "sayajin"],
    matches: [
      "golden-ape",
      "great-ape",
      "oozaru",
      "ozaru",
      "paragus",
      "bardock",
      "borgos",
      "broly",
      "cabba",
      "gogeta",
      "gohan",
      "goku",
      "goten",
      "gotenks",
      "kale",
      "kefla",
      "nappa",
      "pan",
      "raditz",
      "radite",
      "saiyajins",
      "saiyan",
      "sayajin",
      "sayajins",
      "super-saiyajin",
      "tarble",
      "trunks",
      "tullece",
      "turles",
      "vegeto",
      "vegeta",
      "vegetto",
      "vegito",
    ],
  },
];

function normalizeRelpath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
}

function cleanName(value) {
  const cleaned = String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^x 23$/i.test(cleaned) ? "X-23" : cleaned;
}

function cleanPublicName(value) {
  const cleaned = String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return /^x\s*-?\s*23$/i.test(cleaned) ? "X-23" : cleaned;
}

function normalizeComparable(value) {
  return cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PUBLIC_MODELER_PHRASES = [
  "3d moon",
  "3dmoon",
  "3dmoonn",
  "blue spray",
  "bluespray",
  "chibi land",
  "chibiland",
  "eddy workshop",
  "eddyworkshop",
  "extra guy",
  "gatsu",
  "grand figures",
  "grandfigures",
  "gumroad",
  "heraldo sculpts",
  "heraldosculpts",
  "instagram",
  "kuru",
  "kuru figure",
  "kuru figures",
  "kuruf",
  "kurufigure",
  "kurufigures",
  "la figures",
  "lafigures",
  "loot box",
  "lootbox",
  "lucas perez",
  "lucas perez studio",
  "myanimate",
  "nomnom",
  "nomnom figures",
  "patreon",
  "plukit",
  "ryodan",
  "ryodan studio",
  "serik",
  "shinobu sculpts",
  "tanuki figures",
  "tanukifigures",
  "toymakr",
  "toymakr3d",
  "chuyafactory",
];

const PUBLIC_MODELER_NORMALIZED = new Set(
  PUBLIC_MODELER_PHRASES.map(normalizeComparable),
);
const GENERIC_PUBLIC_VARIANTS = new Set([
  "action pose",
  "anime render",
  "clay render",
  "dual",
  "painted render",
  "promo",
  "red",
  "sheet",
  "standing",
  "sword",
]);
const PUBLIC_VARIANT_TRANSLATIONS = new Map([
  ["apple bust", "Busto"],
  ["bust", "Busto"],
  ["bust gray", "Busto cinza"],
  ["bust grey", "Busto cinza"],
  ["bust painted", "Busto colorido"],
  ["base de energia", "Base de energia"],
  ["diorama com nave", "Diorama com nave"],
  ["football", "Futebol americano"],
  ["gray suit", "Traje cinza"],
  ["grey suit", "Traje cinza"],
  ["monster point", "Monster Point"],
  ["na nave", "Na nave"],
  ["painel", "Painel"],
  ["praia", "Praia"],
  ["ssj4", "Super Saiyajin 4"],
  ["super saiyan blue", "Super Saiyajin Blue"],
  ["super saiyan", "Super Saiyajin"],
  ["super saiyajin 2", "Super Saiyajin 2"],
  ["super saiyajin blue", "Super Saiyajin Blue"],
  ["super saiyajin", "Super Saiyajin"],
  ["treino", "Treino"],
  ["yu gi oh cinza", null],
  ["yu gi oh cinza keyblade", "Keyblade"],
]);
const PUBLIC_VARIANT_INDEX_WORDS = new Set([
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "um",
  "uma",
  "dois",
  "duas",
  "tres",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
]);

function stripTrailingVariantIndex(value) {
  const words = cleanName(value).split(/\s+/).filter(Boolean);
  while (words.length) {
    const last = normalizeComparable(words.at(-1));
    if (/^\d+$/.test(last) || PUBLIC_VARIANT_INDEX_WORDS.has(last)) {
      words.pop();
      continue;
    }
    break;
  }
  return cleanName(words.join(" "));
}

function stripPublicModelerText(value) {
  const original = cleanName(value);
  let text = original;
  let removed = false;

  for (const phrase of PUBLIC_MODELER_PHRASES) {
    const pattern = new RegExp(
      `\\b${escapeRegExp(phrase).replace(/\\s+/g, "[\\s_-]+")}\\b`,
      "gi",
    );
    text = text.replace(pattern, () => {
      removed = true;
      return " ";
    });
  }

  text = cleanName(text.replace(/\b(?:by|por)\b/gi, " "));
  return { text, removed, original };
}

function publicVariantName(value) {
  const { text } = stripPublicModelerText(value);
  const directNormalized = normalizeComparable(text);
  if (PUBLIC_VARIANT_TRANSLATIONS.has(directNormalized)) {
    return PUBLIC_VARIANT_TRANSLATIONS.get(directNormalized);
  }
  const withoutTrailingIndex = stripTrailingVariantIndex(text);
  const normalized = normalizeComparable(withoutTrailingIndex);

  if (PUBLIC_VARIANT_TRANSLATIONS.has(normalized)) {
    return PUBLIC_VARIANT_TRANSLATIONS.get(normalized);
  }
  const canonicalVariant = canonicalPublicVariant(normalized);
  if (canonicalVariant !== undefined) return canonicalVariant;
  if (GENERIC_PUBLIC_VARIANTS.has(normalized)) return null;
  if (isAutoGeneratedPublicVariant(normalized)) return null;
  if (!normalized || PUBLIC_MODELER_NORMALIZED.has(normalized)) {
    return null;
  }
  if (/^\d+$/.test(normalized)) return null;
  if (/^(?:model|modelo|mod|figure|figura|statue|estatua)$/i.test(normalized))
    return null;
  return null;
}

function canonicalPublicVariant(normalized) {
  if (!normalized) return undefined;
  if (/^(?:busto|bust)\b/.test(normalized)) return "Busto";
  if (/^chibi\b/.test(normalized)) return "Chibi";
  if (/^diorama\b/.test(normalized)) return "Diorama";
  if (/\b(?:armadura|armor)\b/.test(normalized)) return "Armadura";
  if (/\b(?:capacete|helmet|mascara|mask)\b/.test(normalized))
    return "Mascara";
  if (/\b(?:super saiyajin blue|super saiyan blue)\b/.test(normalized))
    return "Super Saiyajin Blue";
  if (/\b(?:super saiyajin|super saiyan|ssj)\b/.test(normalized))
    return "Super Saiyajin";
  return undefined;
}

function isAutoGeneratedPublicVariant(normalized) {
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordsWithoutIndex = words.filter(
    (word) => !/^\d+$/.test(word) && !PUBLIC_VARIANT_INDEX_WORDS.has(word),
  );
  if (!wordsWithoutIndex.length) return true;
  if (/^(?:modelo|model|mod)\s+\d+$/.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (
    /^(?:anime render|anime painted render|anime clay render|myanimate|lootbox)\s*\d*$/.test(
      normalized,
    )
  )
    return true;
  const publicMeaningfulPrefixes = [
    "busto",
    "chibi",
    "gear",
    "super saiyajin",
    "super saiyan",
  ];
  if (publicMeaningfulPrefixes.some((prefix) => normalized.startsWith(prefix)))
    return false;

  const generatedWords = new Set([
    "action",
    "academia",
    "anime",
    "aura",
    "bad",
    "ball",
    "base",
    "black",
    "blue",
    "card",
    "cinza",
    "clay",
    "detail",
    "dragon",
    "dress",
    "family",
    "figure",
    "fish",
    "football",
    "front",
    "gi",
    "oh",
    "gray",
    "green",
    "grey",
    "gundam",
    "hero",
    "ice",
    "model",
    "my",
    "naruto",
    "outfit",
    "painted",
    "pose",
    "purple",
    "rear",
    "red",
    "render",
    "set",
    "slash",
    "suit",
    "sword",
    "two",
    "view",
    "water",
    "white",
    "yellow",
    "yu",
    "z",
  ]);
  return wordsWithoutIndex.every((word) => generatedWords.has(word));
}

function publicSourceFileName(value) {
  const { text } = stripPublicModelerText(value);
  return text || null;
}

function publicTagParts(value) {
  const { text } = stripPublicModelerText(value);
  const normalized = normalizeComparable(text);
  if (
    !normalized ||
    PUBLIC_MODELER_NORMALIZED.has(normalized) ||
    isAutoGeneratedPublicVariant(normalized) ||
    NON_PUBLIC_PRODUCT_TAGS.has(normalized)
  )
    return [];
  if (normalized === "x 23") return ["x-23"];

  const objectAlias = PUBLIC_OBJECT_TAG_ALIASES[normalized];
  if (objectAlias) return [objectAlias];

  const words = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length <= 1) return [normalized];

  const shouldSplit =
    words.includes("e") ||
    words.some(
      (word) =>
        Boolean(PUBLIC_OBJECT_TAG_ALIASES[word]) ||
        PUBLIC_PRODUCT_TYPE_TAGS.has(word) ||
        NON_PUBLIC_PRODUCT_TAGS.has(word),
    );
  if (!shouldSplit) return [normalized];

  const parts = [];
  let phraseWords = [];
  const flushPhrase = () => {
    if (!phraseWords.length) return;
    const phrase = phraseWords.join(" ");
    if (ALLOWED_MULTIWORD_PUBLIC_TAGS.has(phrase)) {
      parts.push(phrase);
      phraseWords = [];
      return;
    }

    const cleanedWords = phraseWords.filter(
      (word) => !PUBLIC_MODIFIER_TAG_WORDS.has(word),
    );
    if (cleanedWords.length === 1) parts.push(cleanedWords[0]);
    else parts.push(...cleanedWords);
    phraseWords = [];
  };

  for (const word of words) {
    if (PUBLIC_TAG_STOPWORDS.has(word)) {
      flushPhrase();
      continue;
    }

    const alias = PUBLIC_OBJECT_TAG_ALIASES[word] || word;
    if (NON_PUBLIC_PRODUCT_TAGS.has(alias)) {
      flushPhrase();
      continue;
    }

    if (PUBLIC_PRODUCT_TYPE_TAGS.has(alias)) {
      flushPhrase();
      parts.push(alias);
      continue;
    }

    phraseWords.push(alias);
  }
  flushPhrase();

  return applyOfficialMultiwordTags(normalized, [...new Set(parts)]);
}

function uniquePublicTags(values) {
  const tags = [];
  const seen = new Set();
  for (const value of values) {
    for (const part of publicTagParts(value)) {
      const normalized = normalizeComparable(part);
      const tag =
        normalized === "x 23"
          ? "x-23"
          : normalized === "sensitive blur"
            ? "sensitive-blur"
            : normalized.replace(/\s+/g, "-");
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return collapseMultiwordPublicTags(tags);
}

function includesWordSequence(text, phrase) {
  const textWords = text.split(/\s+/).filter(Boolean);
  const phraseWords = phrase.split(/\s+/).filter(Boolean);
  if (!phraseWords.length || phraseWords.length > textWords.length)
    return false;

  for (
    let index = 0;
    index <= textWords.length - phraseWords.length;
    index += 1
  ) {
    if (
      phraseWords.every((word, offset) => textWords[index + offset] === word)
    ) {
      return true;
    }
  }
  return false;
}

function applyOfficialMultiwordTags(normalized, parts) {
  let next = [...parts];
  for (const phrase of ALLOWED_MULTIWORD_PUBLIC_TAGS) {
    if (!includesWordSequence(normalized, phrase)) continue;

    if (COLLAPSIBLE_MULTIWORD_PUBLIC_TAGS.has(phrase)) {
      const phraseWords = new Set(
        phrase.split(/\s+/).filter((word) => !PUBLIC_TAG_STOPWORDS.has(word)),
      );
      next = next.filter((part) => !phraseWords.has(part));
    }
    next.push(phrase);
  }

  return [...new Set(next)];
}

function collapseMultiwordPublicTags(tags) {
  let next = [...tags];
  for (const phrase of COLLAPSIBLE_MULTIWORD_PUBLIC_TAGS) {
    const phraseTag = phrase.replace(/\s+/g, "-");
    if (!next.includes(phraseTag)) continue;

    const phraseWords = phrase
      .split(/\s+/)
      .filter((word) => !PUBLIC_TAG_STOPWORDS.has(word))
      .map((word) => word.replace(/\s+/g, "-"));

    next = next.filter(
      (tag) => tag === phraseTag || !phraseWords.includes(tag),
    );
  }
  return [...new Set(next)];
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function recordIdentity(record) {
  return String(
    record.message_id ||
      record.source_sha256 ||
      record.source_name ||
      record.input_path ||
      record.display_relpath ||
      "",
  ).trim();
}

function isDragonBallRecord(record) {
  const source = normalizeComparable(
    record.source_title || record.source_franchise || "",
  );
  return source.startsWith("dragon ball");
}

function dragonBallOrganization(record) {
  if (!isDragonBallRecord(record)) return null;

  const values = [
    record.taxonomy_slug,
    record.taxonomy_group,
    record.public_name_pt_br,
    record.original_name,
    ...(Array.isArray(record.tags) ? record.tags : []),
  ];
  const haystack = values
    .map((value) => normalizeComparable(value))
    .filter(Boolean)
    .join(" ");

  if (haystack.includes("fazendeiro")) {
    return {
      subcategory: "Terraqueo",
      tags: ["terraqueo", "npc"],
      matches: [],
    };
  }

  if (haystack.includes("nappa")) {
    return {
      subcategory: "Sayajins",
      tags: ["sayajins", "sayajin"],
      matches: [],
    };
  }

  if (
    haystack.includes("goku e chi chi") ||
    haystack.includes("goku e kuririn") ||
    haystack.includes("goku krillin") ||
    haystack.includes("goku and krillin") ||
    haystack.includes("bulma goku shenlong")
  ) {
    return {
      subcategory: "Conjuntos",
      tags: ["conjuntos", "conjunto"],
      matches: [],
    };
  }

  if (
    haystack.includes("gohan com shenlong") ||
    haystack.includes("gohan with shenlong")
  ) {
    return {
      subcategory: "Sayajins",
      tags: ["sayajins", "sayajin", "shenlong"],
      matches: [],
    };
  }

  if (
    /(?:\bconjunto\b|,|\b e \b|\bvs\b)/.test(haystack) &&
    (
      (haystack.includes("majin boo") || haystack.includes("majin buu")) &&
      (
        haystack.includes("cell") ||
        haystack.includes("freeza") ||
        haystack.includes("frieza") ||
        haystack.includes("vegetto") ||
        haystack.includes("vegito") ||
        haystack.includes("goku") ||
        haystack.includes("trunks") ||
        haystack.includes("kuririn") ||
        haystack.includes("krillin") ||
        haystack.includes("chi chi") ||
        haystack.includes("bulma") ||
        haystack.includes("shenlong") ||
        haystack.includes("shenron")
      )
    )
  ) {
    return {
      subcategory: "Conjuntos",
      tags: ["conjuntos", "conjunto"],
      matches: [],
    };
  }

  for (const rule of DRAGON_BALL_GROUP_RULES) {
    if (rule.matches.some((match) => haystack.includes(normalizeComparable(match)))) {
      return rule;
    }
  }

  return null;
}

function recordTime(record) {
  const parsed = Date.parse(record.built_at || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeLatestRecords(records) {
  const byIdentity = new Map();
  const passthrough = [];

  for (const record of records) {
    const identity = recordIdentity(record);
    if (!identity) {
      passthrough.push(record);
      continue;
    }

    const existing = byIdentity.get(identity);
    if (!existing || recordTime(record) >= recordTime(existing)) {
      byIdentity.set(identity, record);
    }
  }

  return [...byIdentity.values(), ...passthrough].sort((left, right) => {
    const leftTime = recordTime(left);
    const rightTime = recordTime(right);
    return (
      leftTime - rightTime ||
      recordIdentity(left).localeCompare(recordIdentity(right))
    );
  });
}

function uniqueTags(record, item, extraTags = []) {
  const categoryTags = uniquePublicTags([record.final_category]);
  const titleTags = uniquePublicTags([
    item.name,
    item.character_name,
    record.public_name_pt_br,
  ]);
  const rawTags = uniquePublicTags([
    ...(Array.isArray(record.tags) ? record.tags : []),
    record.taxonomy_group,
    record.taxonomy_slug,
  ]);
  const productTypeTags = uniquePublicTags([...titleTags, ...rawTags]).filter(
    (tag) => PUBLIC_PRODUCT_TYPE_TAGS.has(tag),
  );
  const sourceTags = uniquePublicTags([item.source_title]);
  const mediaTags = uniquePublicTags([item.media_type]);
  const organizationTags = uniquePublicTags(extraTags);
  const tags = uniquePublicTags([
    ...categoryTags,
    ...productTypeTags,
    ...titleTags.filter((tag) => !productTypeTags.includes(tag)),
    ...rawTags.filter(
      (tag) =>
        !categoryTags.includes(tag) &&
        !productTypeTags.includes(tag) &&
        !titleTags.includes(tag),
    ),
    ...organizationTags,
    ...sourceTags,
    ...mediaTags,
  ]);

  const enrichedTags = isDragonBallRecord(record)
    ? enrichDragonBallAliasTags(tags)
    : tags;

  return enrichedTags.slice(0, 24);
}

function enrichDragonBallAliasTags(tags) {
  const next = [...tags];
  const has = (tag) => next.includes(tag);
  const push = (tag) => {
    if (!has(tag)) next.push(tag);
  };

  if (has("kuririn")) push("krillin");
  if (has("krillin")) push("kuririn");

  if (has("launch")) push("lunch");
  if (has("lunch")) push("launch");

  if (has("mestre-kame")) push("master-roshi");
  if (has("master-roshi")) push("mestre-kame");

  if (has("tenshinhan")) push("tien-shinhan");
  if (has("tien-shinhan")) push("tenshinhan");

  if (has("fazendeiro")) {
    const filtered = next.filter((tag) => tag !== "android");
    next.length = 0;
    next.push(...filtered);
  }

  if (has("yamcha-puar")) {
    push("yamcha");
    push("puar");
  }

  if (has("videl-grande-saiyaman-2")) push("videl");
  if (has("goku-vs-freeza")) {
    push("goku");
    push("freeza");
    push("confronto");
  }
  if (has("trunks-vs-cell")) {
    push("trunks");
    push("cell");
    push("confronto");
  }
  if (has("broly-vs-goku")) {
    push("broly");
    push("goku");
    push("confronto");
  }

  let collapsed = uniquePublicTags(next);
  if (collapsed.includes("majin-boo")) {
    collapsed = collapsed.filter((tag) => tag !== "kid-buu");
  }
  if (collapsed.includes("goku-trio-de-energia")) {
    collapsed = collapsed.filter((tag) => tag !== "goku-energy-trio");
  }
  if (collapsed.includes("goku-vs-freeza")) {
    collapsed = collapsed.filter((tag) => tag !== "goku-vs-freeza");
  }
  if (collapsed.includes("trunks-vs-cell")) {
    collapsed = collapsed.filter((tag) => tag !== "trunks-vs-cell");
  }
  if (collapsed.includes("broly-vs-goku")) {
    collapsed = collapsed.filter((tag) => tag !== "broly-vs-goku");
  }
  return collapsed;
}

function mediaType(record) {
  if (record.source_type) return record.source_type;
  if (record.final_category === "games") return "game";
  if (record.final_category === "filmes") return "movie";
  if (record.final_category === "anime") return "anime";
  if (record.final_category === "quadrinhos") return "comic";
  return record.final_category || "other";
}

const SITE_IMPORT_EXCLUDED_CATEGORIES = new Set([
  "duplicados",
  "fora catalogo",
  "problemas",
  "revisar",
]);

function rejectReason(record, displayExists, thumbExists) {
  if (record.private_staging_only === true) return "private_curadoria_staging";
  if (
    SITE_IMPORT_EXCLUDED_CATEGORIES.has(
      normalizeComparable(record.final_category),
    )
  )
    return "excluded_non_catalog_asset";
  if (record.curation_status === "blocked_review")
    return "blocked_visual_review";
  if (!displayExists) return "missing_display_file";
  if (!thumbExists) return "missing_thumb_file";
  if (record.curation_status !== "taxonomy_applied")
    return "needs_ptbr_name_or_taxonomy";
  if (
    /validar visualmente/i.test(String(record.taxonomy_applied_reason || ""))
  ) {
    return "needs_visual_taxonomy_review";
  }
  if (
    !cleanName(
      record.public_name_pt_br ||
        record.original_name ||
        record.source_filename,
    )
  ) {
    return "missing_public_name";
  }
  if (!cleanName(record.source_title || record.source_franchise))
    return "missing_source_title";
  return null;
}

function importId(record) {
  const identity =
    String(record.message_id || "").trim() ||
    String(record.source_sha256 || "").slice(0, 16) ||
    normalizeComparable(record.source_name).replace(/\s+/g, "-");
  return `telegram-webp-${identity}`;
}

function slugPart(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

function normalizeDragonBallStorageBasename(record, basename) {
  if (!isDragonBallRecord(record)) return basename;

  const publicName = normalizeDragonBallPublicName(
    record,
    record.public_name_pt_br || record.original_name || record.source_filename,
  );

  let normalized = basename
    .replaceAll("launch", "lunch")
    .replaceAll("master-roshi", "mestre-kame")
    .replaceAll("krillin", "kuririn")
    .replaceAll("tien-shinhan", "tenshinhan")
    .replaceAll("super-saiyan", "super-saiyajin")
    .replaceAll("frieza", "freeza")
    .replaceAll("vegeto", "vegetto")
    .replaceAll("golden-ape", "oozaru-dourado")
    .replaceAll("great-ape", "oozaru")
    .replaceAll("kid-goku-cloud", "goku-crianca-na-nuvem")
    .replaceAll("great-saiyaman", "videl-grande-saiyaman-2")
    .replaceAll("goku-and-kuririn", "goku-e-kuririn")
    .replaceAll("goku-and-krillin", "goku-e-kuririn")
    .replaceAll("yamcha-and-puar", "yamcha-e-puar")
    .replaceAll("-saiyan-", "-sayajin-")
    .replaceAll("-figure-", "-figura-")
    .replaceAll("-group-", "-grupo-")
    .replaceAll("-statue-", "-estatua-")
    .replaceAll("-bust-", "-busto-")
    .replaceAll("-cape-", "-capa-")
    .replaceAll("-variant-", "-variante-")
    .replaceAll("-promo-", "-promocional-")
    .replaceAll("-dark-render-", "-render-escuro-")
    .replaceAll("-gray-render-", "-render-cinza-")
    .replaceAll("-child-", "-infantil-")
    .replaceAll("-closeup-", "-detalhe-")
    .replaceAll("-close-", "-detalhe-")
    .replaceAll("-front-", "-frontal-")
    .replaceAll("-back-", "-traseira-")
    .replaceAll("-rear-", "-traseira-")
    .replaceAll("-side-", "-lateral-")
    .replaceAll("-gray-", "-cinza-")
    .replaceAll("-energy-", "-energia-")
    .replaceAll("-blast-", "-explosao-")
    .replaceAll("-painted-", "-pintado-")
    .replaceAll("-wooden-base-", "-base-de-madeira-")
    .replaceAll("-armor-", "-armadura-")
    .replaceAll("-saiyan-armor-", "-armadura-sayajin-")
    .replaceAll("-moon-", "-lua-");

  normalized = normalized.replaceAll(
    "kid-buu-babidi-grupo",
    "cell-majin-boo-e-freeza-grupo",
  );
  normalized = normalized
    .replaceAll("-dragon-ball-z-", "-")
    .replaceAll("-dragon-ball-super-", "-")
    .replaceAll("-dragon-ball-gt-", "-")
    .replaceAll("-dragon-ball-", "-")
    .replaceAll("-battle-", "-batalha-")
    .replaceAll("-view-", "-vista-")
    .replaceAll("-planet-destroyer-", "-destruidor-de-planetas-")
    .replaceAll("-purple-aura-", "-aura-roxa-")
    .replaceAll("-miniature-set-", "-miniaturas-")
    .replaceAll("-chef-", "-cozinheiro-")
    .replaceAll("-family-", "-familia-")
    .replaceAll("-white-", "-branco-")
    .replaceAll("-on-cloud-", "-na-nuvem-");

  if (publicName === "Majin Boo") {
    normalized = normalized.replaceAll("kid-buu", "majin-boo");
  }
  if (publicName === "Goku Trio de Energia") {
    normalized = normalized
      .replaceAll("goku-super-saiyan-energy-trio", "goku-super-saiyajin-trio-de-energia")
      .replaceAll("goku-super-saiyan", "goku-super-saiyajin")
      .replaceAll("energy-blast", "rajada-de-energia")
      .replaceAll("final-view", "vista-final");
  }
  if (publicName === "Painel Goku e Vegeta") {
    normalized = normalized
      .replaceAll("goku-vegeta-wall", "painel-goku-e-vegeta")
      .replaceAll("-alternate-", "-alternativo-")
      .replaceAll("-close-", "-detalhe-");
  }
  if (publicName === "Painel Shenlong") {
    normalized = normalized
      .replaceAll("shenron-dragon-ball-wall-figure", "painel-shenlong")
      .replaceAll("shenron-wall-figure", "painel-shenlong")
      .replaceAll("shenron-wall-figura", "painel-shenlong");
  }
  if (String(record.message_id || "") === "166219") {
    normalized = normalized.replaceAll(
      "gohan-fiery-base-1",
      "gohan-chibi-base-de-energia",
    );
  }
  if (String(record.message_id || "") === "108611") {
    normalized = normalized.replaceAll(
      "gohan-super-saiyajin-base-raio",
      "gohan-super-saiyajin-2-base-com-raios",
    );
  }
  if (publicName === "Cell, Majin Boo e Freeza") {
    normalized = normalized.replaceAll(
      "kid-buu-babidi-group",
      "cell-majin-boo-e-freeza-grupo",
    );
  }
  if (publicName === "Vegetto e Majin Boo") {
    normalized = normalized.replaceAll(
      "vegetto-majin-buu",
      "vegetto-e-majin-boo",
    );
    normalized = normalized.replaceAll(
      "vegeto-majin-buu",
      "vegetto-e-majin-boo",
    );
  }
  if (publicName === "Goku vs Freeza") {
    normalized = normalized
      .replaceAll("frieza", "freeza")
      .replaceAll("versus", "vs")
      .replaceAll("battle-statue", "diorama-batalha")
      .replaceAll("battle-estatua", "diorama-batalha");
  }
  if (publicName === "Trunks vs Cell") {
    normalized = normalized
      .replaceAll("versus", "vs")
      .replaceAll("trunks-confronting-cell", "trunks-vs-cell")
      .replaceAll("-front-", "-frontal-");
  }
  if (publicName === "Broly vs Goku") {
    normalized = normalized
      .replaceAll("broly-and-goku", "broly-vs-goku")
      .replaceAll("versus", "vs")
      .replaceAll("battle-statue", "diorama-batalha")
      .replaceAll("battle-estatua", "diorama-batalha");
  }
  if (publicName === "Androide 18") {
    normalized = normalized
      .replaceAll("android-18", "androide-18")
      .replaceAll("gray-lateral-view", "cinza-lateral")
      .replaceAll("gray-rear-view", "cinza-traseira");
  }
  if (publicName === "Shenlong") {
    normalized = normalized
      .replaceAll("shenron", "shenlong")
      .replaceAll("wall", "painel");
  }
  if (publicName === "Majin Boo") {
    normalized = normalized.replaceAll("majin-buu", "majin-boo");
  }
  if (publicName === "Freeza") {
    normalized = normalized.replaceAll("frieza", "freeza");
  }
  if (publicName === "Vegetto") {
    normalized = normalized.replaceAll("dragon-ball-miniaturas", "vegetto-miniatura");
  }
  if (publicName === "Goku Crianca na Nuvem") {
    normalized = normalized.replaceAll("kid-goku", "goku-crianca");
  }
  if (publicName === "Busto Vegetto") {
    normalized = normalized
      .replaceAll("dragon-ball-miniature-set", "busto-vegetto")
      .replaceAll("dragon-ball-miniaturas", "busto-vegetto");
  }
  if (publicName === "Conjunto Saiyajins Dragon Ball GT") {
    normalized = normalized.replaceAll(
      "conjunto-saiyajins-dragon-ball-gt",
      "conjunto-sayajins-gt",
    );
    normalized = normalized.replaceAll(
      "conjunto-saiyajins",
      "conjunto-sayajins-gt",
    );
  }
  if (publicName === "Mestre Kame") {
    normalized = normalized.replaceAll("chef", "cozinheiro");
  }
  if (publicName === "Yajirobe") {
    normalized = normalized.replaceAll("sword", "espada");
  }
  if (publicName === "Nappa") {
    normalized = normalized.replaceAll("mr-satan", "nappa");
  }
  if (publicName === "Gohan") {
    normalized = normalized.replaceAll("tapion", "gohan");
  }
  if (publicName === "Goku") {
    normalized = normalized.replaceAll("young-goku", "goku-crianca");
  }
  if (publicName === "Majin Boo") {
    normalized = normalized.replaceAll("cinza-sculpt", "escultura-cinza");
  }
  if (publicName === "Broly") {
    normalized = normalized.replaceAll("render", "escultura");
  }
  if (publicName === "Yajirobe") {
    normalized = normalized
      .replaceAll("render-cinza", "escultura-cinza")
      .replaceAll("render-escuro", "escultura-escura");
  }
  if (publicName === "Freeza" && normalizeComparable(record.variant_name) === "na nave") {
    normalized = normalized
      .replaceAll("freezer-figure-card", "freeza-na-nave")
      .replaceAll("freezer-figura-card", "freeza-na-nave")
      .replaceAll("freeza-figura-card", "freeza-na-nave");
  }
  if (publicName === "Vegeta") {
    normalized = normalized.replaceAll("figures", "figura");
  }

  return normalized;
}

function normalizeDragonBallPublicName(record, value) {
  if (!isDragonBallRecord(record)) return value;

  const normalized = cleanPublicName(value);
  const displayRelpath = normalizeRelpath(record.display_relpath || "");
  if (normalized === "Launch") return "Lunch";
  if (normalized === "Yamcha Puar") return "Yamcha e Puar";
  if (normalized === "Dr Hedo") return "Dr. Hedo";
  if (normalized === "Goku Kid") return "Goku Crianca";
  if (normalized === "Kid Goku") return "Goku Crianca";
  if (normalized === "Kid Goku Cloud") return "Goku Crianca na Nuvem";
  if (normalized === "Busto Goku Super Saiyan")
    return "Busto Goku Super Saiyajin";
  if (normalized === "Goku Spirit Bomb") return "Goku Genki Dama";
  if (normalized === "Great Ape Vegeta") return "Oozaru Vegeta";
  if (normalized === "Golden Ape") return "Oozaru Dourado";
  if (normalized === "Kid Buu") return "Majin Boo";
  if (normalized === "Trunks Vs Cell") return "Trunks vs Cell";
  if (normalized === "Broly Vs Goku") return "Broly vs Goku";
  if (normalized === "Goku Energy Trio") return "Goku Trio de Energia";
  if (normalized === "Goku Vegeta Wall") return "Painel Goku e Vegeta";
  if (
    normalized === "Shenlong" &&
    displayRelpath.includes("shenron-dragon-ball-wall-figure-113314")
  ) {
    return "Painel Shenlong";
  }
  return normalized;
}

function normalizeDragonBallStorageModelSlug(record, value) {
  if (!isDragonBallRecord(record)) return value;

  return String(value || "")
    .replaceAll("launch", "lunch")
    .replaceAll("yamcha-puar", "yamcha-e-puar")
    .replaceAll("goku-energy-trio", "goku-trio-de-energia")
    .replaceAll("goku-vegeta-wall", "painel-goku-e-vegeta")
    .replaceAll("kid-buu", "majin-boo")
    .replaceAll("vegeto", "vegetto")
    .replaceAll("frieza", "freeza")
    .replaceAll("golden-ape", "oozaru-dourado")
    .replaceAll("great-ape-vegeta", "oozaru-vegeta")
    .replaceAll("kid-goku-cloud", "goku-crianca-na-nuvem")
    .replaceAll("super-saiyan", "super-saiyajin")
    .replaceAll("conjunto-saiyajins-dragon-ball-gt", "conjunto-sayajins-gt")
    .replaceAll("young-goku", "goku-crianca");
}

function storageRelpathForRecord(record, relpath, organization) {
  const normalized = normalizeRelpath(relpath);
  const match = normalized.match(/^(display|thumb)\/(.+)$/);
  if (!match) return normalized;

  const [, root] = match;
  const basename = normalizeDragonBallStorageBasename(
    record,
    path.posix.basename(normalized),
  );
  const category = slugPart(record.final_category);
  const subcategory = slugPart(
    organization?.subcategory || record.taxonomy_group || record.source_franchise,
  );
  const modelSlug = slugPart(
    normalizeDragonBallStorageModelSlug(
      record,
      record.taxonomy_slug ||
        record.public_name_pt_br ||
        record.original_name ||
        basename,
    ),
  );

  if (!category || !subcategory || !modelSlug) return normalized;
  return `${root}/${category}/${subcategory}/${modelSlug}/${basename}`;
}

function catalogVisibility(record) {
  const subcategory = normalizeComparable(
    record.taxonomy_group || record.source_franchise,
  );
  if (HIDDEN_SITE_SUBCATEGORIES.has(subcategory)) return "hidden";
  return "general";
}

async function buildItem(record) {
  const displayRelpath = normalizeRelpath(record.display_relpath);
  const thumbRelpath = normalizeRelpath(record.thumb_relpath);
  const displayExists = await exists(path.join(OUTPUT, displayRelpath));
  const thumbExists = await exists(path.join(OUTPUT, thumbRelpath));
  const name = normalizeDragonBallPublicName(
    record,
    record.public_name_pt_br || record.original_name || record.source_filename,
  );
  const sourceTitle = cleanName(record.source_title || record.source_franchise);
  const organization = dragonBallOrganization(record);
  const storageDisplayRelpath = storageRelpathForRecord(
    record,
    displayRelpath,
    organization,
  );
  const storageThumbRelpath = storageRelpathForRecord(
    record,
    thumbRelpath,
    organization,
  );
  const reject = rejectReason(record, displayExists, thumbExists);
  const status = reject ? "skipped" : "ready_for_import";

  const item = {
    import_id: importId(record),
    status,
    reject_reason: reject,
    source_type: "telegram_webp_final",
    source_file_name: publicSourceFileName(record.source_name),
    message_id: record.message_id || null,
    original_sha256: record.source_sha256 || null,
    storage_bucket: "catalog",
    storage_path: normalizeRelpath(
      path.posix.join(STORAGE_PREFIX, storageDisplayRelpath),
    ),
    thumbnail_storage_path: normalizeRelpath(
      path.posix.join(STORAGE_PREFIX, storageThumbRelpath),
    ),
    display_relpath: displayRelpath,
    thumb_relpath: thumbRelpath,
    name,
    proposed_name: name,
    character_name: normalizeDragonBallPublicName(
      record,
      record.public_name_pt_br ||
        record.taxonomy_slug ||
        record.original_name ||
        name,
    ),
    variant_name: publicVariantName(record.variant_name),
    variant_type: record.variant_type || "default",
    source_title: sourceTitle || null,
    source_type_sugerido: record.source_type || null,
    media_type: mediaType(record),
    category: record.final_category || null,
    subcategory:
      organization?.subcategory ||
      record.taxonomy_group ||
      record.source_franchise ||
      null,
    taxonomy_slug: record.taxonomy_slug || null,
    catalog_visibility: catalogVisibility(record),
    duplicate_status: "unique",
    name_review_status:
      status === "ready_for_import" ? "approved" : "needs_review",
    visual_review_status:
      record.curation_status === "blocked_review" ? "needs_review" : "approved",
    tags: [],
    image_width: record.display_width || null,
    image_height: record.display_height || null,
    image_format: "webp",
    display_bytes: record.display_bytes || null,
    thumb_bytes: record.thumb_bytes || null,
  };
  item.tags = uniqueTags(record, item, organization?.tags || []);
  return item;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
}

function countBySummarySubcategory(items) {
  const counts = {};
  for (const item of items) {
    const rawValue = String(item.subcategory || "").trim();
    const value = rawValue ? normalizeComparable(rawValue) : "";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
}

async function mapLimit(items, limit, mapper) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 64;
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(safeLimit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function writeCsv(filePath, items) {
  const rows = [
    CSV_COLUMNS.join(","),
    ...items.map((item) =>
      CSV_COLUMNS.map((column) => csvEscape(item[column])).join(","),
    ),
  ];
  await fs.writeFile(filePath, `${rows.join("\n")}\n`, "utf8");
}

async function main() {
  const rawRecords = await readJsonl(MANIFEST);
  const records = dedupeLatestRecords(rawRecords);
  const items = await mapLimit(records, BUILD_CONCURRENCY, buildItem);

  const ready = items.filter((item) => item.status === "ready_for_import");
  const skipped = items.filter((item) => item.status !== "ready_for_import");
  const summary = {
    generated_at: new Date().toISOString(),
    manifest: MANIFEST,
    output: OUTPUT,
    storage_prefix: STORAGE_PREFIX,
    build_concurrency: BUILD_CONCURRENCY,
    total_records: rawRecords.length,
    unique_records: records.length,
    duplicate_records_removed: rawRecords.length - records.length,
    ready_for_import: ready.length,
    skipped: skipped.length,
    by_status: countBy(items, "status"),
    by_reject_reason: countBy(skipped, "reject_reason"),
    by_category_ready: countBy(ready, "category"),
    by_subcategory_ready: countBySummarySubcategory(ready),
    outputs: {
      json: JSON_OUT,
      csv: CSV_OUT,
      ready_csv: READY_CSV_OUT,
      summary: SUMMARY_OUT,
    },
    note: "Plano local somente. Nao faz upload e nao publica no Supabase.",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(
      JSON_OUT,
      `${JSON.stringify({ summary, items }, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeCsv(CSV_OUT, items),
    writeCsv(READY_CSV_OUT, ready),
  ]);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
