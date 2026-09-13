import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { cancelSubscriptionById } from "./subscription-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/services/subscriptions/subscription-summary-service", () => ({
  fetchActiveSubscriptionSummary: vi.fn(),
}));

const invoke = vi.mocked(supabase.functions.invoke);

describe("subscription-service cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({
      data: {
        success: true,
        message: "Assinatura cancelada com sucesso",
      },
      error: null,
    } as never);
  });

  it("requires the cancellation Edge Function to confirm success", async () => {
    await expect(cancelSubscriptionById("sub-123")).resolves.toEqual({
      success: true,
    });

    expect(invoke).toHaveBeenCalledWith("cancel-subscription", {
      body: { subscriptionId: "sub-123" },
    });
  });

  it("surfaces an explicit unsuccessful response", async () => {
    invoke.mockResolvedValueOnce({
      data: { success: false, error: "Assinatura ja esta cancelada" },
      error: null,
    } as never);

    await expect(cancelSubscriptionById("sub-123")).rejects.toThrow(
      "Assinatura ja esta cancelada",
    );
  });

  it.each([null, undefined, {}])(
    "fails closed when cancellation returns an unconfirmed payload: %j",
    async (data) => {
      invoke.mockResolvedValueOnce({ data, error: null } as never);

      await expect(cancelSubscriptionById("sub-123")).rejects.toThrow(
        "Erro ao cancelar assinatura",
      );
    },
  );

  it("propagates Edge Function transport errors", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Function unavailable" },
    } as never);

    await expect(cancelSubscriptionById("sub-123")).rejects.toThrow(
      "Function unavailable",
    );
  });
});
