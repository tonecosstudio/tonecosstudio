import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSubscriptionCheckoutForCurrentUser,
  resubmitSubscriptionPaymentVoucher,
} from "./subscription-checkout-service";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  uploadPaymentVoucher: vi.fn(),
  deletePaymentVoucher: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock("@/services/payments/payment-voucher-storage-service", () => ({
  uploadPaymentVoucher: mocks.uploadPaymentVoucher,
  deletePaymentVoucher: mocks.deletePaymentVoucher,
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const COLLECTION_ID = "33333333-3333-4333-8333-333333333333";
const SUBSCRIPTION_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_SUBSCRIPTION_ID = "55555555-5555-4555-8555-555555555555";
const PAYMENT_ID = "66666666-6666-4666-8666-666666666666";
const VOUCHER_PATH = `subscriptions/${USER_ID}/1788130800000-a1b2c3d4e5f60708.png`;
const voucher = () => new File(["proof"], "receipt.png", { type: "image/png" });

describe("subscription checkout voucher cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuthenticatedUserId.mockResolvedValue(USER_ID);
    mocks.uploadPaymentVoucher.mockResolvedValue(VOUCHER_PATH);
    mocks.deletePaymentVoucher.mockResolvedValue(undefined);
  });

  it("deletes a checkout voucher when the RPC returns an invalid payload", async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });

    await expect(createSubscriptionCheckoutForCurrentUser({
      planId: PLAN_ID,
      collectionId: COLLECTION_ID,
      selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
      modelSelectionLimit: 6,
      paymentMethod: "pix",
      voucher: voucher(),
    })).rejects.toThrow("subscription_checkout_result_invalid");

    expect(mocks.deletePaymentVoucher).toHaveBeenCalledExactlyOnceWith(VOUCHER_PATH, USER_ID);
  });

  it("deletes a replacement voucher when the RPC returns a different subscription", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        subscription: { id: OTHER_SUBSCRIPTION_ID },
        payment: {
          id: PAYMENT_ID,
          reference_number: "SUB-12345",
          amount: 300,
          status: "under_review",
        },
      },
      error: null,
    });

    await expect(resubmitSubscriptionPaymentVoucher({
      subscriptionId: SUBSCRIPTION_ID,
      voucher: voucher(),
    })).rejects.toThrow("subscription_voucher_resubmission_result_invalid");

    expect(mocks.deletePaymentVoucher).toHaveBeenCalledExactlyOnceWith(VOUCHER_PATH, USER_ID);
  });
});
