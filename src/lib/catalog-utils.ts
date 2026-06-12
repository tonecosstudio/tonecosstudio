import catalogTagPolicy from "@/config/catalog-tag-policy.json";

export type CatalogDisplayModel = {
  name?: string | null;
  franchise?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
  metadata?: unknown;
  content_rating?: string | null;
  character_name?: string | null;
  variant_name?: string | null;
  source_title?: string | null;
  source_type?: string | null;
  alt_text?: string | null;
  storage_path?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
};

const INTERNAL_TAG_PREFIXES = catalogTagPolicy.internalTagPrefixes;
const INTERNAL_TAGS = new Set(catalogTagPolicy.internalTags);
const PUBLIC_TAG_ALIASES: Record<string, string> =
  catalogTagPolicy.publicTagAliases;
const PUBLIC_TAG_BLOCKLIST = new Set(catalogTagPolicy.publicTagBlocklist);
const PUBLIC_TAG_STOPWORDS = new Set([
  "a",
  "as",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "o",
  "os",
  "the",
]);
const PUBLIC_OBJECT_TAG_ALIASES: Record<string, string> = {
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
  "chi chi",
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
  "senhor das estrelas",
  "tartarugas ninja",
  "the batman",
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
const OBJECT_LIKE_TAGS = new Set([
  ...NON_PUBLIC_PRODUCT_TAGS,
  ...Object.keys(PUBLIC_OBJECT_TAG_ALIASES),
  ...PUBLIC_PRODUCT_TYPE_TAGS,
]);

export type CatalogSensitivityLevel =
  | "standard"
  | "nsfw"
  | "sensitive-blur"
  | "sensitive-review"
  | "age-ambiguous-review";

export function normalizeCatalogTag(value: string | null | undefined): string {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

  return PUBLIC_TAG_ALIASES[normalized] || normalized;
}

function canonicalCatalogTag(value: string | null | undefined): string {
  return normalizeCatalogTag(value).replace(/\s+/g, "-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => stringValues(item));
  }

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (!text) return [];
    return text
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = normalizeCatalogTag(value);
  if (["true", "sim", "yes", "1"].includes(normalized)) return true;
  if (["false", "nao", "no", "0"].includes(normalized)) return false;
  return null;
}

function metadataTags(metadata: Record<string, unknown>): string[] {
  return [
    ...stringValues(metadata.tags),
    ...stringValues(metadata.catalog_tags),
    ...stringValues(metadata.sensitivity_tags),
    ...stringValues(metadata.content_tags),
  ];
}

function metadataRatings(metadata: Record<string, unknown>): string[] {
  const moderation = isRecord(metadata.moderation) ? metadata.moderation : {};
  return [
    ...stringValues(metadata.content_rating),
    ...stringValues(metadata.rating),
    ...stringValues(metadata.sensitivity),
    ...stringValues(moderation.content_rating),
    ...stringValues(moderation.rating),
  ];
}

function textHintTags(values: Array<string | null | undefined>): string[] {
  return values.flatMap((value) => [
    canonicalCatalogTag(value),
    ...normalizeCatalogTag(value)
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean),
  ]);
}

export function isInternalCatalogTag(tag: string | null | undefined): boolean {
  const canonicalTag = canonicalCatalogTag(tag);
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

export function isPublicCatalogTag(tag: string | null | undefined): boolean {
  const normalized = normalizeCatalogTag(tag);
  return (
    Boolean(normalized) &&
    !isInternalCatalogTag(normalized) &&
    !PUBLIC_TAG_BLOCKLIST.has(normalized)
  );
}

export function normalizeCatalogTags(
  tags: Array<string | null | undefined>,
  limit = 20,
): string[] {
  return Array.from(
    new Set(
      tags.map((tag) => normalizeCatalogTag(tag)).filter(isPublicCatalogTag),
    ),
  ).slice(0, limit);
}

function uniqueInOrder(values: string[]): string[] {
  return Array.from(new Set(values));
}

function publicConceptTagParts(value: string | null | undefined): string[] {
  const normalized = normalizeCatalogTag(value);
  if (!normalized || !isPublicCatalogTag(normalized)) return [];

  const objectAlias = PUBLIC_OBJECT_TAG_ALIASES[normalized];
  if (objectAlias) return [objectAlias];
  if (NON_PUBLIC_PRODUCT_TAGS.has(normalized)) return [];

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

  const parts: string[] = [];
  let phraseWords: string[] = [];
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

  return applyOfficialMultiwordTags(normalized, parts).filter(
    isPublicCatalogTag,
  );
}

function includesWordSequence(text: string, phrase: string): boolean {
  const textWords = text.split(/\s+/).filter(Boolean);
  const phraseWords = phrase.split(/\s+/).filter(Boolean);
  if (!phraseWords.length || phraseWords.length > textWords.length) {
    return false;
  }

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

function applyOfficialMultiwordTags(
  normalized: string,
  parts: string[],
): string[] {
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

  return uniqueInOrder(next);
}

function collapseMultiwordPublicTags(tags: string[]): string[] {
  let next = [...tags];

  for (const phrase of COLLAPSIBLE_MULTIWORD_PUBLIC_TAGS) {
    const phraseTag = phrase.replace(/\s+/g, "-");
    if (!next.includes(phraseTag) && !next.includes(phrase)) continue;

    const phraseWords = phrase
      .split(/\s+/)
      .filter((word) => !PUBLIC_TAG_STOPWORDS.has(word));

    next = next.filter(
      (tag) => tag === phraseTag || tag === phrase || !phraseWords.includes(tag),
    );
  }

  return uniqueInOrder(next);
}

function publicConceptTags(values: Array<string | null | undefined>): string[] {
  return collapseMultiwordPublicTags(
    uniqueInOrder(values.flatMap((value) => publicConceptTagParts(value))),
  );
}

function hasConceptTag(
  model: CatalogDisplayModel,
  concepts: Set<string>,
): boolean {
  return [
    model.category,
    model.subcategory,
    model.name,
    model.character_name,
    model.source_title,
    model.source_type,
    ...(model.tags ?? []),
  ]
    .flatMap((value) => publicConceptTagParts(value))
    .some((tag) => concepts.has(tag));
}

function isObjectLikeCatalogModel(model: CatalogDisplayModel): boolean {
  const subcategory = normalizeCatalogTag(model.subcategory);
  return (
    subcategory === "objetos" ||
    subcategory === "sets" ||
    hasConceptTag(model, OBJECT_LIKE_TAGS)
  );
}

export function getCatalogTagFilterValues(
  tag: string | null | undefined,
): string[] {
  const normalized = normalizeCatalogTag(tag);
  if (!isPublicCatalogTag(normalized)) return [];

  return Array.from(
    new Set([
      normalized,
      ...Object.entries(PUBLIC_TAG_ALIASES)
        .filter(([, canonical]) => canonical === normalized)
        .map(([alias]) => alias),
    ]),
  ).filter(isPublicCatalogTag);
}

export function getCatalogCharacterName(
  model: CatalogDisplayModel | null | undefined,
): string {
  return model?.character_name || model?.name || "Modelo";
}

export function getCatalogSourceName(
  model: CatalogDisplayModel | null | undefined,
): string | null {
  return model?.source_title || model?.franchise || null;
}

export function getCatalogVersionName(
  model: CatalogDisplayModel | null | undefined,
): string | null {
  return model?.variant_name || null;
}

export function buildModelTitle(
  name: string,
  franchise: string | null,
): string {
  if (!franchise) return name;
  return `${name} (${franchise})`;
}

export function compactTags(
  tags: string[] | null,
  limit: number = 2,
): string[] {
  if (!tags || tags.length === 0) return [];
  return normalizeCatalogTags(tags, limit);
}

export function getCatalogPublicTags(
  model: CatalogDisplayModel | null | undefined,
  limit = 8,
): string[] {
  if (!model) return [];

  const categoryTags = publicConceptTags([model.category]);
  const sourceTags = publicConceptTags([getCatalogSourceName(model)]);
  const typeTags = publicConceptTags([
    model.source_type === "anime" ? "anime" : model.source_type,
  ]);
  const storedTags = publicConceptTags(model.tags ?? []);
  const titleParts = publicConceptTags([model.name, model.character_name]);
  const productTypeTags = uniqueInOrder([...storedTags, ...titleParts]).filter(
    (tag) => PUBLIC_PRODUCT_TYPE_TAGS.has(tag),
  );
  const isObjectLike = isObjectLikeCatalogModel(model);

  const candidates = isObjectLike
    ? [
        ...categoryTags,
        ...productTypeTags,
        ...titleParts.filter((tag) => !PUBLIC_PRODUCT_TYPE_TAGS.has(tag)),
        ...storedTags.filter(
          (tag) =>
            !categoryTags.includes(tag) &&
            !productTypeTags.includes(tag) &&
            !sourceTags.includes(tag),
        ),
        ...sourceTags,
        ...typeTags,
      ]
    : [
        ...categoryTags,
        ...titleParts,
        ...productTypeTags,
        ...storedTags.filter(
          (tag) =>
            !categoryTags.includes(tag) &&
            !titleParts.includes(tag) &&
            !productTypeTags.includes(tag),
        ),
        ...sourceTags,
        ...typeTags,
      ];

  return uniqueInOrder(candidates.filter(isPublicCatalogTag)).slice(0, limit);
}

export function getCatalogSensitivity(
  model: CatalogDisplayModel | null | undefined,
): {
  level: CatalogSensitivityLevel;
  shouldBlur: boolean;
  label: string | null;
} {
  const metadata: Record<string, unknown> = isRecord(model?.metadata)
    ? model.metadata
    : {};
  const textHints = [
    model?.variant_name,
    model?.alt_text,
    model?.storage_path,
    model?.image_url,
    model?.thumbnail_url,
  ];
  const explicitTags = new Set(
    [
      ...(model?.tags ?? []),
      ...metadataTags(metadata),
      ...metadataRatings(metadata),
      model?.content_rating,
    ].map(canonicalCatalogTag),
  );
  const hintTags = new Set(textHintTags(textHints).map(canonicalCatalogTag));
  const tags = new Set([...explicitTags, ...hintTags]);
  const explicitSafe =
    explicitTags.has("safe") ||
    explicitTags.has("standard") ||
    explicitTags.has("general") ||
    explicitTags.has("normal") ||
    explicitTags.has("sfw") ||
    booleanValue(metadata.nsfw) === false ||
    booleanValue(metadata.is_nsfw) === false ||
    booleanValue(metadata.should_blur) === false;

  if (
    booleanValue(metadata.should_blur) === true ||
    booleanValue(metadata.nsfw) === true ||
    booleanValue(metadata.is_nsfw) === true ||
    explicitTags.has("nsfw") ||
    explicitTags.has("adult") ||
    explicitTags.has("adulto") ||
    explicitTags.has("mature") ||
    explicitTags.has("explicit")
  ) {
    return {
      level: "nsfw",
      shouldBlur: true,
      label: "Conteudo NSFW",
    };
  }

  if (explicitSafe) {
    return { level: "standard", shouldBlur: false, label: null };
  }

  if (
    hintTags.has("nsfw") ||
    hintTags.has("adult") ||
    hintTags.has("adulto") ||
    hintTags.has("mature") ||
    hintTags.has("explicit")
  ) {
    return {
      level: "nsfw",
      shouldBlur: true,
      label: "Conteudo NSFW",
    };
  }

  if (tags.has("sensitive-blur")) {
    return {
      level: "sensitive-blur",
      shouldBlur: true,
      label: "Conteudo sensivel",
    };
  }

  if (tags.has("age-ambiguous-review")) {
    return {
      level: "age-ambiguous-review",
      shouldBlur: true,
      label: "Revisao necessaria",
    };
  }

  if (tags.has("sensitive-review")) {
    return {
      level: "sensitive-review",
      shouldBlur: true,
      label: "Revisao de conteudo",
    };
  }

  return { level: "standard", shouldBlur: false, label: null };
}

export function getCatalogTitle(
  model: CatalogDisplayModel | null | undefined,
): string {
  const characterName = getCatalogCharacterName(model);
  const sourceName = getCatalogSourceName(model);
  const versionName = getCatalogVersionName(model);

  if (versionName) return `${characterName} - ${versionName}`;
  return buildModelTitle(characterName, sourceName);
}
