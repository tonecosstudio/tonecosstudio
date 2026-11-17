import { supabase } from "@/integrations/supabase/client";
import { assertTonecosQuotesEnabled } from "@/config/tonecos-commercial-authority";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import type { CatalogQuoteItem } from "@/services/customer/catalog-quote-service";
import { MAX_CANONICAL_SELECTION } from "@/services/catalog/public-catalog-selection";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";
import {
  decodeTonartExtraOrderSnapshot,
  type TonartExtraOrderSnapshot,
} from "@/services/commercial/tonart-extra-order";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedStatuses = new Set(["pending", "reviewing", "answered", "archived"]);

export type AdminCatalogQuote = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string;
  status: string;
  createdAt: string;
  notes: string | null;
  items: CatalogQuoteItem[];
  quotedAmount: number | null;
  listAmount: number | null;
  discountPercent: number;
  discountAmount: number;
  responseMessage: string | null;
  whatsapp: string | null;
  postalCode: string | null;
  scale: string;
  finishing: string;
  isPreorder: boolean;
  depositAmount: number | null;
  remainingAmount: number | null;
  commercialOfferSnapshot: TonartExtraOrderSnapshot | null;
  commercialShippingAmountBrl: number | null;
  canCancelExtraOrder: boolean;
};

export type AdminCatalogQuotePage = {
  total: number;
  limit: number;
  offset: number;
  rows: AdminCatalogQuote[];
};

export type AdminCatalogQuoteQuery = {
  quoteId?: string | null;
  status?: "pending" | "reviewing" | "answered" | "archived" | null;
  limit?: number;
  offset?: number;
};

const assertCommercialMode = assertTonecosQuotesEnabled;

function decodeItems(value: unknown): CatalogQuoteItem[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_CANONICAL_SELECTION
  ) {
    throw new Error("admin_catalog_quote_items_invalid");
  }
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("admin_catalog_quote_item_invalid");
    }
    const item = raw as { slug?: unknown; quantity?: unknown };
    if (
      typeof item.slug !== "string" ||
      !validCatalogSlug(item.slug) ||
      !Number.isInteger(item.quantity) ||
      (item.quantity as number) < 1 ||
      (item.quantity as number) > 10 ||
      seen.has(item.slug)
    ) {
      throw new Error("admin_catalog_quote_item_invalid");
    }
    seen.add(item.slug);
    return { slug: item.slug, quantity: item.quantity as number };
  });
}

function decodeQuote(value: unknown): AdminCatalogQuote {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("admin_catalog_quote_row_invalid");
  }
  const row = value as Record<string, unknown>;
  const quotedAmount = row.quotedAmount as number | null;
  const listAmount = row.listAmount == null ? quotedAmount : row.listAmount;
  const discountPercent = row.discountPercent == null ? 0 : row.discountPercent;
  const discountAmount = row.discountAmount == null ? 0 : row.discountAmount;
  const commercialOfferSnapshot =
    row.commercialOfferSnapshot == null
      ? null
      : decodeTonartExtraOrderSnapshot(row.commercialOfferSnapshot);
  let commercialShippingAmountBrl: number | null = null;
  if (row.commercialShippingAmountBrl !== null && row.commercialShippingAmountBrl !== undefined) {
    try {
      const raw = row.commercialShippingAmountBrl;
      const hundredths = decimalToHundredths(
        typeof raw === "number" || typeof raw === "string" ? raw : "",
      );
      if (hundredths < 0 || hundredths > 9_999_999_999) {
        throw new Error("invalid");
      }
      commercialShippingAmountBrl = hundredths / 100;
    } catch {
      throw new Error("admin_catalog_quote_commercial_shipping_invalid");
    }
  }
  const items = decodeItems(row.items);
  if (
    typeof row.id !== "string" ||
    !uuid.test(row.id) ||
    typeof row.userId !== "string" ||
    !uuid.test(row.userId) ||
    !(row.customerName === null || typeof row.customerName === "string") ||
    typeof row.customerEmail !== "string" ||
    row.customerEmail.length < 3 ||
    row.customerEmail.length > 320 ||
    typeof row.status !== "string" ||
    !allowedStatuses.has(row.status) ||
    typeof row.createdAt !== "string" ||
    Number.isNaN(Date.parse(row.createdAt)) ||
    !(row.notes === null || (typeof row.notes === "string" && row.notes.length <= 2000)) ||
    !(
      row.quotedAmount === null ||
      (typeof row.quotedAmount === "number" &&
        Number.isFinite(row.quotedAmount) &&
        row.quotedAmount > 0)
    ) ||
    !(listAmount === null ||
      (typeof listAmount === "number" && Number.isFinite(listAmount) && listAmount > 0)) ||
    typeof discountPercent !== "number" || !Number.isInteger(discountPercent) ||
    discountPercent < 0 || discountPercent > 50 ||
    typeof discountAmount !== "number" || !Number.isFinite(discountAmount) || discountAmount < 0 ||
    (quotedAmount !== null &&
      (listAmount === null || listAmount < quotedAmount ||
        Math.abs(listAmount - discountAmount - quotedAmount) > 0.001 ||
        Math.abs(
          Math.round(((listAmount * discountPercent) / 100 + Number.EPSILON) * 100) / 100 -
            discountAmount,
        ) > 0.001)) ||
    !(
      row.responseMessage === null ||
      (typeof row.responseMessage === "string" &&
        row.responseMessage.length <= 2000)
    ) ||
    !(row.whatsapp === null || typeof row.whatsapp === "string") ||
    !(row.postalCode === null || typeof row.postalCode === "string") ||
    typeof row.scale !== "string" ||
    typeof row.finishing !== "string" ||
    !(row.isPreorder === undefined || typeof row.isPreorder === "boolean") ||
    !(row.depositAmount === undefined || row.depositAmount === null || (typeof row.depositAmount === "number" && Number.isFinite(row.depositAmount) && row.depositAmount > 0)) ||
    !(row.remainingAmount === undefined || row.remainingAmount === null || (typeof row.remainingAmount === "number" && Number.isFinite(row.remainingAmount) && row.remainingAmount > 0)) ||
    !(row.canCancelExtraOrder === undefined || typeof row.canCancelExtraOrder === "boolean")
  ) {
    throw new Error("admin_catalog_quote_row_invalid");
  }
  if (commercialOfferSnapshot && (
    items.length !== 1 ||
    items[0].slug !== commercialOfferSnapshot.catalogModelSlug ||
    items[0].quantity !== 1 ||
    row.scale !== commercialOfferSnapshot.scale ||
    row.finishing !== (commercialOfferSnapshot.finishing === "painted" ? "pintado" : "sem pintura") ||
    (commercialOfferSnapshot.shippingMode === "fixed" &&
      commercialShippingAmountBrl !== commercialOfferSnapshot.configuredShippingAmountBrl) ||
    (commercialOfferSnapshot.shippingMode === "quote_required" &&
      row.status === "answered" && commercialShippingAmountBrl === null) ||
    (quotedAmount !== null && Math.abs(
      quotedAmount - commercialOfferSnapshot.itemPriceBrl -
        (commercialShippingAmountBrl ?? 0)
    ) > 0.001) ||
    (listAmount !== null && Math.abs(
      listAmount - commercialOfferSnapshot.itemPriceBrl -
        (commercialShippingAmountBrl ?? 0)
    ) > 0.001) ||
    discountPercent !== 0 || discountAmount !== 0
  )) {
    throw new Error("admin_catalog_quote_commercial_terms_invalid");
  }

  return {
    id: row.id,
    userId: row.userId,
    customerName: row.customerName as string | null,
    customerEmail: row.customerEmail,
    status: row.status,
    createdAt: row.createdAt,
    notes: row.notes as string | null,
    items,
    quotedAmount,
    listAmount,
    discountPercent,
    discountAmount,
    responseMessage: row.responseMessage as string | null,
    whatsapp: row.whatsapp as string | null,
    postalCode: row.postalCode as string | null,
    scale: row.scale,
    finishing: row.finishing,
    isPreorder: row.isPreorder === true,
    depositAmount: (row.depositAmount ?? null) as number | null,
    remainingAmount: (row.remainingAmount ?? null) as number | null,
    commercialOfferSnapshot,
    commercialShippingAmountBrl,
    canCancelExtraOrder: row.canCancelExtraOrder === true,
  };
}

/** Reads the complete canonical quote queue through an admin-only paginated RPC. */
export async function loadAdminCatalogQuotePage(
  query: AdminCatalogQuoteQuery = {},
): Promise<AdminCatalogQuotePage> {
  assertCommercialMode();
  const quoteId = query.quoteId ?? null;
  const status = query.status ?? null;
  const limit = query.limit ?? 25;
  const offset = query.offset ?? 0;

  if (
    (quoteId !== null && (typeof quoteId !== "string" || !uuid.test(quoteId))) ||
    (status !== null && !allowedStatuses.has(status)) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000
  ) {
    throw new Error("admin_catalog_quote_query_invalid");
  }

  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("tonart_admin_quotes_directory", {
    p_quote_id: quoteId ?? undefined,
    p_status: status ?? undefined,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("admin_catalog_quote_directory_invalid");
  }

  const result = data as unknown as Record<string, unknown>;
  if (
    typeof result.total !== "number" ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    result.limit !== limit ||
    result.offset !== offset ||
    !Array.isArray(result.rows) ||
    result.rows.length > limit
  ) {
    throw new Error("admin_catalog_quote_directory_invalid");
  }

  const rows = result.rows.map(decodeQuote);
  if (rows.length > Math.max(0, result.total - offset)) {
    throw new Error("admin_catalog_quote_directory_invalid");
  }

  return { total: result.total, limit, offset, rows };
}

/** Compatibility helper for callers that need only the newest bounded page. */
export async function listAdminCatalogQuotes(
  limit = 50,
): Promise<AdminCatalogQuote[]> {
  return (await loadAdminCatalogQuotePage({ limit, offset: 0 })).rows;
}

/** Only the privileged server RPC may answer a quote. */
export async function answerCatalogQuoteRequest(
  quoteId: string,
  listAmount: number,
  message: string,
  discountPercent = 0,
): Promise<string> {
  assertCommercialMode();
  const responseMessage = typeof message === "string" ? message.trim() : "";
  if (
    !uuid.test(quoteId) ||
    !Number.isFinite(listAmount) ||
    listAmount <= 0 ||
    listAmount > 99999999.99 ||
    Math.abs(listAmount * 100 - Math.round(listAmount * 100)) > 0.00001 ||
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 50 ||
    (Number.isFinite(listAmount) &&
      listAmount - Math.round(((listAmount * discountPercent) / 100 + Number.EPSILON) * 100) / 100 <= 0) ||
    responseMessage.length < 1 ||
    responseMessage.length > 2000
  ) {
    throw new Error("admin_catalog_quote_response_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("answer_catalog_quote_request", {
    p_quote_id: quoteId,
    p_amount: listAmount,
    p_message: responseMessage,
    p_discount_percent: discountPercent,
  });
  if (error) throw error;
  if (data !== quoteId) throw new Error("admin_catalog_quote_result_invalid");
  return data;
}

/** Finalizes only the freight and response for an immutable catalog extra order. */
export async function answerTonartExtraOrder(
  quoteId: string,
  shippingAmount: number,
  message: string,
): Promise<string> {
  assertCommercialMode();
  const responseMessage = typeof message === "string" ? message.trim() : "";
  let shippingHundredths: number;
  try {
    shippingHundredths = decimalToHundredths(shippingAmount);
  } catch {
    throw new Error("admin_catalog_quote_commercial_shipping_invalid");
  }
  if (
    !uuid.test(quoteId) ||
    shippingHundredths < 0 ||
    shippingHundredths > 9_999_999_999 ||
    responseMessage.length < 1 ||
    responseMessage.length > 2000
  ) {
    throw new Error("admin_catalog_quote_commercial_response_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("admin_answer_tonart_extra_order", {
    p_quote_id: quoteId.toLowerCase(),
    p_shipping_amount: shippingHundredths / 100,
    p_message: responseMessage,
  });
  if (error) throw error;
  if (data !== quoteId.toLowerCase()) {
    throw new Error("admin_catalog_quote_commercial_result_invalid");
  }
  return data;
}

/** Cancels an extra order only through the server's payment checks and ledger reversal. */
export async function cancelAdminTonartExtraOrder(
  quoteId: string,
  reason: string,
): Promise<void> {
  assertCommercialMode();
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  if (!uuid.test(quoteId) || normalizedReason.length < 4 || normalizedReason.length > 500) {
    throw new Error("admin_catalog_quote_cancellation_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("admin_cancel_tonart_extra_order", {
    p_quote_id: quoteId.toLowerCase(),
    p_reason: normalizedReason,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("admin_catalog_quote_cancellation_invalid");
  }
  const result = data as Record<string, unknown>;
  if (
    result.quote_id !== quoteId.toLowerCase() ||
    result.status !== "archived" ||
    result.payment_status !== "failed" ||
    typeof result.idempotent !== "boolean"
  ) {
    throw new Error("admin_catalog_quote_cancellation_invalid");
  }
}

/** Uses the canonical quote status RPC; no browser-side table mutations. */
export async function changeCatalogQuoteStatus(
  quoteId: string,
  status: "pending" | "reviewing" | "archived",
): Promise<string> {
  assertCommercialMode();
  if (!uuid.test(quoteId) || !["pending", "reviewing", "archived"].includes(status)) {
    throw new Error("admin_catalog_quote_status_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("admin_update_quote_status", {
    p_quote_id: quoteId,
    p_status: status,
  });
  if (error) throw error;
  if (data !== quoteId) {
    throw new Error("admin_catalog_quote_status_result_invalid");
  }
  return data;
}
