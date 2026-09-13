import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";
import { callAdminRpc } from "./admin-rpc-gateway";

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunctionData: vi.fn(),
}));

const callEdgeFunctionData = vi.mocked(callAuthenticatedEdgeFunctionData);

describe("admin-rpc-gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through RPCs whose contract does not require success=true", async () => {
    callEdgeFunctionData.mockResolvedValueOnce("result-id");

    await expect(
      callAdminRpc<string>("admin_delete_pricing_tier", {
        p_tier_id: "tier-1",
      }),
    ).resolves.toBe("result-id");
  });

  it("accepts confirmed standalone admin mutations", async () => {
    const response = {
      success: true,
      purchaseId: "purchase-1",
      newStatus: "cancelled",
    };
    callEdgeFunctionData.mockResolvedValueOnce(response);

    await expect(
      callAdminRpc("admin_cancel_standalone_purchase", {
        p_purchase_id: "purchase-1",
      }),
    ).resolves.toEqual(response);
  });

  it("accepts confirmed subscription payment mutations", async () => {
    const response = {
      success: true,
      payment: { id: "payment-1" },
      coins_credited: 100,
      new_balance: 500,
      message: "processed",
    };
    callEdgeFunctionData.mockResolvedValueOnce(response);

    await expect(
      callAdminRpc("admin_process_subscription_payment", {
        p_subscription_id: "subscription-1",
      }),
    ).resolves.toEqual(response);
  });

  it.each([null, undefined, {}, [], "unexpected", { success: false }])(
    "fails closed when a confirmed-success admin mutation is not explicitly confirmed: %j",
    async (response) => {
      callEdgeFunctionData.mockResolvedValueOnce(response as never);

      await expect(
        callAdminRpc("admin_mark_standalone_production_complete", {
          p_purchase_id: "purchase-1",
        }),
      ).rejects.toThrow("Admin operation failed");
    },
  );

  it("fails closed when subscription payment processing is not confirmed", async () => {
    callEdgeFunctionData.mockResolvedValueOnce({
      success: false,
      payment: { id: "payment-1" },
      coins_credited: 100,
      new_balance: 500,
      message: "not committed",
    });

    await expect(
      callAdminRpc("admin_process_subscription_payment", {
        p_subscription_id: "subscription-1",
      }),
    ).rejects.toThrow("not committed");
  });

  it("surfaces an explicit business error from an unconfirmed mutation", async () => {
    callEdgeFunctionData.mockResolvedValueOnce({
      success: false,
      error: "INVALID_STATUS:pending",
    });

    await expect(
      callAdminRpc("admin_approve_standalone_payment_voucher", {
        p_purchase_id: "purchase-1",
        p_voucher_type: "balance",
      }),
    ).rejects.toThrow("INVALID_STATUS:pending");
  });

  it("surfaces a message field when the mutation uses it for rejection details", async () => {
    callEdgeFunctionData.mockResolvedValueOnce({
      success: false,
      message: "Voucher cannot be rejected",
    });

    await expect(
      callAdminRpc("admin_reject_standalone_payment_voucher", {
        p_purchase_id: "purchase-1",
        p_voucher_type: "deposit",
        p_reason: "invalid",
      }),
    ).rejects.toThrow("Voucher cannot be rejected");
  });
});
