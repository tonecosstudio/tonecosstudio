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
const PAYMENT_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const DELIVERY_ID = "33333333-3333-4333-8333-333333333333";

describe("admin-order-status-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["manual payment", PAYMENT_ID, () => updateManualPaymentStatus(PAYMENT_ID, "approved")],
    ["quote status", QUOTE_ID, () => updateQuoteStatusRpc(QUOTE_ID, "approved")],
    ["delivery date", DELIVERY_ID, () => updateSubscriptionDeliveryDates(DELIVERY_ID, null)],
    ["quote tracking", QUOTE_ID, () => updateQuoteTrackingCode(QUOTE_ID, "BR123456789BR")],
  ])("accepts %s mutation only when the RPC returns the requested id", async (_label, expectedId, run) => {
    callRpc.mockResolvedValueOnce(expectedId);
    await expect(run()).resolves.toBeUndefined();
  });

  it.each([
    [
      "manual payment",
      "Manual payment status update returned an invalid resource id",
      () => updateManualPaymentStatus(PAYMENT_ID, "approved"),
    ],
    [
      "quote status",
      "Quote status update returned an invalid resource id",
      () => updateQuoteStatusRpc(QUOTE_ID, "approved"),
    ],
    [
      "delivery date",
      "Subscription delivery date update returned an invalid resource id",
      () => updateSubscriptionDeliveryDates(DELIVERY_ID, null),
    ],
    [
      "quote tracking",
      "Quote tracking update returned an invalid resource id",
      () => updateQuoteTrackingCode(QUOTE_ID, "BR123456789BR"),
    ],
  ])("fails closed when %s mutation returns an unexpected id", async (_label, errorMessage, run) => {
    callRpc.mockResolvedValueOnce(null);

    await expect(run()).rejects.toThrow(errorMessage);
  });
});
