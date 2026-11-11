import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countActiveFixedCollections,
  countCharactersByCollection,
  createCollection,
  deleteCollectionById,
  deleteCollectionCharacterById,
  fetchCharactersByCollection,
  fetchCollectionFinancialAnalysis,
  fetchCollectionsFinancialSummary,
  fetchCollectionsWithCharacterCount,
  getModelPublicUrl,
  insertCollectionCharacter,
  insertCollectionCharacters,
  updateCollectionById,
  updateCollectionCharacterById,
} from "./admin-collections-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  callAdminRpc: vi.fn(),
  publicUrl: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));
vi.mock("@/services/supabase/storage-client", () => ({
  getPublicStorageUrl: mocks.publicUrl,
  uploadStorageFile: vi.fn(),
}));

const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const CHARACTER_ID = "22222222-2222-4222-8222-222222222222";

type ReadResult = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};
const queries: Array<{ table: string; query: ReturnType<typeof makeQuery> }> = [];

function makeQuery(response: ReadResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [query.select, query.eq, query.order].forEach((fn) => fn.mockReturnValue(query));
  return query;
}

function reads(responses: Record<string, ReadResult | ReadResult[]>) {
  const indexes = new Map<string, number>();
  mocks.from.mockImplementation((table: string) => {
    const i = indexes.get(table) ?? 0;
    indexes.set(table, i + 1);
    const response = responses[table];
    const query = makeQuery(
      (Array.isArray(response) ? response[i] : response) ?? {
        data: null,
        error: null,
      },
    );
    queries.push({ table, query });
    return query;
  });
}

function collectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: COLLECTION_ID,
    name: "Coleção Premium",
    slug: "colecao-premium",
    description: "Seleção de personagens",
    cover_image_url: "https://cdn.example.com/cover.webp",
    image_url: null,
    rotation_type: "fixed",
    is_active: true,
    total_characters: 3,
    ...overrides,
  };
}

function characterRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CHARACTER_ID,
    collection_id: COLLECTION_ID,
    name: "Lion-O",
    description: null,
    franchise: "ThunderCats",
    product_line: "Premium",
    theme_category: "Herói",
    stock_quantity: 4,
    display_order: 1,
    release_order: 1,
    release_month: 11,
    release_date: "2026-11-01",
    unlock_override: false,
    status: "released",
    image_url: null,
    image_urls: [],
    ...overrides,
  };
}

const collectionPayload = {
  name: "Coleção Premium",
  slug: "colecao-premium",
  description: "",
  cover_image_url: null,
  rotation_type: "fixed",
  tier_id: null,
  is_active: true,
};

describe("admin collections — canonical reads and mutation contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.length = 0;
  });

  it("reads collection counts without hiding cover images", async () => {
    reads({
      collections: { data: [collectionRow()], error: null },
      collection_characters: { count: 3, error: null },
    });
    const result = await fetchCollectionsWithCharacterCount();
    expect(result).toMatchObject([{
      id: COLLECTION_ID,
      image_url: "https://cdn.example.com/cover.webp",
      character_count: 3,
      total_characters: 3,
      rotation_type: "fixed",
    }]);
    expect(queries[1].query.eq).toHaveBeenCalledWith("collection_id", COLLECTION_ID);
    expect(queries[1].query.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
  });

  it("does not query character counts when collections are absent", async () => {
    reads({ collections: { data: null, error: null } });
    await expect(fetchCollectionsWithCharacterCount()).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collections");
  });

  it("surfaces failed collection reads rather than treating them as empty", async () => {
    reads({ collections: { data: null, error: { message: "permission denied" } } });
    await expect(fetchCollectionsWithCharacterCount()).rejects.toMatchObject({
      message: "permission denied",
    });
  });

  it("preserves the group when an optional character-count query fails", async () => {
    reads({
      collections: { data: [collectionRow({ rotation_type: "unknown", is_active: null })], error: null },
      collection_characters: { count: null, error: { message: "count denied" } },
    });
    await expect(fetchCollectionsWithCharacterCount()).resolves.toMatchObject([
      { character_count: 0, is_active: false, rotation_type: "fixed" },
    ]);
  });

  it("maps canonical character metadata and stock without defaulting to legacy tables", async () => {
    reads({ collection_characters: { data: [characterRow()], error: null } });
    const result = await fetchCharactersByCollection(COLLECTION_ID);
    expect(result).toMatchObject([{
      id: CHARACTER_ID,
      collection_id: COLLECTION_ID,
      name: "Lion-O",
      stock_quantity: 4,
      franchise: "ThunderCats",
      image_urls: [],
    }]);
    expect(queries[0].query.eq).toHaveBeenCalledWith("collection_id", COLLECTION_ID);
    expect(queries[0].query.order).toHaveBeenCalledWith("release_order", { ascending: true });
  });

  it("normalizes optional stock and gallery fields without inventing prices", async () => {
    reads({ collection_characters: { data: [characterRow({
      stock_quantity: null, display_order: null, release_order: null,
      unlock_override: null, image_urls: null, franchise: null,
    })], error: null } });
    await expect(fetchCharactersByCollection(COLLECTION_ID)).resolves.toMatchObject([
      { stock_quantity: 0, display_order: null, release_order: 0,
        unlock_override: false, image_urls: null, franchise: null },
    ]);
  });

  it.each([
    [characterRow({ name: null }), "nome"],
    [characterRow({ status: null }), "status"],
    [characterRow({ collection_id: null }), "collection_id"],
  ])("rejects malformed required character data %#", async (row, field) => {
    reads({ collection_characters: { data: [row], error: null } });
    await expect(fetchCharactersByCollection(COLLECTION_ID)).rejects.toThrow(
      `possui ${field} ausente`,
    );
  });

  it("refuses to manufacture characters after an RLS error", async () => {
    reads({ collection_characters: { data: null, error: { message: "forbidden" } } });
    await expect(fetchCharactersByCollection(COLLECTION_ID))
      .rejects.toMatchObject({ message: "forbidden" });
  });

  it("creates a collection only when the RPC confirms a valid ID", async () => {
    mocks.callAdminRpc.mockResolvedValue({ id: COLLECTION_ID });
    await expect(createCollection(collectionPayload)).resolves.toEqual({ id: COLLECTION_ID });
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_create_collection", {
      p_payload: collectionPayload,
    });
  });

  it("fails closed when a create RPC returns an invalid ID", async () => {
    mocks.callAdminRpc.mockResolvedValue({ id: "not-a-uuid" });
    await expect(createCollection(collectionPayload)).rejects.toThrow(
      "returned an invalid resource id",
    );
  });

  it("requires a nonempty batch of characters for insertion", async () => {
    await expect(insertCollectionCharacters([])).rejects.toThrow(
      "Nenhum personagem fornecido",
    );
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("matches confirmed inserted count against the submitted batch", async () => {
    const payload = characterRow() as unknown as Parameters<typeof insertCollectionCharacters>[0][number];
    mocks.callAdminRpc.mockResolvedValueOnce({ inserted: 1 });
    await expect(insertCollectionCharacters([payload])).resolves.toBeUndefined();
    expect(mocks.callAdminRpc).toHaveBeenCalledWith(
      "admin_insert_collection_characters",
      { p_characters: [payload] },
    );
  });

  it.each([{ inserted: 0 }, { inserted: -1 }, { inserted: "1" }, {}])(
    "rejects inconsistent batch insert confirmations %#",
    async (response) => {
      mocks.callAdminRpc.mockResolvedValue(response);
      const payload = characterRow() as unknown as Parameters<typeof insertCollectionCharacters>[0][number];
      await expect(insertCollectionCharacters([payload])).rejects.toThrow(
        "Collection characters insertion returned an",
      );
    },
  );

  it.each([
    ["delete", "admin_delete_collection"],
    ["update", "admin_update_collection"],
  ] as const)("checks the server-confirmed ID after %s collection mutation", async (operation, rpc) => {
    mocks.callAdminRpc.mockResolvedValueOnce(COLLECTION_ID);
    if (operation === "delete") {
      await expect(deleteCollectionById(COLLECTION_ID)).resolves.toBeUndefined();
    } else {
      await expect(updateCollectionById(COLLECTION_ID, { name: "Novo nome" }))
        .resolves.toBeUndefined();
    }
    expect(mocks.callAdminRpc.mock.calls[0][0]).toBe(rpc);
    expect(mocks.callAdminRpc.mock.calls[0][1]).toMatchObject({
      p_collection_id: COLLECTION_ID,
    });
  });

  it("blocks updating another collection ID even after RPC success", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(CHARACTER_ID);
    await expect(updateCollectionById(COLLECTION_ID, { name: "Outro" }))
      .rejects.toThrow("unexpected resource id");
  });

  it("requires valid server confirmations for character operations", async () => {
    const payload = characterRow() as unknown as Parameters<typeof insertCollectionCharacter>[0];
    mocks.callAdminRpc.mockResolvedValueOnce(CHARACTER_ID)
      .mockResolvedValueOnce(CHARACTER_ID).mockResolvedValueOnce(CHARACTER_ID);
    await expect(insertCollectionCharacter(payload)).resolves.toBeUndefined();
    await expect(updateCollectionCharacterById(CHARACTER_ID, { name: "Lion-O" }))
      .resolves.toBeUndefined();
    await expect(deleteCollectionCharacterById(CHARACTER_ID)).resolves.toBeUndefined();
    expect(mocks.callAdminRpc.mock.calls.map(([rpc]) => rpc)).toEqual([
      "admin_insert_collection_character",
      "admin_update_collection_character",
      "admin_delete_collection_character",
    ]);
  });

  it("rejects an unrelated character ID in RPC confirmation", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(COLLECTION_ID);
    await expect(deleteCollectionCharacterById(CHARACTER_ID))
      .rejects.toThrow("unexpected resource id");
  });

  it("counts active fixed collections using only canonical filters", async () => {
    reads({ collections: { count: 7, error: null } });
    await expect(countActiveFixedCollections()).resolves.toBe(7);
    expect(queries[0].query.eq).toHaveBeenCalledWith("rotation_type", "fixed");
    expect(queries[0].query.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("does not invent a count from empty results", async () => {
    reads({ collection_characters: { count: null, error: null } });
    await expect(countCharactersByCollection(COLLECTION_ID)).resolves.toBe(0);
    expect(queries[0].query.eq).toHaveBeenCalledWith("collection_id", COLLECTION_ID);
  });

  it("forwards errors from authoritative character count queries", async () => {
    reads({ collection_characters: { count: null, error: { message: "count failed" } } });
    await expect(countCharactersByCollection(COLLECTION_ID))
      .rejects.toMatchObject({ message: "count failed" });
  });

  it("reads financial totals from their approved reporting view", async () => {
    reads({ collections_financial_summary: { data: [
      { id: COLLECTION_ID, total_revenue: 180 },
    ], error: null } });
    await expect(fetchCollectionsFinancialSummary()).resolves.toEqual([
      { id: COLLECTION_ID, total_revenue: 180 },
    ]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith(
      "collections_financial_summary",
    );
    expect(queries[0].query.order).toHaveBeenCalledWith("name");
  });

  it("uses the dedicated financial analysis RPC and returns null when absent", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ id: COLLECTION_ID, total_revenue: 180 }], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchCollectionFinancialAnalysis(COLLECTION_ID)).resolves
      .toMatchObject({ id: COLLECTION_ID, total_revenue: 180 });
    await expect(fetchCollectionFinancialAnalysis(COLLECTION_ID)).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith("get_collection_financial_analysis", {
      p_collection_id: COLLECTION_ID,
    });
  });

  it("does not conceal errors from financial analysis", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rpc denied" } });
    await expect(fetchCollectionFinancialAnalysis(COLLECTION_ID))
      .rejects.toMatchObject({ message: "rpc denied" });
  });

  it("derives model media URLs exclusively through the existing storage adapter", () => {
    mocks.publicUrl.mockReturnValue("https://cdn.example.com/models/hero.webp");
    expect(getModelPublicUrl("collections/hero.webp")).toBe(
      "https://cdn.example.com/models/hero.webp",
    );
    expect(mocks.publicUrl).toHaveBeenCalledExactlyOnceWith(
      "models", "collections/hero.webp",
    );
  });
});
