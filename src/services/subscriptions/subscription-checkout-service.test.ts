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
  localFallback: false,
  previewReadOnly: false,
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
vi.mock("@/config/supabase-environment", () => ({
  get LOCAL_SUPABASE_FALLBACK() { return mocks.localFallback; },
  get PREVIEW_READ_ONLY() { return mocks.previewReadOnly; },
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const COLLECTION_ID = "33333333-3333-4333-8333-333333333333";
const SUBSCRIPTION_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_SUBSCRIPTION_ID = "55555555-5555-4555-8555-555555555555";
const PAYMENT_ID = "66666666-6666-4666-8666-666666666666";
const CHECKOUT_REQUEST_ID = "77777777-7777-4777-8777-777777777777";
const VOUCHER_PATH = `subscriptions/${USER_ID}/1788130800000-a1b2c3d4e5f60708.png`;
const voucher = () => new File(["proof"], "receipt.png", { type: "image/png" });

describe("subscription checkout voucher cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuthenticatedUserId.mockResolvedValue(USER_ID);
    mocks.uploadPaymentVoucher.mockResolvedValue(VOUCHER_PATH);
    mocks.deletePaymentVoucher.mockResolvedValue(undefined);
    mocks.localFallback = false;
    mocks.previewReadOnly = false;
  });

  it.each([
    ["local fallback", true, false],
    ["read-only preview", false, true],
  ] as const)(
    "blocks subscription voucher writes in a %s before auth or upload",
    async (_mode, localFallback, previewReadOnly) => {
      mocks.localFallback = localFallback;
      mocks.previewReadOnly = previewReadOnly;
      const file = voucher();

      await expect(createSubscriptionCheckoutForCurrentUser({
        planId: PLAN_ID,
        collectionId: COLLECTION_ID,
        selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
        modelSelectionLimit: 6,
        paymentMethod: "pix",
        voucher: file,
        checkoutRequestId: CHECKOUT_REQUEST_ID,
      })).rejects.toThrow("O envio de comprovantes está indisponível neste ambiente.");
      await expect(resubmitSubscriptionPaymentVoucher({
        subscriptionId: SUBSCRIPTION_ID,
        voucher: file,
      })).rejects.toThrow("O envio de comprovantes está indisponível neste ambiente.");

      expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
      expect(mocks.uploadPaymentVoucher).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("preserves a voucher when a successful checkout response cannot be confirmed", async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });

    await expect(createSubscriptionCheckoutForCurrentUser({
      planId: PLAN_ID,
      collectionId: COLLECTION_ID,
      selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
      modelSelectionLimit: 6,
      paymentMethod: "pix",
      voucher: voucher(),
      checkoutRequestId: CHECKOUT_REQUEST_ID,
    })).rejects.toThrow("Sua solicitação pode ter sido registrada");

    expect(mocks.deletePaymentVoucher).not.toHaveBeenCalled();
  });

  it("preserves a replacement voucher when the RPC returns a different subscription", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        subscription: { id: OTHER_SUBSCRIPTION_ID },
        payment: {
          id: PAYMENT_ID,
          reference_number: "SUB-12345",
          amount: 300,
          status: "under_review",
        },
        idempotent: false,
      },
      error: null,
    });

    await expect(resubmitSubscriptionPaymentVoucher({
      subscriptionId: SUBSCRIPTION_ID,
      voucher: voucher(),
    })).rejects.toThrow("Confira Pagamentos na sua conta");

    expect(mocks.deletePaymentVoucher).not.toHaveBeenCalled();
  });

  it("deletes a voucher when the checkout RPC explicitly rejects the request", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("Database rejected the request") });

    await expect(createSubscriptionCheckoutForCurrentUser({
      planId: PLAN_ID,
      collectionId: COLLECTION_ID,
      selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
      modelSelectionLimit: 6,
      paymentMethod: "pix",
      voucher: voucher(),
      checkoutRequestId: CHECKOUT_REQUEST_ID,
    })).rejects.toThrow("Database rejected the request");

    expect(mocks.deletePaymentVoucher).toHaveBeenCalledExactlyOnceWith(VOUCHER_PATH, USER_ID);
  });

  it("preserves the uploaded evidence when the transport response is ambiguous", async () => {
    mocks.rpc.mockRejectedValue(new Error("Network timeout"));
    await expect(createSubscriptionCheckoutForCurrentUser({
      planId: PLAN_ID,
      collectionId: COLLECTION_ID,
      selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
      modelSelectionLimit: 6,
      paymentMethod: "pix",
      voucher: voucher(),
      checkoutRequestId: CHECKOUT_REQUEST_ID,
    })).rejects.toThrow("Network timeout");
    expect(mocks.deletePaymentVoucher).not.toHaveBeenCalled();
  });

  it("returns the committed request on retry and removes only the unused retry voucher", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        subscription: { id: SUBSCRIPTION_ID },
        payment: {
          id: PAYMENT_ID,
          reference_number: "SUB-12345",
          amount: 1350,
          status: "paid",
        },
        idempotent: true,
      },
      error: null,
    });
    await expect(createSubscriptionCheckoutForCurrentUser({
      planId: PLAN_ID,
      collectionId: COLLECTION_ID,
      selectedModelSlugs: Array.from({ length: 6 }, (_, index) => `terror-${index + 1}`),
      modelSelectionLimit: 6,
      paymentMethod: "pix",
      voucher: voucher(),
      checkoutRequestId: CHECKOUT_REQUEST_ID,
    })).resolves.toMatchObject({
      subscriptionId: SUBSCRIPTION_ID,
      status: "paid",
      idempotent: true,
    });
    expect(mocks.deletePaymentVoucher).toHaveBeenCalledExactlyOnceWith(VOUCHER_PATH, USER_ID);
  });
});
