import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateBasePriceWithHistory } from "./base-pricing-service";

const rpcMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedUserIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

describe("updateBasePriceWithHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserIdMock.mockResolvedValue(
      "123e4567-e89b-42d3-a456-426614174001",
    );
  });

  it("accepts one confirmed base-price result", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          success: true,
          old_price: 100,
          new_price: 120,
          message: "updated",
        },
      ],
      error: null,
    });

    await expect(
      updateBasePriceWithHistory({
        collection_type_id: "123e4567-e89b-42d3-a456-426614174010",
        new_base_price_coins: 120,
      }),
    ).resolves.toEqual({
      success: true,
      old_price: 100,
      new_price: 120,
      message: "updated",
    });
  });

  it.each([
    null,
    undefined,
    [],
    [{ success: true }],
    [{ success: true, old_price: 100, new_price: 0, message: "updated" }],
    [{ success: true, old_price: 100.5, new_price: 120, message: "updated" }],
    [
      { success: true, old_price: 100, new_price: 120, message: "updated" },
      { success: true, old_price: 120, new_price: 130, message: "duplicate" },
    ],
  ])("rejects malformed base-price results %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(
      updateBasePriceWithHistory({
        collection_type_id: "123e4567-e89b-42d3-a456-426614174010",
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("Resposta invalida ao atualizar preco base");
  });

  it("propagates a confirmed backend failure", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          success: false,
          old_price: 100,
          new_price: 120,
          message: "blocked by policy",
        },
      ],
      error: null,
    });

    await expect(
      updateBasePriceWithHistory({
        collection_type_id: "123e4567-e89b-42d3-a456-426614174010",
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("blocked by policy");
  });

  it("preserves RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      updateBasePriceWithHistory({
        collection_type_id: "123e4567-e89b-42d3-a456-426614174010",
        new_base_price_coins: 120,
      }),
    ).rejects.toThrow("Erro ao atualizar preco base: permission denied");
  });
});
