import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyCurationImage,
  getCatalogCurationOverview,
  listCatalogCollectionTargets,
  listCatalogCurationQueue,
  publishCurationItem,
  updateCurationItemStatus,
} from "./catalog-curation-service";
import type { CatalogPublishInput } from "./catalog-curation-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  callAdminRpc: vi.fn(),
  callEdge: vi.fn(),
  normalizeTags: vi.fn(),
  assetUrl: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));
vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.callEdge,
}));
vi.mock("@/lib/catalog-utils", () => ({
  normalizeCatalogTags: mocks.normalizeTags,
}));
vi.mock("@/lib/catalog-assets", () => ({
  getCatalogStoragePublicUrl: mocks.assetUrl,
}));

type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: { code?: string; message: string } | null;
};
const observed: Array<{ table: string; query: ReturnType<typeof makeQuery> }> = [];

function makeQuery(response: QueryResult) {
  const q = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    neq: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    overlaps: vi.fn(),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (error: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [
    q.select, q.order, q.limit, q.eq, q.update, q.neq, q.not,
    q.or, q.is, q.in, q.contains, q.overlaps,
  ].forEach((method) => method.mockReturnValue(q));
  return q;
}

function setRead(response: QueryResult) {
  mocks.from.mockImplementation((table: string) => {
    const q = makeQuery(response);
    observed.push({ table, query: q });
    return q;
  });
}

const basePublishInput: CatalogPublishInput = {
  queueId: "queue-1",
  name: " Lion-O ",
  description: " Estátua colecionável ",
  characterName: " Lion-O ",
  variantName: "",
  variantType: "default",
  sourceTitle: " ThunderCats ",
  mediaType: "series",
  franchise: " ThunderCats ",
  category: " Anime ",
  subcategory: " Clássicos ",
  tags: "anime, clássico",
  catalogVisibility: "general",
  collectionId: null,
  priceMode: "consultation",
  priceStandaloneOverride: null,
  priceCoinsOverride: null,
};

describe("catalog curation — bounded authority and fail-closed publishing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    observed.length = 0;
    mocks.callAdminRpc.mockResolvedValue(null);
    mocks.normalizeTags.mockReturnValue(["anime", "clássico"]);
    mocks.assetUrl.mockReturnValue("https://cdn.example.com/media/cover.webp");
  });

  it("limits the curation queue to 120 items rather than scanning the catalog", async () => {
    setRead({ data: [{ id: "queue-1", storage_bucket: "models",
      storage_path: "covers/hero.webp", thumbnail_url: null }], error: null });
    const result = await listCatalogCurationQueue("all");
    expect(result).toMatchObject([{
      id: "queue-1", image_url: "https://cdn.example.com/media/cover.webp",
    }]);
    expect(observed[0].table).toBe("catalog_import_items");
    expect(observed[0].query.limit).toHaveBeenCalledExactlyOnceWith(120);
    expect(observed[0].query.eq).not.toHaveBeenCalled();
    expect(mocks.assetUrl).toHaveBeenCalledExactlyOnceWith(
      "models", "covers/hero.webp",
    );
  });

  it("applies an explicit server filter for the requested moderation status", async () => {
    setRead({ data: [], error: null });
    await listCatalogCurationQueue("review");
    expect(observed[0].query.eq).toHaveBeenCalledWith("status", "review");
  });

  it("prefers existing thumbnails to a generated storage URL", async () => {
    setRead({ data: [{
      id: "queue-2",
      thumbnail_url: "https://cdn.example.com/preview.webp",
      storage_bucket: "models",
      storage_path: "unused.webp",
    }], error: null });
    const result = await listCatalogCurationQueue("all");
    expect(result[0].image_url).toBe("https://cdn.example.com/preview.webp");
    expect(mocks.assetUrl).not.toHaveBeenCalled();
  });

  it("rejects missing curation tables with an explicit migration error", async () => {
    setRead({ data: null, error: { code: "PGRST205", message: "missing" } });
    await expect(listCatalogCurationQueue("all")).rejects.toThrow(
      "A fila profissional de catalogo ainda nao foi aplicada",
    );
  });

  it("does not reinterpret unrelated database errors as a missing schema", async () => {
    setRead({ data: null, error: { code: "42501", message: "permission denied" } });
    await expect(listCatalogCurationQueue("all")).rejects.toMatchObject({
      message: "permission denied",
    });
  });

  it("reads at most 200 active collections for linking existing records", async () => {
    setRead({ data: [{ id: "collection-1", name: "Clássicos" }], error: null });
    await expect(listCatalogCollectionTargets()).resolves.toEqual([
      { id: "collection-1", name: "Clássicos" },
    ]);
    expect(observed[0].table).toBe("collections");
    expect(observed[0].query.eq).toHaveBeenCalledWith("is_active", true);
    expect(observed[0].query.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(observed[0].query.limit).toHaveBeenCalledWith(200);
  });

  it.each([
    ["approved", true],
    ["rejected", true],
    ["duplicate", true],
    ["hidden", true],
    ["queued", false],
    ["draft", false],
  ] as const)("records review timestamps only when a queue item is %s", async (status, reviewed) => {
    setRead({ data: null, error: null });
    await expect(updateCurationItemStatus("queue-1", status)).resolves.toBeUndefined();
    const patch = observed[0].query.update.mock.calls[0][0];
    expect(patch.status).toBe(status);
    expect(patch.updated_at).toEqual(expect.any(String));
    if (reviewed) expect(patch.reviewed_at).toBe(patch.updated_at);
    else expect(patch).not.toHaveProperty("reviewed_at");
    expect(observed[0].query.eq).toHaveBeenCalledWith("id", "queue-1");
  });

  it("does not hide a failed authoritative status update", async () => {
    setRead({ data: null, error: { message: "permission denied" } });
    await expect(updateCurationItemStatus("queue-1", "approved"))
      .rejects.toMatchObject({ message: "permission denied" });
  });

  it("uses the existing authenticated image classifier, not a client-side inference", async () => {
    mocks.callEdge.mockResolvedValueOnce({ name: "Lion-O", confidence: 0.94 });
    await expect(classifyCurationImage("queue-1")).resolves.toMatchObject({
      name: "Lion-O", confidence: 0.94,
    });
    expect(mocks.callEdge).toHaveBeenCalledExactlyOnceWith(
      "classify-image-vision",
      { catalog_import_item_id: "queue-1", model: "gpt-4o-mini" },
      "Erro ao classificar imagem",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("passes an explicitly selected classification model", async () => {
    mocks.callEdge.mockResolvedValue({});
    await classifyCurationImage("queue-1", "gpt-4o");
    expect(mocks.callEdge.mock.calls[0][1]).toMatchObject({
      model: "gpt-4o",
    });
  });

  it("normalizes tags once and delegates publishing to its authenticated RPC", async () => {
    await publishCurationItem(basePublishInput);
    expect(mocks.normalizeTags).toHaveBeenCalledExactlyOnceWith(
      ["anime", " clássico"], 20,
    );
    expect(mocks.callAdminRpc).toHaveBeenCalledExactlyOnceWith(
      "admin_publish_catalog_import_item",
      {
        p_queue_id: "queue-1",
        p_payload: expect.objectContaining({
          name: "Lion-O",
          description: "Estátua colecionável",
          character_name: "Lion-O",
          variant_name: null,
          source_title: "ThunderCats",
          franchise: "ThunderCats",
          category: "Anime",
          tags: ["anime", "clássico"],
          price_mode: "consultation",
          price_standalone_override: null,
          price_coins_override: null,
        }),
      },
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuses unnamed models before any price or catalog write", async () => {
    await expect(publishCurationItem({ ...basePublishInput, name: " " }))
      .rejects.toThrow("Nome do modelo e obrigatorio");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
    expect(mocks.normalizeTags).not.toHaveBeenCalled();
  });

  it("reports a missing canonical publish RPC without falsely claiming a publication", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce({
      code: "PGRST202", message: "Function not found",
    });
    await expect(publishCurationItem(basePublishInput)).rejects.toThrow(
      "A RPC profissional de publicacao do catalogo ainda nao foi aplicada",
    );
  });

  it("propagates unrelated authorization failures during publication", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce(new Error("permission denied"));
    await expect(publishCurationItem(basePublishInput))
      .rejects.toThrow("permission denied");
  });

  it("summarizes only bounded count queries and flags blocking catalog anomalies", async () => {
    const counts = Array<number>(23).fill(0);
    counts[0] = 10;
    counts[1] = 2;
    counts[5] = 4;
    counts[12] = 120;
    counts[13] = 8;
    counts[14] = 128;
    counts[15] = 5;
    let index = 0;
    mocks.from.mockImplementation((table: string) => {
      const q = makeQuery({ count: counts[index++] ?? 0, error: null });
      observed.push({ table, query: q });
      return q;
    });
    const result = await getCatalogCurationOverview();
    expect(result).toMatchObject({
      queueTotal: 10,
      queueByStatus: { all: 10, queued: 5 },
      publishedModels: 120,
      stagingModels: 8,
      totalModels: 128,
      needsNameReview: 2,
      health: {
        strictPass: false,
        blockingIssueCount: 2,
        readyToPublish: 4,
      },
    });
    expect(mocks.from).toHaveBeenCalledTimes(23);
    expect(observed.every(({ query }) =>
      query.select.mock.calls[0][1]?.count === "exact" &&
      query.select.mock.calls[0][1]?.head === true,
    )).toBe(true);
  });

  it("fails the overview when an authoritative count query fails", async () => {
    let index = 0;
    mocks.from.mockImplementation((table: string) => {
      const q = makeQuery({
        count: 0,
        error: index++ === 0 ? { message: "count denied" } : null,
      });
      observed.push({ table, query: q });
      return q;
    });
    await expect(getCatalogCurationOverview()).rejects.toMatchObject({
      message: "count denied",
    });
  });
});
