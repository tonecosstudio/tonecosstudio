import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countCharactersByPriceCategory,
  deleteCatalogCharacterById,
  deletePriceCategory,
  fetchCatalogCharacters,
  fetchPriceCategories,
  fetchUniqueProductLines,
  fetchUniqueThemeCategories,
  saveCatalogCharacter,
  savePriceCategory,
} from "./admin-credit-characters-service";

const CHARACTER_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  callAdminRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

function orderedQuery(result: unknown) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const not = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq, not, order });
  return { select, eq, not, order };
}

function countQuery(result: unknown) {
  const eq = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq };
}

const validCharacter = {
  name: "  Heroi  ",
  description: "  Descricao  ",
  status: "released",
  price_category_id: CATEGORY_ID,
  theme_category: "  Anime  ",
  product_line: "  Premium  ",
  image_url: "https://example.com/hero.png",
  is_catalog: true,
};

const validCategory = {
  name: " premium ",
  display_name: " Premium ",
  price_coins: 100,
  coin_value_in_cents: 500,
  price_standalone: 15000,
  display_order: 2,
  is_active: true,
};

describe("admin-credit-characters-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads and normalizes catalog characters", async () => {
    const query = orderedQuery({
      data: [{ id: CHARACTER_ID, name: "Heroi", is_catalog: true }],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(fetchCatalogCharacters()).resolves.toEqual([
      { id: CHARACTER_ID, name: "Heroi", is_catalog: true },
    ]);
    expect(mocks.from).toHaveBeenCalledWith("collection_characters");
    expect(query.eq).toHaveBeenCalledWith("is_catalog", true);
    expect(query.order).toHaveBeenCalledWith("name");
  });

  it("fails closed when a persisted catalog character has no name", async () => {
    mocks.from.mockReturnValue(
      orderedQuery({ data: [{ id: CHARACTER_ID, name: null, is_catalog: true }], error: null }),
    );
    await expect(fetchCatalogCharacters()).rejects.toThrow(`Personagem ${CHARACTER_ID} possui nome ausente`);
  });

  it("propagates catalog query failures", async () => {
    mocks.from.mockReturnValue(orderedQuery({ data: null, error: new Error("catalog failed") }));
    await expect(fetchCatalogCharacters()).rejects.toThrow("catalog failed");
  });

  it("reads canonical price categories and preserves nullable optionals", async () => {
    mocks.from.mockReturnValue(
      orderedQuery({
        data: [
          {
            id: CATEGORY_ID,
            name: "premium",
            display_name: "Premium",
            price_coins: 100,
            coin_value_in_cents: null,
            price_standalone: 15000,
            display_order: null,
            is_active: null,
          },
        ],
        error: null,
      }),
    );

    await expect(fetchPriceCategories()).resolves.toEqual([
      {
        id: CATEGORY_ID,
        name: "premium",
        display_name: "Premium",
        price_coins: 100,
        coin_value_in_cents: undefined,
        price_standalone: 15000,
        display_order: undefined,
        is_active: undefined,
      },
    ]);
  });

  it("deduplicates non-empty theme categories", async () => {
    const query = orderedQuery({
      data: [{ theme_category: "Anime" }, { theme_category: "Anime" }, { theme_category: "Games" }, { theme_category: null }],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(fetchUniqueThemeCategories()).resolves.toEqual(["Anime", "Games"]);
    expect(query.not).toHaveBeenCalledWith("theme_category", "is", null);
    expect(query.order).toHaveBeenCalledWith("theme_category");
  });

  it("deduplicates non-empty product lines", async () => {
    const query = orderedQuery({
      data: [{ product_line: "Premium" }, { product_line: "Premium" }, { product_line: "Standard" }, { product_line: null }],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(fetchUniqueProductLines()).resolves.toEqual(["Premium", "Standard"]);
    expect(query.not).toHaveBeenCalledWith("product_line", "is", null);
  });

  it("sanitizes and sends a catalog character through the admin RPC", async () => {
    mocks.callAdminRpc.mockResolvedValue(null);

    await saveCatalogCharacter(CHARACTER_ID, validCharacter);

    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_upsert_catalog_character", {
      p_character_id: CHARACTER_ID,
      p_name: "Heroi",
      p_description: "Descricao",
      p_status: "released",
      p_price_category_id: CATEGORY_ID,
      p_theme_category: "Anime",
      p_product_line: "Premium",
      p_image_url: "https://example.com/hero.png",
      p_is_catalog: true,
    });
  });

  it("converts optional character fields to null", async () => {
    mocks.callAdminRpc.mockResolvedValue(null);

    await saveCatalogCharacter(null, {
      ...validCharacter,
      description: " ",
      price_category_id: " ",
      theme_category: " ",
      product_line: " ",
      image_url: " ",
      is_catalog: false,
    });

    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_upsert_catalog_character",
      expect.objectContaining({
        p_character_id: null,
        p_description: null,
        p_price_category_id: null,
        p_theme_category: null,
        p_product_line: null,
        p_image_url: null,
        p_is_catalog: false,
      }),
    );
  });

  it.each([
    [{ ...validCharacter, status: "invalid" }, "Status do personagem invalido"],
    [{ ...validCharacter, name: " " }, "Nome do personagem e obrigatorio"],
    [{ ...validCharacter, name: "<b>Heroi</b>" }, "Nome do personagem nao pode conter HTML"],
    [{ ...validCharacter, price_category_id: "invalid" }, "Categoria de preco invalido"],
    [{ ...validCharacter, image_url: "http://example.com/hero.png" }, "Imagem deve ser uma URL HTTPS valida"],
  ])("rejects invalid character payloads %#", async (input, message) => {
    await expect(saveCatalogCharacter(null, input)).rejects.toThrow(message);
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid existing character id", async () => {
    await expect(saveCatalogCharacter("invalid", validCharacter)).rejects.toThrow("Personagem invalido");
  });

  it("deletes a valid character only through the canonical admin RPC", async () => {
    mocks.callAdminRpc.mockResolvedValue(null);
    await deleteCatalogCharacterById(CHARACTER_ID);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_delete_catalog_character", {
      p_character_id: CHARACTER_ID,
    });
  });

  it("rejects an invalid character deletion id", async () => {
    await expect(deleteCatalogCharacterById("invalid")).rejects.toThrow("Personagem invalido");
  });

  it("counts characters linked to a price category", async () => {
    const query = countQuery({ count: 3, error: null });
    mocks.from.mockReturnValue(query);
    await expect(countCharactersByPriceCategory(CATEGORY_ID)).resolves.toBe(3);
    expect(query.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(query.eq).toHaveBeenCalledWith("price_category_id", CATEGORY_ID);
  });

  it("returns zero for a null count and propagates count query failures", async () => {
    mocks.from.mockReturnValueOnce(countQuery({ count: null, error: null }));
    await expect(countCharactersByPriceCategory(CATEGORY_ID)).resolves.toBe(0);

    mocks.from.mockReturnValueOnce(countQuery({ count: null, error: new Error("count failed") }));
    await expect(countCharactersByPriceCategory(CATEGORY_ID)).rejects.toThrow("count failed");
  });

  it("blocks deleting a price category that is still referenced", async () => {
    mocks.from.mockReturnValue(countQuery({ count: 1, error: null }));
    await expect(deletePriceCategory(CATEGORY_ID)).rejects.toThrow(
      "Nao e possivel excluir uma categoria que possui personagens vinculados",
    );
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("deletes an unreferenced price category through the canonical admin RPC", async () => {
    mocks.from.mockReturnValue(countQuery({ count: 0, error: null }));
    mocks.callAdminRpc.mockResolvedValue(null);
    await deletePriceCategory(CATEGORY_ID);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_delete_price_category", {
      p_category_id: CATEGORY_ID,
    });
  });

  it("sanitizes and saves a canonical price category without a description field", async () => {
    mocks.callAdminRpc.mockResolvedValue(null);
    await savePriceCategory(CATEGORY_ID, validCategory);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_upsert_price_category", {
      p_category_id: CATEGORY_ID,
      p_name: "premium",
      p_display_name: "Premium",
      p_price_coins: 100,
      p_coin_value_in_cents: 500,
      p_price_standalone: 15000,
      p_display_order: 2,
      p_is_active: true,
    });
  });

  it.each([
    [{ ...validCategory, name: "" }, "Identificador e obrigatorio"],
    [{ ...validCategory, display_name: "<b>Premium</b>" }, "Nome exibido nao pode conter HTML"],
    [{ ...validCategory, price_coins: -1 }, "Preco em coins invalido"],
    [{ ...validCategory, coin_value_in_cents: 1.5 }, "Valor do coin invalido"],
    [{ ...validCategory, display_order: 10001 }, "Ordem invalido"],
  ])("rejects invalid price category payloads %#", async (input, message) => {
    await expect(savePriceCategory(null, input)).rejects.toThrow(message);
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects invalid category ids before querying or mutating", async () => {
    await expect(countCharactersByPriceCategory("invalid")).rejects.toThrow("Categoria invalida");
    await expect(deletePriceCategory("invalid")).rejects.toThrow("Categoria invalida");
    await expect(savePriceCategory("invalid", validCategory)).rejects.toThrow("Categoria invalida");
  });
});
