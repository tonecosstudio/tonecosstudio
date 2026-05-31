import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCharacterDetailsById } from "./public-collections-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: vi.fn(),
    },
  },
}));

type MaybeSingleResult = {
  data: unknown;
  error: unknown;
};

function createMaybeSingleQuery(result: MaybeSingleResult) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };

  return query;
}

describe("public collections service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it("uses the canonical character detail projection", async () => {
    const characterRow = {
      id: "character-1",
      name: "Lion-O",
      description: "Leader",
      image_url: "https://cdn.example.com/liono-1.webp",
      image_urls: [
        "https://cdn.example.com/liono-1.webp",
        "https://cdn.example.com/liono-2.webp",
      ],
      status: "released",
      is_catalog: false,
      collection_id: "collection-1",
      franchise: "ThunderCats",
      product_line: "Heroes",
      theme_category: "Leader",
      release_order: 1,
      release_month: 5,
      release_date: "2026-05-31",
      stock_quantity: 10,
      price_category_id: "price-1",
      price_categories: {
        display_name: "Premium",
        price_coins: 450,
        price_standalone: 12900,
      },
      collections: {
        id: "collection-1",
        name: "ThunderCats",
        slug: "thundercats",
        description: "Classic collection",
        cover_image_url: "https://cdn.example.com/cover.webp",
        total_characters: 8,
      },
    };
    const query = createMaybeSingleQuery({ data: characterRow, error: null });
    mocks.select.mockReturnValue(query);

    const character = await getCharacterDetailsById("character-1");

    expect(mocks.from).toHaveBeenCalledWith("collection_characters");
    expect(mocks.select).toHaveBeenCalledTimes(1);
    const projection = String(mocks.select.mock.calls[0][0]);
    expect(projection).toContain("image_urls");
    expect(projection).toContain("franchise");
    expect(projection).toContain("product_line");
    expect(projection).toContain("theme_category");
    expect(projection).toContain("stock_quantity");
    expect(projection).toContain("total_characters");
    expect(query.eq).toHaveBeenCalledWith("id", "character-1");
    expect(character).toMatchObject({
      id: "character-1",
      image_urls: characterRow.image_urls,
      franchise: "ThunderCats",
      stock_quantity: 10,
      collections: {
        total_characters: 8,
      },
    });
  });

  it("does not hide schema drift behind a legacy fallback", async () => {
    const schemaError = {
      code: "42703",
      message: "column collection_characters.image_urls does not exist",
    };
    mocks.select.mockReturnValue(
      createMaybeSingleQuery({ data: null, error: schemaError }),
    );

    await expect(getCharacterDetailsById("character-1")).rejects.toBe(
      schemaError,
    );
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
});
