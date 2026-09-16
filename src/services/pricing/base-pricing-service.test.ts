import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateBasePrice } from "./base-pricing-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const COLLECTION_TYPE_ID = "123e4567-e89b-42d3-a456-426614174010";

describe("updateBasePrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes the mutation through the authenticated admin gateway", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      success: true,
      collection_type_id: COLLECTION_TYPE_ID,
      old_price: 100,
      new_price: 120,
      message: "updated",
    });

    await expect(
      updateBasePrice({
        collection_type_id: COLLECTION_TYPE_ID,
        new_base_price_coins: 120,
      }),
    ).resolves.toEqual({
      success: true,
      collection_type_id: COLLECTION_TYPE_ID,
      old_price: 100,
      new_price: 120,
      message: "updated",
    });

    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_update_collection_base_price", {
      p_collection_type_id: COLLECTION_TYPE_ID,
      p_new_base_price_coins: 120,
    });
  });

  it.each([
    null,
    undefined,
    [],
    { success: true },
    {
      success: true,
      collection_type_id: COLLECTION_TYPE_ID,
      old_price: 100,
      new_price: 0,
      message: "updated",
    },
    {
      success: true,
      collection_type_id: COLLECTION_TYPE_ID,
      old_price: 100.5,
      new_price: 120,
      message: "updated",
    },
  ])("rejects malformed base-price results %#", async (data) => {
    mocks.callAdminRpc.mockResolvedValue(data);

    await expect(
      updateBasePrice({
        collection_type_id: COLLECTION_TYPE_ID,
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("Resposta invalida ao atualizar preco base");
  });

  it("rejects a response for another collection type", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      success: true,
      collection_type_id: "123e4567-e89b-42d3-a456-426614174011",
      old_price: 100,
      new_price: 120,
      message: "updated",
    });

    await expect(
      updateBasePrice({
        collection_type_id: COLLECTION_TYPE_ID,
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("Resposta inconsistente ao atualizar preco base");
  });

  it("rejects a response with an unexpected confirmed price", async () => {
    mocks.callAdminRpc.mockResolvedValue({
      success: true,
      collection_type_id: COLLECTION_TYPE_ID,
      old_price: 100,
      new_price: 121,
      message: "updated",
    });

    await expect(
      updateBasePrice({
        collection_type_id: COLLECTION_TYPE_ID,
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("Resposta inconsistente ao atualizar preco base");
  });
});
