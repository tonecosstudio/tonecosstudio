import {
  CATALOG_PAGE_SIZE,
  PUBLIC_CATALOG_VISIBILITIES,
} from "@/config/catalog";
import {
  getCatalogSensitivity,
  getCatalogTagFilterValues,
  normalizeCatalogTag,
} from "@/lib/catalog-utils";
import type {
  CatalogModelDetailsRow,
  CatalogModelRow,
} from "@/types/catalog";
import type { CatalogModelFilters } from "./catalog-models-service";

type MockCatalogPayload = {
  generated_at: string;
  asset_base_url: string;
  summary?: {
    ready_for_import?: number;
    total_site_plan_items?: number;
  };
  models: CatalogModelDetailsRow[];
};

const TRUE_VALUES = new Set(["1", "true", "sim", "yes", "webp", "mock"]);
const FALSE_VALUES = new Set(["0", "false", "nao", "no", "off", "real"]);
let mockCatalogPromise: Promise<MockCatalogPayload> | null = null;

function envMockEnabled() {
  const value = String(import.meta.env.VITE_CATALOG_WEBP_MOCK || "")
    .trim()
    .toLocaleLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return false;
}

export function isWebpCatalogMockEnabled() {
  return envMockEnabled();
}

function mockCatalogUrl() {
  return (
    import.meta.env.VITE_CATALOG_WEBP_MOCK_URL ||
    "/mock-catalog/telegram-webp-ready-preview.json"
  );
}

async function loadMockCatalog() {
  if (!mockCatalogPromise) {
    mockCatalogPromise = fetch(mockCatalogUrl()).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Catalog WebP mock nao encontrado: ${response.status}`);
      }
      return (await response.json()) as MockCatalogPayload;
    });
  }

  return mockCatalogPromise;
}

function searchableText(model: CatalogModelRow) {
  return [
    model.name,
    model.character_name,
    model.variant_name,
    model.source_title,
    model.franchise,
    model.category,
    model.subcategory,
    ...(model.tags ?? []),
  ]
    .map((value) => normalizeCatalogTag(value))
    .filter(Boolean)
    .join(" ");
}

function normalizeSearchValue(value: string) {
  return normalizeCatalogTag(value)
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagsForFilter(tagsCSV: string) {
  return Array.from(
    new Set(
      tagsCSV.split(",").flatMap((tag) => getCatalogTagFilterValues(tag)),
    ),
  );
}

function modelTagSet(model: CatalogModelRow) {
  return new Set((model.tags ?? []).map((tag) => normalizeCatalogTag(tag)));
}

function sensitiveGalleryPreview(model: CatalogModelRow) {
  const details = model as CatalogModelDetailsRow;
  return (details.galleryImages ?? []).find((image) => {
    const sensitivity = getCatalogSensitivity(image);
    return (
      sensitivity.shouldBlur && sensitivity.level !== "age-ambiguous-review"
    );
  });
}

function hasSensitiveVariant(model: CatalogModelRow) {
  return (
    modelTagSet(model).has("sensitive has variant") ||
    Boolean(sensitiveGalleryPreview(model))
  );
}

function textContains(model: CatalogModelRow, value: string) {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return true;
  return searchableText(model).includes(normalized);
}

function categoryMatches(model: CatalogModelRow, value: string) {
  const filter = normalizeCatalogTag(value);
  if (!filter) return true;

  const category = normalizeCatalogTag(model.category);
  const sourceType = normalizeCatalogTag(model.source_type);
  const tags = modelTagSet(model);

  if (["quadrinhos", "hq", "comic"].includes(filter)) {
    return sourceType === "comic" || category === "marvel" || category === "dc";
  }
  if (["jogos", "games", "game"].includes(filter)) {
    return sourceType === "game" || category === "games";
  }
  if (["animes", "anime"].includes(filter)) {
    return sourceType === "anime" || category === "anime";
  }
  if (
    [
      "animacao",
      "animation",
      "cartoon",
      "cartoons",
      "desenho",
      "desenhos",
      "desenho animacao",
      "desenhos animacao",
    ].includes(filter)
  ) {
    return category === "desenhos animacao" || tags.has("desenhos");
  }
  if (["filmes", "filme", "movie"].includes(filter)) {
    return sourceType === "movie" || category === "filmes series";
  }
  if (["series", "serie"].includes(filter)) {
    return sourceType === "series";
  }
  if (filter === "nsfw") {
    return getCatalogSensitivity(model).shouldBlur || hasSensitiveVariant(model);
  }

  return category === filter || tags.has(filter);
}

function sourceTypeMatches(model: CatalogModelRow, value: string) {
  const filter = normalizeCatalogTag(value);
  if (!filter) return true;
  return normalizeCatalogTag(model.source_type) === filter;
}

function variantTypeMatches(model: CatalogModelRow, value: string) {
  const filter = normalizeCatalogTag(value);
  if (!filter) return true;
  return normalizeCatalogTag(model.variant_type) === filter;
}

function tagsMatch(model: CatalogModelRow, tagsCSV: string) {
  const filters = tagsForFilter(tagsCSV);
  if (filters.length === 0) return true;
  const tags = modelTagSet(model);
  return filters.some((tag) => tags.has(normalizeCatalogTag(tag)));
}

function visibilityMatches(model: CatalogModelRow, filters: CatalogModelFilters) {
  if (filters.catalogMode === "staging") return true;
  return PUBLIC_CATALOG_VISIBILITIES.includes(
    (model.catalog_visibility || "general") as "general" | "both",
  );
}

function contentModeMatches(model: CatalogModelRow, filters: CatalogModelFilters) {
  const sensitivity = getCatalogSensitivity(model);
  if (filters.contentMode === "nsfw") {
    return (
      (sensitivity.shouldBlur && sensitivity.level !== "age-ambiguous-review") ||
      hasSensitiveVariant(model)
    );
  }
  return !sensitivity.shouldBlur;
}

function modelMatchesFilters(
  model: CatalogModelRow,
  needle: string,
  filters: CatalogModelFilters,
) {
  return (
    visibilityMatches(model, filters) &&
    contentModeMatches(model, filters) &&
    textContains(model, needle) &&
    textContains(model, filters.franchise) &&
    textContains(model, filters.character) &&
    categoryMatches(model, filters.category) &&
    sourceTypeMatches(model, filters.sourceType) &&
    variantTypeMatches(model, filters.variantType) &&
    tagsMatch(model, filters.tagsCSV)
  );
}

function sortModels(models: CatalogModelRow[], sort: CatalogModelFilters["sort"]) {
  return [...models].sort((left, right) => {
    if (sort === "az") {
      return String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
    }

    return (
      Date.parse(right.created_at || "") - Date.parse(left.created_at || "") ||
      String(right.id).localeCompare(String(left.id))
    );
  });
}

function scoreByPreferenceTags(
  model: CatalogModelRow,
  preferenceTags: Set<string>,
) {
  if (!preferenceTags.size) return 0;
  return (model.tags ?? []).reduce(
    (score, tag) =>
      score + (preferenceTags.has(normalizeCatalogTag(tag)) ? 1 : 0),
    0,
  );
}

function applyMockNsfwGalleryPreview(model: CatalogModelRow) {
  const preview = sensitiveGalleryPreview(model);
  if (!preview?.imageUrl) return model;

  return {
    ...model,
    imageUrl: preview.imageUrl,
    thumbnailUrl: preview.thumbnailUrl ?? preview.imageUrl,
    content_rating: "nsfw",
  };
}

export async function listMockCatalogModels(params: {
  needle: string;
  page: number;
  filters: CatalogModelFilters;
}) {
  const catalog = await loadMockCatalog();
  const filtered = sortModels(
    catalog.models.filter((model) =>
      modelMatchesFilters(model, params.needle, params.filters),
    ),
    params.filters.sort,
  );
  const from = params.page * CATALOG_PAGE_SIZE;
  const rows = filtered
    .slice(from, from + CATALOG_PAGE_SIZE)
    .map((model) =>
      params.filters.contentMode === "nsfw"
        ? applyMockNsfwGalleryPreview(model)
        : model,
    );

  return {
    rows,
    hasNext: filtered.length > from + CATALOG_PAGE_SIZE,
  };
}

export async function listMockForYouCatalogModels(params: {
  excludedIds: string[];
  preferenceTags: Set<string>;
}) {
  const catalog = await loadMockCatalog();
  const excluded = new Set(params.excludedIds);
  const filters: CatalogModelFilters = {
    character: "",
    franchise: "",
    category: "",
    sourceType: "",
    variantType: "",
    tagsCSV: "",
    catalogMode: "public",
    contentMode: "general",
    sort: "recent",
  };

  return catalog.models
    .filter((model) => !excluded.has(model.id))
    .filter((model) => modelMatchesFilters(model, "", filters))
    .sort(
      (left, right) =>
        scoreByPreferenceTags(right, params.preferenceTags) -
          scoreByPreferenceTags(left, params.preferenceTags) ||
        Date.parse(right.created_at || "") - Date.parse(left.created_at || ""),
    )
    .slice(0, 8);
}

export async function getMockCatalogModelDetails(modelId: string) {
  const catalog = await loadMockCatalog();
  return catalog.models.find((model) => model.id === modelId) ?? null;
}

export async function listRecentMockCatalogModels(limit = 6) {
  const catalog = await loadMockCatalog();
  const filters: CatalogModelFilters = {
    character: "",
    franchise: "",
    category: "",
    sourceType: "",
    variantType: "",
    tagsCSV: "",
    catalogMode: "public",
    contentMode: "general",
    sort: "recent",
  };

  return sortModels(
    catalog.models.filter((model) => modelMatchesFilters(model, "", filters)),
    "recent",
  ).slice(0, limit);
}
