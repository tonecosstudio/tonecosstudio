import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  updateChosenDiscountWithHistory,
  updateMultiplierWithHistory,
} from "./context-pricing-service";

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

describe("context-pricing-service mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserIdMock.mockResolvedValue(
      "123e4567-e89b-42d3-a456-426614174001",
    );
  });

  it("accepts one confirmed multiplier result", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          success: true,
          old_multiplier: 1,
          new_multiplier: 1.2,
          message: "updated",
        },
      ],
      error: null,
    });

    await expect(
      updateMultiplierWithHistory({ user_context: "guest", new_multiplier: 1.2 }),
    ).resolves.toEqual({
      success: true,
      old_multiplier: 1,
      new_multiplier: 1.2,
      message: "updated",
    });
  });

  it.each([
    null,
    undefined,
    [],
    [{ success: true }],
    [
      {
        success: true,
        old_multiplier: 1,
        new_multiplier: -1,
        message: "updated",
      },
    ],
    [
      {
        success: true,
        old_multiplier: 1,
        new_multiplier: 1.2,
        message: "updated",
      },
      {
        success: true,
        old_multiplier: 1.2,
        new_multiplier: 1.3,
        message: "duplicate",
      },
    ],
  ])("rejects malformed multiplier responses %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(
      updateMultiplierWithHistory({ user_context: "guest", new_multiplier: 1.2 }),
    ).rejects.toThrow("Resposta invalida ao atualizar multiplicador contextual");
  });

  it("propagates a confirmed multiplier failure message", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          success: false,
          old_multiplier: 1,
          new_multiplier: 1.2,
          message: "blocked by policy",
        },
      ],
      error: null,
    });

    await expect(
      updateMultiplierWithHistory({ user_context: "guest", new_multiplier: 1.2 }),
    ).rejects.toThrow("blocked by policy");
  });

  it("accepts one confirmed discount result", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          success: true,
          old_discount: 5,
          new_discount: 10,
          message: "updated",
        },
      ],
      error: null,
    });

    await expect(
      updateChosenDiscountWithHistory({ new_discount_percentage: 10 }),
    ).resolves.toEqual({
      success: true,
      old_discount: 5,
      new_discount: 10,
      message: "updated",
    });
  });

  it.each([
    null,
    undefined,
    [],
    [{ success: true }],
    [
      {
        success: true,
        old_discount: 5,
        new_discount: 101,
        message: "updated",
      },
    ],
    [
      {
        success: true,
        old_discount: 5,
        new_discount: 10.5,
        message: "updated",
      },
    ],
  ])("rejects malformed discount responses %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(
      updateChosenDiscountWithHistory({ new_discount_percentage: 10 }),
    ).rejects.toThrow("Resposta invalida ao atualizar desconto contextual");
  });

  it("preserves RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      updateChosenDiscountWithHistory({ new_discount_percentage: 10 }),
    ).rejects.toThrow("Erro ao atualizar desconto: permission denied");
  });
});
