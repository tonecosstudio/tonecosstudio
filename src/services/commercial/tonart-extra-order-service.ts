import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/tonecos-mvp.types";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";
import { isTonecosLocalPreviewEnabled } from "@/services/customer/tonecos-account-service";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";

const tonecos = supabase as unknown as SupabaseClient<Database>;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TonartExtraOrderResult = {
  quoteId: string;
  checkoutRequestId: string;
  status: "pending" | "reviewing" | "answered" | "archived";
  itemPriceBrl: number;
  shippingMode: "fixed" | "quote_required";
  shippingAmountBrl: number | null;
  coinsApplied: number;
  cashAmountDueBrl: number;
  idempotent: boolean;
};

export type TonartExtraOrderCancellation = {
  quoteId: string;
  coinsReversed: number;
  balance: number;
  idempotent: boolean;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("tonart_extra_order_response_invalid");
  }
  return value as Record<string, unknown>;
}

function readHundredths(value: unknown, allowZero = false): number {
  let amountHundredths: number;
  try {
    amountHundredths = decimalToHundredths(
      typeof value === "string" || typeof value === "number" ? value : "",
    );
  } catch {
    throw new Error("tonart_extra_order_response_invalid");
  }
  if (
    amountHundredths < (allowZero ? 0 : 1) ||
    amountHundredths > 9_999_999_999
  ) {
    throw new Error("tonart_extra_order_response_invalid");
  }
  return amountHundredths;
}

function normalizeContact(input: { whatsapp: string; postalCode: string }) {
  const whatsapp = input.whatsapp.trim().replace(/[ ()+.-]/g, "");
  const postalCode = input.postalCode.replace(/\D/g, "");
  if (
    input.whatsapp.length > 40 ||
    !/^\d{10,13}$/.test(whatsapp) ||
    input.postalCode.length > 20 ||
    !/^\d{8}$/.test(postalCode)
  ) {
    throw new Error("tonart_extra_order_contact_invalid");
  }
  return { whatsapp, postalCode };
}

/** Sends only offer identity and a Coins limit; the database calculates price and balance. */
export async function submitTonartExtraOrder(input: {
  offerId: string;
  maximumCoins: number;
  checkoutRequestId: string;
  whatsapp: string;
  postalCode: string;
}): Promise<TonartExtraOrderResult> {
  assertTonecosCommercialEnabled();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonart_local_preview_read_only");
  }
  if (
    !input ||
    !uuidPattern.test(input.offerId) ||
    !uuidPattern.test(input.checkoutRequestId)
  ) {
    throw new Error("tonart_extra_order_input_invalid");
  }
  const coinsHundredths = readHundredths(input.maximumCoins, true);
  if (coinsHundredths > 100_000_000) {
    throw new Error("tonart_extra_order_input_invalid");
  }
  const contact = normalizeContact(input);
  await requireAuthenticatedUserId();

  const { data, error } = await tonecos.rpc(
    "submit_tonart_extra_order_for_current_user",
    {
      p_offer_id: input.offerId.toLowerCase(),
      p_coins_amount: coinsHundredths / 100,
      p_checkout_request_id: input.checkoutRequestId.toLowerCase(),
      p_whatsapp: contact.whatsapp,
      p_postal_code: contact.postalCode,
    },
  );
  if (error) throw error;

  const result = object(data);
  const itemPriceHundredths = readHundredths(result.item_price_brl);
  const coinsAppliedHundredths = readHundredths(result.coins_applied, true);
  const cashDueHundredths = readHundredths(result.cash_amount_due_brl, true);
  const shippingAmountBrl =
    result.shipping_amount_brl === null
      ? null
      : readHundredths(result.shipping_amount_brl, true) / 100;
  const idempotent = result.idempotent;
  const isFinalStatus =
    result.status === "answered" || result.status === "archived";
  if (
    typeof result.quote_id !== "string" ||
    !uuidPattern.test(result.quote_id) ||
    result.checkout_request_id !== input.checkoutRequestId.toLowerCase() ||
    (result.status !== "pending" &&
      result.status !== "reviewing" &&
      result.status !== "answered" &&
      result.status !== "archived") ||
    (result.shipping_mode !== "fixed" &&
      result.shipping_mode !== "quote_required") ||
    (result.shipping_mode === "fixed" && shippingAmountBrl === null) ||
    (result.shipping_mode === "quote_required" &&
      result.status === "answered" &&
      shippingAmountBrl === null) ||
    (result.shipping_mode === "quote_required" &&
      !isFinalStatus &&
      shippingAmountBrl !== null) ||
    (coinsAppliedHundredths > coinsHundredths && idempotent !== true) ||
    coinsAppliedHundredths > itemPriceHundredths ||
    cashDueHundredths !==
      itemPriceHundredths +
        (shippingAmountBrl === null
          ? 0
          : decimalToHundredths(shippingAmountBrl)) -
        coinsAppliedHundredths ||
    typeof idempotent !== "boolean"
  ) {
    throw new Error("tonart_extra_order_response_invalid");
  }
  return {
    quoteId: result.quote_id,
    checkoutRequestId: result.checkout_request_id as string,
    status: result.status,
    itemPriceBrl: itemPriceHundredths / 100,
    shippingMode: result.shipping_mode,
    shippingAmountBrl,
    coinsApplied: coinsAppliedHundredths / 100,
    cashAmountDueBrl: cashDueHundredths / 100,
    idempotent,
  };
}

/** Cancels a pending extra order and reverses its Coins reservation atomically. */
export async function cancelTonartExtraOrder(
  quoteId: string,
): Promise<TonartExtraOrderCancellation> {
  assertTonecosCommercialEnabled();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonart_local_preview_read_only");
  }
  if (!uuidPattern.test(quoteId)) {
    throw new Error("tonart_extra_order_input_invalid");
  }
  await requireAuthenticatedUserId();
  const { data, error } = await tonecos.rpc(
    "cancel_tonart_extra_order_for_current_user",
    { p_quote_id: quoteId.toLowerCase() },
  );
  if (error) throw error;
  const result = object(data);
  const coinsReversedHundredths = readHundredths(result.coins_reversed, true);
  const balanceHundredths = readHundredths(result.balance, true);
  if (
    result.quote_id !== quoteId.toLowerCase() ||
    result.status !== "archived" ||
    result.payment_status !== "failed" ||
    typeof result.idempotent !== "boolean"
  ) {
    throw new Error("tonart_extra_order_cancellation_invalid");
  }
  return {
    quoteId: quoteId.toLowerCase(),
    coinsReversed: coinsReversedHundredths / 100,
    balance: balanceHundredths / 100,
    idempotent: result.idempotent,
  };
}
