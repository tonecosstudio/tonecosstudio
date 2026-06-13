import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_CHARACTER_PRESENTATION_OVERRIDES } from "@/config/catalog-character-presentation";

import {
  getPublicCatalogSummary,
  getCatalogModelDetails,
  getCatalogCharacterContextBySlug,
  listCatalogCharacters,
  listCatalogCharacterModels,
  listCatalogModels,
  listRecentLandingModels,
  type CatalogModelFilters,
} from "./catalog-models-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  storageFrom: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

type QueryResult = {
  data: unknown[] | null;
  error: unknown;
};

function createCatalogQuery(result: QueryResult) {
  const query = {
    contains: vi.fn(() => query),
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() =>
      Promise.resolve({
        data: result.data?.[0] ?? null,
        error: result.error,
      }),
    ),
    not: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    overlaps: vi.fn(() => query),
    range: vi.fn(() => query),
    then: vi.fn(
      (
        resolve: (value: QueryResult) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    ),
  };

  return query;
}

const professionalColumns = [
  "price_mode",
  "price_standalone_override",
  "price_coins_override",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "source_type",
  "catalog_visibility",
  "canonical_identity_key",
  "duplicate_status",
  "duplicate_of_model_id",
];

const modelRow = {
  id: "model-1",
  name: "Stitch",
  franchise: "Lilo & Stitch",
  category: "filmes",
  subcategory: null,
  tags: ["stitch"],
  is_active: true,
  image_bucket: "models",
  image_path:
    "catalog-webp-final/display/filmes/lilo-and-stitch/stitch/stitch.webp",
  thumbnail_url: null,
  created_at: "2026-05-29T23:29:39.375424+00:00",
  price_mode: "consultation",
  price_standalone_override: null,
  price_coins_override: null,
  character_name: "Stitch",
  variant_name: null,
  variant_type: "default",
  source_title: "Lilo & Stitch",
  source_type: "movie",
  catalog_visibility: "general",
  canonical_identity_key: "stitch-base",
  duplicate_status: "unique",
  duplicate_of_model_id: null,
};

describe("catalog models service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    Object.keys(CATALOG_CHARACTER_PRESENTATION_OVERRIDES).forEach((key) => {
      delete CATALOG_CHARACTER_PRESENTATION_OVERRIDES[key];
    });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.storageFrom.mockReturnValue({ getPublicUrl: mocks.getPublicUrl });
    mocks.getPublicUrl.mockImplementation((filePath: string) => ({
      data: { publicUrl: `https://cdn.example.com/${filePath}` },
    }));
  });

  it("uses the canonical professional catalog projection and visibility filter", async () => {
    const query = createCatalogQuery({ data: [modelRow], error: null });
    mocks.select.mockReturnValue(query);

    const models = await listRecentLandingModels(6);

    expect(mocks.from).toHaveBeenCalledWith("models");
    expect(mocks.select).toHaveBeenCalledTimes(1);
    const selectedColumns = String(mocks.select.mock.calls[0][0]).split(",");
    expect(selectedColumns).toEqual(
      expect.arrayContaining(professionalColumns),
    );
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.in).toHaveBeenCalledWith("catalog_visibility", [
      "general",
      "both",
    ]);
    expect(models[0]).toMatchObject({
      id: "model-1",
      imageUrl:
        "https://cdn.example.com/catalog-webp-final/display/filmes/lilo-and-stitch/stitch/stitch.webp",
      thumbnailUrl:
        "https://cdn.example.com/catalog-webp-final/display/filmes/lilo-and-stitch/stitch/stitch.webp",
    });
  });

  it("does not hide schema drift behind a legacy fallback query", async () => {
    const schemaError = {
      code: "PGRST204",
      message: "Could not find the catalog_visibility column",
    };
    mocks.select.mockReturnValue(
      createCatalogQuery({ data: null, error: schemaError }),
    );

    await expect(listRecentLandingModels(6)).rejects.toBe(schemaError);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it("uses canonical search fields for catalog listing", async () => {
    const query = createCatalogQuery({ data: [modelRow], error: null });
    mocks.select.mockReturnValue(query);
    const filters: CatalogModelFilters = {
      character: "stitch",
      franchise: "lilo",
      category: "filmes",
      sourceType: "movie",
      variantType: "default",
      tagsCSV: "stitch,disney",
      catalogMode: "public",
      sort: "recent",
    };

    await listCatalogModels({ needle: "stitch", page: 0, filters });

    expect(query.in).toHaveBeenCalledWith("catalog_visibility", [
      "general",
      "both",
    ]);
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("character_name.ilike.stitch%"),
    );
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("source_title.ilike.%lilo%"),
    );
    expect(query.eq).toHaveBeenCalledWith("source_type", "movie");
    expect(query.eq).toHaveBeenCalledWith("variant_type", "default");
    expect(query.overlaps).toHaveBeenCalledWith("tags", ["stitch", "disney"]);
  });

  it("groups public catalog cards by product identity instead of only character", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-3",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-3-1-173487.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-3",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogModels({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.id).toBe("model-1");
    expect(result.rows[1]?.id).toBe("model-3");
  });

  it("groups universo root cards by character identity", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-3-1-173487.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-3",
        },
        {
          ...modelRow,
          id: "model-3",
          source_title: "Dragon Ball",
          character_name: "Goku",
          image_path:
            "catalog-webp-final/display/anime/sayajins/goku/goku-1-173490.webp",
          canonical_identity_key: "dragon-ball:goku:goku-1",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogCharacters({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      character_name: "Freeza",
      model_count: 2,
    });
    expect(result.rows[1]).toMatchObject({
      character_name: "Goku",
      model_count: 1,
    });
  });

  it("prefers a representative public figure as the character cover", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-close",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          name: "Freeza Close",
          variant_name: "Close",
          variant_type: "variant",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-close-1.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-close",
          created_at: "2026-06-10T10:00:00.000000+00:00",
        },
        {
          ...modelRow,
          id: "model-bust",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          name: "Busto Freeza",
          variant_name: "Busto",
          variant_type: "variant",
          tags: ["freeza", "busto"],
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/busto-freeza-1.webp",
          canonical_identity_key: "dragon-ball:freeza:busto-freeza",
          created_at: "2026-06-11T10:00:00.000000+00:00",
        },
        {
          ...modelRow,
          id: "model-figure",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          name: "Freeza",
          variant_name: null,
          variant_type: "default",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
          created_at: "2026-06-09T10:00:00.000000+00:00",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogCharacters({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      character_name: "Freeza",
      latest_model_id: "model-figure",
    });
  });

  it("allows a manual character cover override", async () => {
    CATALOG_CHARACTER_PRESENTATION_OVERRIDES["dragon ball::freeza"] = {
      coverModelId: "model-close",
    };

    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-close",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          name: "Freeza Close",
          variant_name: "Close",
          variant_type: "variant",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-close-1.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-close",
          created_at: "2026-06-10T10:00:00.000000+00:00",
        },
        {
          ...modelRow,
          id: "model-figure",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          name: "Freeza",
          variant_name: null,
          variant_type: "default",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
          created_at: "2026-06-09T10:00:00.000000+00:00",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogCharacters({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      character_name: "Freeza",
      latest_model_id: "model-close",
    });
  });

  it("lists character page models grouped by product", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-3",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-3-1-173487.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-3",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const models = await listCatalogCharacterModels({
      characterName: "Freeza",
      sourceTitle: "Dragon Ball",
    });

    expect(models).toHaveLength(2);
    expect(models[0]?.id).toBe("model-1");
    expect(models[1]?.id).toBe("model-3");
  });

  it("resolves a clean character slug back to character context", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-3-1-173487.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-3",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const context = await getCatalogCharacterContextBySlug("freeza-dragon-ball");

    expect(context).toEqual({
      slug: "freeza-dragon-ball",
      characterName: "Freeza",
      sourceTitle: "Dragon Ball",
    });
  });

  it("returns public catalog summary using the same grouped public rules", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "dragon-ball:freeza:freeza-1",
        },
        {
          ...modelRow,
          id: "model-3",
          source_title: "Dragon Ball",
          character_name: "Goku",
          image_path:
            "catalog-webp-final/display/anime/sayajins/goku/goku-1-173490.webp",
          canonical_identity_key: "dragon-ball:goku:goku-1",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const summary = await getPublicCatalogSummary();

    expect(summary).toEqual({
      characterCount: 2,
      modelCount: 2,
    });
  });

  it("expands public tag aliases and drops internal tags before filtering", async () => {
    const query = createCatalogQuery({ data: [modelRow], error: null });
    mocks.select.mockReturnValue(query);
    const filters: CatalogModelFilters = {
      character: "",
      franchise: "",
      category: "",
      sourceType: "",
      variantType: "",
      tagsCSV: "Filmes, price-consultation, Revisar",
      catalogMode: "public",
      sort: "recent",
    };

    await listCatalogModels({ needle: "", page: 0, filters });

    expect(query.overlaps).toHaveBeenCalledWith("tags", [
      "filme",
      "filmes",
      "movie",
    ]);
  });

  it("uses an NSFW gallery variation as the blurred preview in NSFW mode", async () => {
    vi.stubEnv("VITE_ENABLE_MODEL_GALLERY", "true");
    const modelQuery = createCatalogQuery({
      data: [{ ...modelRow, tags: ["stitch", "sensitive-has-variant"] }],
      error: null,
    });
    const galleryQuery = createCatalogQuery({
      data: [
        {
          id: "gallery-1",
          model_id: "model-1",
          source_drive_file_id: null,
          storage_bucket: "models",
          storage_path: "stitch-nsfw.webp",
          thumbnail_url: null,
          image_url: null,
          alt_text: "Stitch NSFW variant",
          metadata: { content_rating: "nsfw" },
          sort_order: 1,
          image_role: "variant_reference",
        },
      ],
      error: null,
    });
    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => modelQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => galleryQuery) });

    const result = await listCatalogModels({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "nsfw",
        sort: "recent",
      },
    });

    expect(modelQuery.overlaps).toHaveBeenCalledWith("tags", [
      "nsfw",
      "sensitive-blur",
      "sensitive-review",
      "sensitive-has-variant",
    ]);
    expect(galleryQuery.in).toHaveBeenCalledWith("model_id", ["model-1"]);
    expect(result.rows[0]).toMatchObject({
      imageUrl: "https://cdn.example.com/stitch-nsfw.webp",
      thumbnailUrl: "https://cdn.example.com/stitch-nsfw.webp",
      content_rating: "nsfw",
    });
  });

  it("builds fallback gallery images only from the same published product group when gallery table is disabled", async () => {
    const detailQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
      ],
      error: null,
    });
    const siblingsQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
        {
          ...modelRow,
          id: "model-3",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-3-1-173487.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-3",
        },
      ],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => detailQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => siblingsQuery) });

    const result = await getCatalogModelDetails("model-1");

    expect(result?.galleryImages).toHaveLength(2);
    expect(result?.galleryImages?.map((image) => image.id)).toEqual([
      "model-1",
      "model-2",
    ]);
  });

  it("canonicalizes detail pages to one public row per product group", async () => {
    const detailQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
      ],
      error: null,
    });
    const siblingsQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "model-1",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
        {
          ...modelRow,
          id: "model-2",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path: "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-2-173050.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
        },
      ],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => detailQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => siblingsQuery) });

    const result = await getCatalogModelDetails("model-2");

    expect(result?.id).toBe("model-1");
    expect(result?.galleryImages?.map((image) => image.id)).toEqual([
      "model-1",
      "model-2",
    ]);
  });

  it("does not merge broad character buckets with distinct canonical product identities", async () => {
    const detailQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "piccolo-base",
          source_title: "Dragon Ball",
          character_name: "Piccolo",
          image_path:
            "catalog-webp-final/display/anime/namekusei/piccolo/piccolo-1-172153.webp",
          canonical_identity_key: "display|anime|namekusei|piccolo",
        },
      ],
      error: null,
    });
    const siblingsQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "piccolo-base",
          source_title: "Dragon Ball",
          character_name: "Piccolo",
          image_path:
            "catalog-webp-final/display/anime/namekusei/piccolo/piccolo-1-172153.webp",
          canonical_identity_key: "display|anime|namekusei|piccolo",
        },
        {
          ...modelRow,
          id: "piccolo-figure-1",
          source_title: "Dragon Ball",
          character_name: "Piccolo",
          variant_name: "Figura",
          image_path:
            "catalog-webp-final/display/anime/namekusei/piccolo/piccolo-figura-74-120008.webp",
          canonical_identity_key: "display|anime|namekusei|piccolo-figura",
        },
      ],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => detailQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => siblingsQuery) });

    const result = await getCatalogModelDetails("piccolo-base");

    expect(result?.id).toBe("piccolo-base");
    expect(result?.galleryImages).toEqual([]);
  });

  it("merges same product families when one variant is only an accessory suffix", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "android-21-base",
          source_title: "Dragon Ball",
          character_name: "Androide 21",
          variant_name: "Android 21 Majin",
          image_path:
            "catalog-webp-final/display/anime/android/androide-21/android-21-majin-1-179072.webp",
          canonical_identity_key: "display|anime|android|android-21-majin",
        },
        {
          ...modelRow,
          id: "android-21-candy",
          source_title: "Dragon Ball",
          character_name: "Androide 21",
          variant_name: "Android 21 Majin Candy",
          image_path:
            "catalog-webp-final/display/anime/android/androide-21/android-21-majin-candy-1-179791.webp",
          canonical_identity_key: "display|anime|android|android-21-majin-candy",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogModels({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe("android-21-base");
  });

  it("hides rows marked as duplicates from the public catalog", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "freeza-primary",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
        {
          ...modelRow,
          id: "freeza-duplicate",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Forma Final",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-final-form-1-177691.webp",
          canonical_identity_key:
            "display|anime|raca-do-freeza|freeza-final-form",
          duplicate_status: "identity_duplicate",
          duplicate_of_model_id: "freeza-primary",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogModels({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe("freeza-primary");
  });

  it("hides staging and import asset paths from the public catalog", async () => {
    const query = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "published-final",
          image_path: "catalog-webp-final/display/anime/sayajins/goku/goku-1.webp",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
        {
          ...modelRow,
          id: "staging-row",
          image_path: "catalog-staging/animes/dragon-ball/goku.webp",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
        {
          ...modelRow,
          id: "import-row",
          image_path: "catalog-import/catalogo-raiz-genericos/optimized/goku.webp",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogModels({
      needle: "",
      page: 0,
      filters: {
        character: "",
        franchise: "",
        category: "",
        sourceType: "",
        variantType: "",
        tagsCSV: "",
        catalogMode: "public",
        contentMode: "general",
        sort: "recent",
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe("published-final");
  });

  it("redirects duplicate detail rows to the primary published model", async () => {
    const detailQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "freeza-duplicate",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Forma Final",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-final-form-1-177691.webp",
          canonical_identity_key:
            "display|anime|raca-do-freeza|freeza-final-form",
          duplicate_status: "identity_duplicate",
          duplicate_of_model_id: "freeza-primary",
        },
      ],
      error: null,
    });
    const primaryDetailQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "freeza-primary",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
      ],
      error: null,
    });
    const siblingsQuery = createCatalogQuery({
      data: [
        {
          ...modelRow,
          id: "freeza-primary",
          source_title: "Dragon Ball",
          character_name: "Freeza",
          variant_name: "Versao 1",
          image_path:
            "catalog-webp-final/display/anime/raca-do-freeza/freeza/freeza-1-1-173049.webp",
          canonical_identity_key: "display|anime|raca-do-freeza|freeza-1",
          duplicate_status: "unique",
          duplicate_of_model_id: null,
        },
      ],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => detailQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => primaryDetailQuery) })
      .mockReturnValueOnce({ select: vi.fn(() => siblingsQuery) });

    const result = await getCatalogModelDetails("freeza-duplicate");

    expect(result?.id).toBe("freeza-primary");
  });
});
