import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function argListValue(name) {
  const raw = argValue(name, "");
  return String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const WEBP_OUTPUT = path.resolve(
  argValue("output", process.env.CATALOG_WEBP_OUTPUT || defaultTelegramWebpOutput()),
);
const SITE_PLAN = path.resolve(
  argValue(
    "site-plan",
    path.join(WEBP_OUTPUT, "manifests", "site_import", "telegram_webp_site_import_plan.json"),
  ),
);
const SOURCE_FILTERS = argListValue("source");
const CATEGORY_FILTERS = argListValue("category");
const PUBLIC_DIR = path.resolve(argValue("public-dir", "public"));
const MOCK_DIR = path.join(PUBLIC_DIR, "mock-catalog");
const MOCK_JSON = path.join(MOCK_DIR, "telegram-webp-ready-preview.json");
const ASSET_BASE_URL =
  argValue("asset-base-url", "") || `/@fs/${WEBP_OUTPUT.replace(/\\/g, "/")}`;

function normalizeTags(values) {
  return Array.from(
    new Set(
      (values || [])
        .map(tagSlug)
        .filter(Boolean),
    ),
  );
}

function tagSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase();
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TAG_STOP_WORDS = new Set([
  "a",
  "as",
  "anime",
  "academia",
  "cavaleiros",
  "comic",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "demon",
  "em",
  "figura",
  "figure",
  "d",
  "hero",
  "modelo",
  "model",
  "mod",
  "my",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "one",
  "os",
  "para",
  "piece",
  "point",
  "slayer",
  "statue",
  "estatua",
  "render",
  "son",
  "super",
  "studio",
  "studios",
  "the",
  "vs",
  "zodiaco",
  "lucas",
  "perez",
  "ryodan",
  "patreon",
]);

const SENSITIVITY_TAGS = new Set([
  "nsfw",
  "sensitive-blur",
  "sensitive-review",
  "age-ambiguous-review",
  "sensitive-has-variant",
]);

const COVER_MESSAGE_ID_BONUS = new Map([
  ["177645", 120], // Giru: esta vista mostra a frente/rosto melhor que as demais.
]);

function tagWords(value) {
  const normalized = normalizeComparable(value);
  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !TAG_STOP_WORDS.has(word));

  const parts = [];
  for (let index = 0; index < words.length; index += 1) {
    if (words[index] === "chi" && words[index + 1] === "chi") {
      parts.push("chi chi");
      index += 1;
      continue;
    }

    parts.push(words[index]);
  }

  return parts;
}

function pushTag(tags, value, { split = false } = {}) {
  const slug = tagSlug(value);
  if (!slug || TAG_STOP_WORDS.has(slug)) return;
  tags.push(slug);
  if (split) tags.push(...tagWords(value));
}

function publicTagsForGroup(group) {
  const tags = [];

  for (const entry of group) {
    pushTag(tags, entry.category);
    pushTag(tags, entry.subcategory);
    pushTag(tags, entry.source_title);
    pushTag(tags, entry.taxonomy_slug);
    pushTag(tags, entry.character_name || entry.name, { split: true });
    pushTag(tags, entry.variant_name, { split: true });

    for (const rawTag of entry.tags || []) {
      const slug = tagSlug(rawTag);
      if (SENSITIVITY_TAGS.has(slug)) {
        tags.push(slug);
        continue;
      }
      tags.push(...tagWords(rawTag));
    }
  }

  const normalized = normalizeTags(tags);
  return collapsePreviewAliasTags(normalized);
}

function collapsePreviewAliasTags(tags) {
  let next = [...tags];

  if (next.includes("dragon-ball-z") || next.includes("dragon-ball-super")) {
    next = next.filter((tag) => !["dragon-ball-z", "dragon-ball-super"].includes(tag));
    if (!next.includes("dragon-ball")) next.push("dragon-ball");
  }
  if (next.includes("dragon-ball")) {
    next = next.filter((tag) => !["dragon", "ball"].includes(tag));
  }
  if (next.includes("conjunto-saiyajins-dragon-ball-gt")) {
    next = next.filter((tag) => tag !== "conjunto-saiyajins-dragon-ball-gt");
  }

  if (next.includes("chi-chi")) {
    next = next.filter((tag) => tag !== "chi");
  }
  if (next.includes("lunch")) {
    next = next.filter((tag) => tag !== "launch");
  }
  if (next.includes("kuririn")) {
    next = next.filter((tag) => tag !== "krillin");
  }
  if (next.includes("mestre-kame")) {
    next = next.filter(
      (tag) => !["master-roshi", "master", "roshi"].includes(tag),
    );
  }
  if (next.includes("tenshinhan")) {
    next = next.filter(
      (tag) => !["tien-shinhan", "tien", "shinhan"].includes(tag),
    );
  }
  if (next.includes("yamcha-e-puar")) {
    next = next.filter((tag) => tag !== "yamcha-puar");
  }
  if (next.includes("mestre-kame")) {
    next = next.filter((tag) => !["mestre", "kame"].includes(tag));
  }
  if (next.includes("dr-hedo")) {
    next = next.filter((tag) => !["dr", "hedo"].includes(tag));
  }
  if (next.includes("videl-grande-saiyaman-2")) {
    next = next.filter((tag) => !["grande", "saiyaman"].includes(tag));
  }
  if (next.includes("goku-crianca")) {
    next = next.filter((tag) => !["kid", "goku-kid", "kid-goku"].includes(tag));
  }
  if (next.includes("goku-crianca-na-nuvem")) {
    next = next.filter(
      (tag) => !["kid", "cloud", "kid-goku-cloud"].includes(tag),
    );
  }
  if (next.includes("goku-genki-dama")) {
    next = next.filter(
      (tag) => !["spirit", "bomb", "goku-spirit-bomb"].includes(tag),
    );
  }
  if (next.includes("goku-black")) {
    next = next.filter((tag) => tag !== "black");
  }
  if (next.includes("oozaru-dourado")) {
    next = next.filter((tag) => !["golden", "ape", "golden-ape"].includes(tag));
  }
  if (next.includes("oozaru-vegeta")) {
    next = next.filter(
      (tag) => !["great", "ape", "great-ape-vegeta"].includes(tag),
    );
  }
  if (next.includes("busto-goku-super-saiyajin")) {
    next = next.filter(
      (tag) => !["saiyan", "goku-super-saiyan"].includes(tag),
    );
  }
  if (next.includes("kid-buu")) {
    next = next.filter((tag) => !["kid-buu", "kid", "buu"].includes(tag));
    if (!next.includes("majin-boo")) next.push("majin-boo");
  }
  if (next.includes("majin-boo")) {
    next = next.filter((tag) => !["majin", "boo"].includes(tag));
  }
  if (next.includes("majin") && next.includes("boo")) {
    next = next.filter((tag) => !["majin", "boo"].includes(tag));
    if (!next.includes("majin-boo")) next.push("majin-boo");
  }
  if (next.includes("super-saiyajin-blue")) {
    next = next.filter((tag) => tag !== "blue");
  }
  if (next.includes("painel-goku-e-vegeta")) {
    next = next.filter((tag) => !["goku-vegeta-wall", "wall"].includes(tag));
  }
  if (next.includes("goku-trio-de-energia")) {
    next = next.filter(
      (tag) => !["goku-energy-trio", "energy"].includes(tag),
    );
  }
  if (next.includes("goku-vs-freeza")) {
    next = next.filter((tag) => tag !== "goku-vs-freeza");
  }
  if (next.includes("trunks-vs-cell")) {
    next = next.filter((tag) => tag !== "trunks-vs-cell");
  }
  if (next.includes("broly-vs-goku")) {
    next = next.filter((tag) => tag !== "broly-vs-goku");
  }
  if (next.includes("vegetto-e-majin-boo")) {
    next = next.filter((tag) => tag !== "vegetto-e-majin-boo");
  }
  if (next.includes("cell-majin-boo-e-freeza")) {
    next = next.filter(
      (tag) => !["cell-majin-boo-freeza", "cell-majin-boo-e-freeza"].includes(tag),
    );
  }
  if (next.includes("raca-do-freeza")) {
    next = next.filter((tag) => tag !== "raca");
  }
  if (next.includes("na-nave")) {
    next = next.filter((tag) => tag !== "na-nave");
  }
  if (next.includes("diorama-com-nave")) {
    next = next.filter((tag) => tag !== "diorama-com-nave");
  }
  if (next.includes("base-de-energia")) {
    next = next.filter((tag) => tag !== "base-de-energia");
  }

  return next;
}

function mockUrl(relpath) {
  return `${ASSET_BASE_URL.replace(/\/+$/, "")}/${String(relpath || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function plannedRelativePath(item) {
  const planned = String(item.storage_path || "").replace(/\\/g, "/").trim();
  if (!planned) return item.display_relpath || null;
  return planned.replace(/^catalog-webp-final\//, "");
}

function sourceTypeForItem(item) {
  const suggested = String(item.source_type_sugerido || item.media_type || "").toLocaleLowerCase();
  if (["anime", "manga", "movie", "series", "game", "comic", "tokusatsu", "original", "other"].includes(suggested)) {
    return suggested;
  }

  if (item.category === "anime") return "anime";
  if (item.category === "games") return "game";
  if (item.category === "marvel" || item.category === "dc") return "comic";
  if (item.category === "filmes-series") return "movie";
  return "other";
}

function createdAtForItem(item, index) {
  const messageId = Number.parseInt(String(item.message_id || ""), 10);
  const timestamp = Date.UTC(2026, 0, 1, 0, 0, 0) + (Number.isFinite(messageId) ? messageId : index) * 1000;
  return new Date(timestamp).toISOString();
}

function itemMatchesFilter(item, filters, fields) {
  if (!filters.length) return true;
  const haystack = fields
    .map((value) => normalizeComparable(value))
    .filter(Boolean)
    .join(" ");
  return filters.some((filter) => haystack.includes(normalizeComparable(filter)));
}

function matchesMockScope(item) {
  const sourceFields = [
    item.source_title,
    item.subcategory,
    item.character_name,
    item.name,
    item.taxonomy_slug,
    item.source_file_name,
  ];
  const categoryFields = [
    item.category,
    item.source_type_sugerido,
    item.media_type,
  ];

  return (
    itemMatchesFilter(item, SOURCE_FILTERS, sourceFields) &&
    itemMatchesFilter(item, CATEGORY_FILTERS, categoryFields)
  );
}

function contentRatingForTags(tags) {
  const tagSet = new Set(tags.map((tag) => tag.replace(/\s+/g, "-")));
  if (tagSet.has("nsfw") || tagSet.has("sensitive-blur") || tagSet.has("sensitive-review")) return "nsfw";
  if (tagSet.has("age-ambiguous-review")) return "sensitive";
  return null;
}

function sensitivityForItem(item) {
  const tags = normalizeTags(item.tags || []);
  const rating = contentRatingForTags(tags);
  if (rating === "nsfw") return "nsfw";
  if (rating === "sensitive") return "sensitive";
  return "safe";
}

function messageNumber(item, fallback = 0) {
  const parsed = Number.parseInt(String(item.message_id || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function productStemForItem(item) {
  const relpath = plannedRelativePath(item) || item.display_relpath || "";
  const basename = String(relpath).replace(/\\/g, "/").split("/").pop() || "";
  const rawStem = basename.replace(/\.[^.]+$/, "");
  let parts = rawStem.split("-").filter(Boolean);

  if (parts.length && /^\d+$/.test(parts[parts.length - 1])) {
    parts.pop();
  }

  let numericRunStart = parts.length;
  while (numericRunStart > 0 && /^\d+$/.test(parts[numericRunStart - 1])) {
    numericRunStart -= 1;
  }
  const numericRunLength = parts.length - numericRunStart;
  if (numericRunLength >= 2) {
    parts = [
      ...parts.slice(0, numericRunStart + 1),
    ];
  }

  const suffixTokens = new Set([
    "frente",
    "frontal",
    "costas",
    "traseira",
    "lateral",
    "vista",
    "detalhe",
    "corpo",
    "rosto",
    "face",
    "back",
    "rear",
    "side",
    "front",
    "close",
    "closeup",
    "detail",
    "parts",
    "piece",
    "pieces",
    "peca",
    "pecas",
  ]);

  while (parts.length && suffixTokens.has(parts[parts.length - 1])) {
    parts.pop();
  }
  while (parts.length > 1 && suffixTokens.has(parts[parts.length - 1])) {
    parts.pop();
  }
  const stem = parts.join("-");

  return normalizeComparable(stem);
}

function modelDirectoryForItem(item) {
  const relpath = plannedRelativePath(item) || item.display_relpath || "";
  const normalized = String(relpath).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return normalizeComparable(parts[parts.length - 2]);
}

function groupKeyForItem(item) {
  const name = normalizeComparable(
    item.character_name || item.name || item.proposed_name || item.taxonomy_slug,
  );
  const productStem =
    productStemForItem(item) ||
    normalizeComparable(item.taxonomy_slug || name);
  const modelDirectory = modelDirectoryForItem(item);

  return [
    normalizeComparable(item.category),
    normalizeComparable(item.source_title || item.subcategory),
    normalizeComparable(item.subcategory),
    modelDirectory,
    productStem,
  ].join("|");
}

function coverScore(item) {
  const text = normalizeComparable([
    item.display_relpath,
    item.thumb_relpath,
    item.name,
    item.proposed_name,
    item.character_name,
    item.variant_name,
    item.source_file_name,
  ].join(" "));
  let score = 0;

  if (/\b(front|frente|frontal|portrait|retrato)\b/.test(text)) score += 80;
  if (/\b(principal|normal|padrao)\b/.test(text)) score += 25;
  if (/\b(back|costas|rear|dorso|verso|backview|back view)\b/.test(text)) score -= 120;
  if (/\b(parts|pecas|piece|pieces|detalhe|detail|close|closeup|opcao|opcoes|base|turntable)\b/.test(text)) score -= 35;
  if (/\b(chibi|plukit|promo|card|banner|modelo|variant|variante|versao)\b/.test(text)) score -= 30;
  if (/\b(side|lateral|perfil)\b/.test(text)) score -= 20;
  if (/\bthumb|thumbnail\b/.test(text)) score -= 5;
  if (/\b1\b/.test(text)) score += 5;

  const width = Number(item.image_width || 0);
  const height = Number(item.image_height || 0);
  if (height >= width) score += 10;
  score += COVER_MESSAGE_ID_BONUS.get(String(item.message_id || "")) || 0;
  return score;
}

function sortGalleryItems(items) {
  const hasSafe = items.some((item) => sensitivityForItem(item) === "safe");

  return [...items].sort((left, right) => {
    if (hasSafe) {
      const safeDelta =
        (sensitivityForItem(right) === "safe" ? 1 : 0) -
        (sensitivityForItem(left) === "safe" ? 1 : 0);
      if (safeDelta) return safeDelta;
    }

    const scoreDelta = coverScore(right) - coverScore(left);
    if (scoreDelta) return scoreDelta;
    return messageNumber(left) - messageNumber(right);
  });
}

function groupedReadyItems(readyItems) {
  const groups = new Map();
  for (const item of readyItems) {
    const key = groupKeyForItem(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()].map(sortGalleryItems);
}

function galleryImageForItem(item, modelId, index, name) {
  const imageUrl = mockUrl(item.display_relpath);
  const thumbnailUrl = mockUrl(item.thumb_relpath || item.display_relpath);
  const sensitivity = sensitivityForItem(item);
  const plannedPath = plannedRelativePath(item);

  return {
    id: `${modelId}:gallery:${item.message_id || index}`,
    model_id: modelId,
    source_drive_file_id: item.message_id ? `telegram:${item.message_id}` : null,
    storage_bucket: "mock-webp",
    storage_path: plannedPath,
    source_display_relpath: item.display_relpath || null,
    thumbnail_url: thumbnailUrl,
    image_url: imageUrl,
    alt_text: name,
    metadata: {
      mock_source: "telegram_webp_final",
      source_file_name: null,
      message_id: item.message_id || null,
      original_sha256: item.original_sha256 || null,
      display_bytes: item.display_bytes || null,
      thumb_bytes: item.thumb_bytes || null,
      cover_score: coverScore(item),
      content_rating: sensitivity === "safe" ? "safe" : sensitivity,
      should_blur: sensitivity !== "safe",
    },
    sort_order: index,
    image_role: index === 0 ? "primary_reference" : "gallery_reference",
    imageUrl,
    thumbnailUrl,
  };
}

function modelForGroup(group, index) {
  const item = group[0];
  const id = item.import_id || `telegram-webp-${item.message_id || index}`;
  const rawTags = publicTagsForGroup(group);
  const sensitivityCounts = group.reduce(
    (counts, entry) => {
      counts[sensitivityForItem(entry)] += 1;
      return counts;
    },
    { safe: 0, sensitive: 0, nsfw: 0 },
  );
  const hasSensitiveVariant =
    sensitivityCounts.nsfw > 0 || sensitivityCounts.sensitive > 0;
  const hasSafeVariant = sensitivityCounts.safe > 0;
  const tags =
    hasSensitiveVariant && hasSafeVariant
      ? [
          ...rawTags.filter(
            (tag) =>
              !["nsfw", "sensitive-blur", "sensitive-review"].includes(tag),
          ),
          "sensitive-has-variant",
        ]
      : rawTags;
  const imageUrl = mockUrl(item.display_relpath);
  const thumbnailUrl = mockUrl(item.thumb_relpath || item.display_relpath);
  const plannedPath = plannedRelativePath(item);
  const name = item.name || item.proposed_name || item.character_name || "Modelo Telegram";
  const sourceType = sourceTypeForItem(item);
  const contentRating =
    hasSensitiveVariant && !hasSafeVariant ? contentRatingForTags(tags) : null;
  const galleryImages = group.map((entry, galleryIndex) =>
    galleryImageForItem(entry, id, galleryIndex, name),
  );

  return {
    id,
    name,
    description: null,
    franchise: item.source_title || item.subcategory || null,
    category: item.category || null,
    subcategory: item.subcategory || null,
    tags,
    is_active: true,
    image_bucket: "mock-webp",
    image_path: plannedPath,
    source_image_path: item.display_relpath || null,
    planned_storage_path: item.storage_path || null,
    thumbnail_url: thumbnailUrl,
    created_at: createdAtForItem(item, index),
    price_mode: "consultation",
    price_standalone_override: null,
    price_coins_override: null,
    character_name: item.character_name || name,
    variant_name: item.variant_name || null,
    variant_type: item.variant_type || "default",
    source_title: item.source_title || item.subcategory || null,
    source_type: sourceType,
    catalog_visibility: item.catalog_visibility || "general",
    content_rating: contentRating,
    imageUrl,
    thumbnailUrl,
    galleryImages,
  };
}

async function main() {
  const raw = await fs.readFile(SITE_PLAN, "utf8");
  const plan = JSON.parse(raw);
  const readyItems = (plan.items || [])
    .filter((item) => item.status === "ready_for_import")
    .filter(matchesMockScope);
  const groups = groupedReadyItems(readyItems);
  const models = groups.map(modelForGroup);
  const payload = {
    generated_at: new Date().toISOString(),
    source_plan: SITE_PLAN,
    output_root: WEBP_OUTPUT,
    asset_base_url: ASSET_BASE_URL,
    machine: os.hostname(),
    summary: {
      total_site_plan_items: plan.items?.length || 0,
      ready_for_import: readyItems.length,
      grouped_models: models.length,
      gallery_images: readyItems.length,
      source_summary: plan.summary || null,
      source_filters: SOURCE_FILTERS,
      category_filters: CATEGORY_FILTERS,
    },
    models,
  };

  await fs.mkdir(MOCK_DIR, { recursive: true });
  await fs.writeFile(MOCK_JSON, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        generated_at: payload.generated_at,
        mock_json: MOCK_JSON,
        models: models.length,
        gallery_images: readyItems.length,
        asset_base_url: ASSET_BASE_URL,
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
