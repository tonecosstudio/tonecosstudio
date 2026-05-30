import { beforeEach, describe, expect, it, vi } from "vitest";

import {
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
  image_path: "stitch.webp",
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
};

describe("catalog models service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.storageFrom.mockReturnValue({ getPublicUrl: mocks.getPublicUrl });
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/stitch.webp" },
    });
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
      imageUrl: "https://cdn.example.com/stitch.webp",
      thumbnailUrl: "https://cdn.example.com/stitch.webp",
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
  });
});
