import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCollectionsForBulkAssign } from "./collections-for-bulk-assign-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

describe("collections-for-bulk-assign-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("le o snapshot canonico pelo admin-rpc", async () => {
    mocks.callAdminRpc.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Colecao A",
        slug: "colecao-a",
        price_full: 150,
        tier_id: null,
        tier_name: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Colecao B",
        slug: null,
        price_full: 200,
        tier_id: "33333333-3333-4333-8333-333333333333",
        tier_name: "Premium",
      },
    ]);

    await expect(fetchCollectionsForBulkAssign()).resolves.toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Colecao A",
        slug: "colecao-a",
        price_full: 150,
        tier_id: null,
        tier_name: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Colecao B",
        slug: null,
        price_full: 200,
        tier_id: "33333333-3333-4333-8333-333333333333",
        tier_name: "Premium",
      },
    ]);

    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_get_collections_for_bulk_assign");
  });

  it.each([
    null,
    {},
    [{ id: "", name: "Colecao", slug: null, price_full: 150, tier_id: null, tier_name: null }],
    [{ id: "id", name: "", slug: null, price_full: 150, tier_id: null, tier_name: null }],
    [{ id: "id", name: "Colecao", slug: null, price_full: -1, tier_id: null, tier_name: null }],
    [{ id: "id", name: "Colecao", slug: 123, price_full: 150, tier_id: null, tier_name: null }],
  ])("falha fechado para payload invalido %#", async (payload) => {
    mocks.callAdminRpc.mockResolvedValue(payload);
    await expect(fetchCollectionsForBulkAssign()).rejects.toThrow(/Invalid bulk assignment snapshot/);
  });
});
