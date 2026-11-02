import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBasePriceByType, listActiveBasePricing } from "./base-pricing-service";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({ callAdminRpc: vi.fn() }));

const row = (id: string, order: number) => ({
  collection_type_id: id,
  base_price_coins: 150,
  is_active: true,
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-02T12:00:00Z",
  collection_types: { name: `name-${id}`, display_name: `display-${id}`, sort_order: order },
});

function mockRead(data: unknown, error: { message: string } | null = null) {
  const response = { data, error };
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), single: vi.fn(),
    then: (resolve: (value: typeof response) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };
  [query.select, query.eq, query.order, query.single]
    .forEach((fn) => fn.mockReturnValue(query));
  mocks.from.mockReturnValue(query);
  return query;
}

describe("base pricing canonical read boundaries", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reads only active prices from canonical collection base pricing", async () => {
    const query = mockRead([row("type-2", 20), row("type-1", 1)]);
    const result = await listActiveBasePricing();
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collection_base_pricing");
    expect(query.eq).toHaveBeenCalledExactlyOnceWith("is_active", true);
    expect(query.order).toHaveBeenCalledWith("collection_type_id", { ascending: true });
    expect(result.map((item) => item.collection_type_id)).toEqual(["type-1", "type-2"]);
    expect(result[0]).toMatchObject({
      collection_type_name: "name-type-1",
      collection_type_display_name: "display-type-1",
      base_price_coins: 150,
      sort_order: 1,
    });
  });

  it("returns an empty list when there are no active prices", async () => {
    mockRead(null);
    await expect(listActiveBasePricing()).resolves.toEqual([]);
  });

  it("fails closed if the base pricing query returns an error", async () => {
    mockRead(null, { message: "permission denied" });
    await expect(listActiveBasePricing()).rejects.toThrow(
      "Erro ao buscar precos base: permission denied",
    );
  });

  it("uses a specific collection ID and the active flag for detail lookup", async () => {
    const query = mockRead(row("type-1", 5));
    const result = await getBasePriceByType("type-1");
    expect(result).toMatchObject({ collection_type_id: "type-1", sort_order: 5 });
    expect(query.eq).toHaveBeenNthCalledWith(1, "collection_type_id", "type-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "is_active", true);
    expect(query.single).toHaveBeenCalledOnce();
  });

  it("rejects inaccessible or missing collection base pricing rows", async () => {
    mockRead(null, { message: "not found" });
    await expect(getBasePriceByType("unknown")).rejects.toThrow(
      "Erro ao buscar preco base: not found",
    );
  });
});
