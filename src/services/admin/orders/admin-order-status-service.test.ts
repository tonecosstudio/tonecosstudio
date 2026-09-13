import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  updateManualPaymentStatus,
  updateQuoteStatusRpc,
  updateQuoteTrackingCode,
  updateSubscriptionDeliveryDates,
} from "./admin-order-status-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callRpc = vi.mocked(callAdminRpc);

describe("admin-order-status-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["manual payment", "payment-1", () => updateManualPaymentStatus("payment-1", "approved")],
    ["quote status", "quote-1", () => updateQuoteStatusRpc("quote-1", "approved")],
    ["delivery date", "delivery-1", () => updateSubscriptionDeliveryDates("delivery-1", null)],
    ["quote tracking", "quote-1", () => updateQuoteTrackingCode("quote-1", "BR123456789BR")],
  ])("accepts %s mutation only when the RPC returns the requested id", async (_label, expectedId, run) => {
    callRpc.mockResolvedValueOnce(expectedId);
    await expect(run()).resolves.toBeUndefined();
  });

  it.each([
    ["manual payment", () => updateManualPaymentStatus("payment-1", "approved")],
    ["quote status", () => updateQuoteStatusRpc("quote-1", "approved")],
    ["delivery date", () => updateSubscriptionDeliveryDates("delivery-1", null)],
    ["quote tracking", () => updateQuoteTrackingCode("quote-1", "BR123456789BR")],
  ])("fails closed when %s mutation returns an unexpected id", async (_label, run) => {
    callRpc.mockResolvedValueOnce(null);

    await expect(run()).rejects.toThrow(
      "Admin operation returned an unexpected resource id",
    );
  });
});
