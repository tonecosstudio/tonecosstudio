import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelTonartExtraOrder,
  submitTonartExtraOrder,
} from "./tonart-extra-order-service";

const QUOTE = "11111111-1111-4111-8111-111111111111";
const OFFER = "22222222-2222-4222-8222-222222222222";
const REQUEST = "33333333-3333-4333-8333-333333333333";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: vi.fn(),
  assertCommercial: vi.fn(),
  localPreview: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.auth,
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosCommercialEnabled: mocks.assertCommercial,
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  isTonecosLocalPreviewEnabled: mocks.localPreview,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue("44444444-4444-4444-8444-444444444444");
  mocks.localPreview.mockReturnValue(false);
});
afterEach(() => vi.unstubAllEnvs());

describe("TONART extra checkout service", () => {
  it("sends only the offer, request, contact and maximum Coins to the canonical RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        quote_id: QUOTE,
        checkout_request_id: REQUEST,
        status: "pending",
        item_price_brl: "237.50",
        shipping_mode: "fixed",
        shipping_amount_brl: "20.25",
        coins_applied: "30.00",
        cash_amount_due_brl: "227.75",
        idempotent: false,
      },
      error: null,
    });

    await expect(
      submitTonartExtraOrder({
        offerId: OFFER,
        maximumCoins: 30,
        checkoutRequestId: REQUEST,
        whatsapp: "+55 (11) 99999-9999",
        postalCode: "01310-100",
      }),
    ).resolves.toEqual({
      quoteId: QUOTE,
      checkoutRequestId: REQUEST,
      status: "pending",
      itemPriceBrl: 237.5,
      shippingMode: "fixed",
      shippingAmountBrl: 20.25,
      coinsApplied: 30,
      cashAmountDueBrl: 227.75,
      idempotent: false,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "submit_tonart_extra_order_for_current_user",
      {
        p_offer_id: OFFER,
        p_coins_amount: 30,
        p_checkout_request_id: REQUEST,
        p_whatsapp: "5511999999999",
        p_postal_code: "01310100",
      },
    );
  });

  it("rejects malformed contact data before any RPC call", async () => {
    await expect(
      submitTonartExtraOrder({
        offerId: OFFER,
        maximumCoins: 25.25,
        checkoutRequestId: REQUEST,
        whatsapp: "abc",
        postalCode: "01310-100",
      }),
    ).rejects.toThrow("tonart_extra_order_contact_invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("preserves centi-Coins for a quote-required shipping checkout", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        quote_id: QUOTE,
        checkout_request_id: REQUEST,
        status: "pending",
        item_price_brl: 237.5,
        shipping_mode: "quote_required",
        shipping_amount_brl: null,
        coins_applied: 25.25,
        cash_amount_due_brl: 212.25,
        idempotent: true,
      },
      error: null,
    });
    const result = await submitTonartExtraOrder({
      offerId: OFFER,
      maximumCoins: 25.25,
      checkoutRequestId: REQUEST,
      whatsapp: "11999999999",
      postalCode: "01310100",
    });
    expect(result.coinsApplied).toBe(25.25);
    expect(result.cashAmountDueBrl).toBe(212.25);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_tonart_extra_order_for_current_user",
      expect.objectContaining({ p_coins_amount: 25.25 }),
    );
  });

  it("recovers the original order after reload even when its terms have changed", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        quote_id: QUOTE,
        checkout_request_id: REQUEST,
        status: "answered",
        item_price_brl: 237.5,
        shipping_mode: "quote_required",
        shipping_amount_brl: 24.9,
        coins_applied: 25.25,
        cash_amount_due_brl: 237.15,
        idempotent: true,
      },
      error: null,
    });
    await expect(
      submitTonartExtraOrder({
        offerId: OFFER,
        maximumCoins: 0,
        checkoutRequestId: REQUEST,
        whatsapp: "11999999999",
        postalCode: "01310100",
      }),
    ).resolves.toMatchObject({
      quoteId: QUOTE,
      status: "answered",
      shippingMode: "quote_required",
      shippingAmountBrl: 24.9,
      coinsApplied: 25.25,
      cashAmountDueBrl: 237.15,
      idempotent: true,
    });
  });

  it("submits cancellation through the existing quote authority", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        quote_id: QUOTE,
        status: "archived",
        payment_status: "failed",
        coins_reversed: "25.25",
        balance: "40.75",
        idempotent: true,
      },
      error: null,
    });
    await expect(cancelTonartExtraOrder(QUOTE)).resolves.toEqual({
      quoteId: QUOTE,
      coinsReversed: 25.25,
      balance: 40.75,
      idempotent: true,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "cancel_tonart_extra_order_for_current_user",
      { p_quote_id: QUOTE },
    );
  });
});
