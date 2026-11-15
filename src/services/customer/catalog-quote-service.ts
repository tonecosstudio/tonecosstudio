import { supabase } from "@/integrations/supabase/client";
import { assertTonecosQuotesEnabled } from "@/config/tonecos-commercial-authority";
import {
  isTonecosLocalPreviewEnabled,
  TONECOS_LOCAL_PREVIEW_QUOTE_ID,
  TONECOS_LOCAL_PREVIEW_USER_ID,
} from "@/services/customer/tonecos-account-service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";
import {
  validCatalogSlug,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";
import { MAX_CANONICAL_SELECTION } from "@/services/catalog/public-catalog-selection";
import {
  deletePaymentVoucher,
  uploadPaymentVoucher,
} from "@/services/payments/payment-voucher-storage-service";

/** One commercial quote authority: Supabase quotes. Catalog model slugs come from D1. */
export type CatalogQuoteItem = { slug: string; quantity: number };
export type CatalogQuotePreferences = {
  whatsapp?: string;
  postalCode?: string;
  scale?: "a definir" | "1/10" | "1/6" | "outro";
  finishing?: "a definir" | "pintado" | "sem pintura";
};
export type CatalogQuoteIntent = "quote" | "preorder";
export type CustomerCatalogQuote = {
  id: string;
  status: string;
  createdAt: string;
  deadline: string | null;
  notes: string | null;
  items: CatalogQuoteItem[];
  /** No price is supplied or approved by the customer. */
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
  paymentStatus: string | null;
  paymentLink: string | null;
  pixKey: string | null;
  paymentInstructions: string | null;
  paymentLinkSentAt: string | null;
  finalPaymentNotifiedAt: string | null;
  readyForFinalPayment: boolean;
  paymentVoucherPath: string | null;
  paymentVoucherType: "deposit" | "final" | "full" | null;
  paymentVoucherRejectionReason: string | null;
  coinAmountApplied: number;
};

export type CustomerCatalogQuotePage = {
  total: number;
  limit: number;
  offset: number;
  rows: CustomerCatalogQuote[];
};

const requireCommercialQuoteMode = assertTonecosQuotesEnabled;

const LOCAL_PREVIEW_QUOTE: CustomerCatalogQuote = {
  id: TONECOS_LOCAL_PREVIEW_QUOTE_ID,
  status: "pending",
  createdAt: "2026-11-10T12:00:00.000Z",
  deadline: null,
  notes: "Gostaria de receber uma cotação para este modelo.",
  items: [{ slug: "naruto", quantity: 1 }],
  quotedAmount: null,
  listAmount: null,
  discountPercent: 0,
  discountAmount: 0,
  responseMessage: null,
  whatsapp: "5511900000000",
  postalCode: "01401000",
  scale: "1/10",
  finishing: "pintado",
  isPreorder: false,
  depositAmount: null,
  remainingAmount: null,
  paymentStatus: null,
  paymentLink: null,
  pixKey: null,
  paymentInstructions: null,
  paymentLinkSentAt: null,
  finalPaymentNotifiedAt: null,
  readyForFinalPayment: false,
  paymentVoucherPath: null,
  paymentVoucherType: null,
  paymentVoucherRejectionReason: null,
  coinAmountApplied: 0,
};

function validateItems(items: readonly CatalogQuoteItem[]): CatalogQuoteItem[] {
  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > MAX_CANONICAL_SELECTION
  ) {
    throw new Error("catalog_quote_selection_invalid");
  }
  const seen = new Set<string>();
  return items.map((item) => {
    if (
      !item ||
      typeof item.slug !== "string" ||
      !validCatalogSlug(item.slug) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10 ||
      seen.has(item.slug)
    ) {
      throw new Error("catalog_quote_item_invalid");
    }
    seen.add(item.slug);
    return { slug: item.slug, quantity: item.quantity };
  });
}

/** Convert only published items selected in the existing read-only catalog. */
export function quoteItemsFromSelection(
  models: readonly PublicCatalogModel[],
): CatalogQuoteItem[] {
  return validateItems(
    models.map((model) => ({ slug: model.slug, quantity: 1 })),
  );
}

/** Requires a real authenticated customer; the DB derives owner from auth.uid(). */
export async function submitCatalogQuoteRequest(
  userId: string,
  items: readonly CatalogQuoteItem[],
  notes: string | null = null,
  preferences: CatalogQuotePreferences = {},
  intent: CatalogQuoteIntent = "quote",
): Promise<string> {
  requireCommercialQuoteMode();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("catalog_quote_local_preview_read_only");
  }
  const safeItems = validateItems(items);
  if (notes !== null && typeof notes !== "string") {
    throw new Error("catalog_quote_notes_invalid");
  }
  const safeNotes = notes?.trim() || null;
  if (safeNotes && safeNotes.length > 2000) {
    throw new Error("catalog_quote_notes_invalid");
  }
  const whatsapp = (preferences.whatsapp ?? "").trim().replace(/[ ()+.-]/g, "");
  const postalCode = (preferences.postalCode ?? "").trim().replace(/\D/g, "");
  const scale = preferences.scale ?? "a definir";
  const finishing = preferences.finishing ?? "a definir";
  if (
    (whatsapp && !/^[0-9]{10,13}$/.test(whatsapp)) ||
    (postalCode && !/^[0-9]{8}$/.test(postalCode)) ||
    !["a definir", "1/10", "1/6", "outro"].includes(scale) ||
    !["a definir", "pintado", "sem pintura"].includes(finishing)
  ) {
    throw new Error("catalog_quote_contact_invalid");
  }
  await assertCurrentUserId(userId);
  const client = tonecos;
  if (intent !== "quote" && intent !== "preorder") {
    throw new Error("catalog_quote_intent_invalid");
  }
  const { data, error } = await client.rpc(
    intent === "preorder"
      ? "submit_catalog_preorder_request"
      : "submit_catalog_quote_request",
    {
      p_models: safeItems,
      p_notes: safeNotes ?? undefined,
      p_whatsapp: whatsapp || undefined,
      p_postal_code: postalCode || undefined,
      p_scale: scale,
      p_finishing: finishing,
    },
  );
  if (error) throw error;
  if (
    !data ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data,
    )
  ) {
    throw new Error("catalog_quote_response_invalid");
  }
  return data;
}

type QuoteDbRow = {
  id: string;
  status: string;
  created_at: string;
  deadline: string | null;
  notes: string | null;
  total_amount: number | null;
  list_amount?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  admin_response: string | null;
  requested_catalog_models: unknown;
  catalog_requested_at: string | null;
  customer_whatsapp: string | null;
  postal_code: string | null;
  desired_scale: string;
  finishing: string;
  is_preorder?: boolean | null;
  deposit_amount?: number | null;
  remaining_amount?: number | null;
  payment_status?: string | null;
  payment_link?: string | null;
  pix_key?: string | null;
  payment_instructions?: string | null;
  payment_link_sent_at?: string | null;
  final_payment_notified_at?: string | null;
  ready_for_final_payment?: boolean;
  payment_voucher_path?: string | null;
  payment_voucher_type?: string | null;
  payment_voucher_rejection_reason?: string | null;
};

const QUOTE_HISTORY_SELECT =
  "id,status,created_at,deadline,notes,total_amount,list_amount,discount_percent,discount_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing,is_preorder,deposit_amount,remaining_amount,payment_status,payment_link,pix_key,payment_instructions,payment_link_sent_at,final_payment_notified_at,ready_for_final_payment,payment_voucher_path,payment_voucher_type,payment_voucher_rejection_reason";
const QUOTE_HISTORY_SELECT_WITHOUT_PROMOTION =
  "id,status,created_at,deadline,notes,total_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing,is_preorder,deposit_amount,remaining_amount,payment_status,payment_link,pix_key,payment_instructions,payment_link_sent_at,final_payment_notified_at,ready_for_final_payment,payment_voucher_path,payment_voucher_type,payment_voucher_rejection_reason";
const QUOTE_HISTORY_SELECT_WITHOUT_PAYMENT =
  "id,status,created_at,deadline,notes,total_amount,list_amount,discount_percent,discount_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing";
const QUOTE_HISTORY_SELECT_LEGACY =
  "id,status,created_at,deadline,notes,total_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing";
const PREORDER_SCHEMA_COLUMNS = [
  "is_preorder",
  "deposit_amount",
  "remaining_amount",
  "payment_status",
  "payment_link",
  "pix_key",
  "payment_instructions",
  "payment_link_sent_at",
  "final_payment_notified_at",
  "ready_for_final_payment",
  "payment_voucher_path",
  "payment_voucher_type",
  "payment_voucher_rejection_reason",
];
const PROMOTION_SCHEMA_COLUMNS = [
  "list_amount",
  "discount_percent",
  "discount_amount",
];

function isMissingPreorderSchemaColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (value.code !== "42703" && value.code !== "PGRST204") return false;
  const description = `${value.message ?? ""} ${value.details ?? ""}`;
  return PREORDER_SCHEMA_COLUMNS.some((column) =>
    new RegExp(`\\b${column}\\b`, "i").test(description),
  );
}

function isMissingPromotionSchemaColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (value.code !== "42703" && value.code !== "PGRST204") return false;
  const description = `${value.message ?? ""} ${value.details ?? ""}`;
  return PROMOTION_SCHEMA_COLUMNS.some((column) =>
    new RegExp(`\\b${column}\\b`, "i").test(description),
  );
}

async function fetchMyQuotePage(
  userId: string,
  quoteId: string | undefined,
  limit: number,
  offset: number,
  selection: string,
): Promise<{
  data: QuoteDbRow[] | null;
  error: { code?: string; message?: string; details?: string } | null;
  count: number | null;
}> {
  let query = tonecos
    .from("quotes")
    .select(selection, { count: "exact" })
    .eq("user_id", userId)
    .not("catalog_requested_at", "is", null);
  if (quoteId !== undefined) query = query.eq("id", quoteId.toLowerCase());
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return {
    data: data as unknown as QuoteDbRow[] | null,
    error,
    count,
  };
}

/** Own records only; the quotes RLS policy remains the database's authority. */
export async function loadMyCatalogQuotePage(
  userId: string,
  options: { limit?: number; offset?: number; quoteId?: string } = {},
): Promise<CustomerCatalogQuotePage> {
  if (!isTonecosLocalPreviewEnabled()) requireCommercialQuoteMode();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const quoteId = options.quoteId;
  if (
    (quoteId !== undefined &&
      (typeof quoteId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          quoteId,
        ))) ||
    (quoteId !== undefined && (limit !== 1 || offset !== 0)) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000
  ) {
    throw new Error("catalog_quote_list_query_invalid");
  }

  if (isTonecosLocalPreviewEnabled()) {
    if (userId !== TONECOS_LOCAL_PREVIEW_USER_ID) {
      throw new Error("tonecos_login_required");
    }
    const matchesSelection =
      quoteId === undefined || quoteId.toLowerCase() === LOCAL_PREVIEW_QUOTE.id;
    const rows = matchesSelection && offset === 0 ? [LOCAL_PREVIEW_QUOTE] : [];
    return {
      total: matchesSelection ? 1 : 0,
      limit,
      offset,
      rows: rows.slice(0, limit),
    };
  }

  await assertCurrentUserId(userId);
  // A deep link is resolved by the same protected quotes relation and RLS,
  // not by paging through a customer's history or exposing a public lookup.
  // Fall back only for the known optional preorder/promotion columns.
  let paymentSchemaAvailable = true;
  let promotionSchemaAvailable = true;
  let result = await fetchMyQuotePage(
    userId,
    quoteId,
    limit,
    offset,
    QUOTE_HISTORY_SELECT,
  );
  if (result.error) {
    if (isMissingPromotionSchemaColumn(result.error)) {
      promotionSchemaAvailable = false;
      result = await fetchMyQuotePage(
        userId,
        quoteId,
        limit,
        offset,
        QUOTE_HISTORY_SELECT_WITHOUT_PROMOTION,
      );
    } else if (isMissingPreorderSchemaColumn(result.error)) {
      paymentSchemaAvailable = false;
      result = await fetchMyQuotePage(
        userId,
        quoteId,
        limit,
        offset,
        QUOTE_HISTORY_SELECT_WITHOUT_PAYMENT,
      );
    }
  }
  if (
    result.error &&
    promotionSchemaAvailable &&
    isMissingPromotionSchemaColumn(result.error)
  ) {
    promotionSchemaAvailable = false;
    result = await fetchMyQuotePage(
      userId,
      quoteId,
      limit,
      offset,
      QUOTE_HISTORY_SELECT_LEGACY,
    );
  }
  if (
    result.error &&
    paymentSchemaAvailable &&
    isMissingPreorderSchemaColumn(result.error)
  ) {
    paymentSchemaAvailable = false;
    result = await fetchMyQuotePage(
      userId,
      quoteId,
      limit,
      offset,
      QUOTE_HISTORY_SELECT_LEGACY,
    );
  }
  const { data, error, count } = result;
  if (error) throw error;

  const coinPaymentsByQuote = new Map<string, number>();
  const quoteIds = (data ?? []).map((row) => row.id);
  if (
    quoteIds.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  ) {
    throw new Error("catalog_quote_rows_invalid");
  }
  const coinPaymentSchemaAvailable =
    paymentSchemaAvailable &&
    (data ?? []).some((row) => typeof row.is_preorder === "boolean");
  if (coinPaymentSchemaAvailable && quoteIds.length > 0) {
    const { data: coinPayments, error: coinPaymentsError } = await tonecos
      .from("quote_payments")
      .select("quote_id,amount")
      .eq("user_id", userId)
      .eq("payment_type", "coins")
      .eq("status", "completed")
      .in("quote_id", quoteIds);
    if (coinPaymentsError) throw coinPaymentsError;
    for (const payment of coinPayments ?? []) {
      const amount = Number(payment.amount);
      if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 100000 ||
        !quoteIds.includes(payment.quote_id)
      ) {
        throw new Error("catalog_quote_coin_payment_invalid");
      }
      const applied = (coinPaymentsByQuote.get(payment.quote_id) ?? 0) + amount;
      if (applied > 100000)
        throw new Error("catalog_quote_coin_payment_invalid");
      coinPaymentsByQuote.set(payment.quote_id, applied);
    }
  }
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("catalog_quote_count_invalid");
  }

  const rows = ((data ?? []) as QuoteDbRow[]).map(
    (row): CustomerCatalogQuote => {
      const items = validateListedItems(row.requested_catalog_models);
      if (
        typeof row.id !== "string" ||
        typeof row.status !== "string" ||
        typeof row.created_at !== "string" ||
        typeof row.catalog_requested_at !== "string" ||
        !row.catalog_requested_at ||
        (row.admin_response !== null &&
          (typeof row.admin_response !== "string" ||
            row.admin_response.length > 2000))
      ) {
        throw new Error("catalog_quote_row_invalid");
      }
      const voucherPath = paymentSchemaAvailable
        ? (row.payment_voucher_path ?? null)
        : null;
      const voucherType = !paymentSchemaAvailable
        ? null
        : row.payment_voucher_type === "deposit"
          ? "deposit"
          : row.payment_voucher_type === "final"
            ? "final"
            : row.payment_voucher_type === "full"
              ? "full"
              : null;
      const quotedAmount =
        ["answered", "archived"].includes(row.status) &&
        row.total_amount !== null &&
        row.total_amount > 0
          ? row.total_amount
          : null;
      const listAmount = promotionSchemaAvailable
        ? (validPositiveMoney(row.list_amount) ??
          validPositiveMoney(row.total_amount))
        : validPositiveMoney(row.total_amount);
      const discountPercent = promotionSchemaAvailable
        ? validDiscountPercent(row.discount_percent)
        : 0;
      const discountAmount = promotionSchemaAvailable
        ? validNonNegativeMoney(row.discount_amount)
        : 0;
      if (
        discountPercent === null ||
        discountAmount === null ||
        (quotedAmount !== null &&
          (listAmount === null ||
            listAmount < quotedAmount ||
            Math.abs(listAmount - discountAmount - quotedAmount) > 0.001 ||
            Math.abs(
              Math.round(
                ((listAmount * discountPercent) / 100 + Number.EPSILON) * 100,
              ) /
                100 -
                discountAmount,
            ) > 0.001))
      ) {
        throw new Error("catalog_quote_promotion_invalid");
      }
      if (
        voucherPath != null &&
        (typeof voucherPath !== "string" ||
          !new RegExp(
            `^quotes/${userId.toLowerCase()}/${row.id.toLowerCase()}/[0-9]{10,16}-[0-9a-f]{16}\\.(jpg|jpeg|png|pdf)$`,
          ).test(voucherPath))
      ) {
        throw new Error("catalog_quote_voucher_path_invalid");
      }
      return {
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        deadline: row.deadline,
        notes: row.notes,
        items,
        quotedAmount,
        listAmount,
        discountPercent,
        discountAmount,
        responseMessage: row.admin_response,
        whatsapp: row.customer_whatsapp,
        postalCode: row.postal_code,
        scale: row.desired_scale,
        finishing: row.finishing,
        isPreorder: paymentSchemaAvailable && row.is_preorder === true,
        depositAmount: paymentSchemaAvailable
          ? validPositiveMoney(row.deposit_amount)
          : null,
        remainingAmount: paymentSchemaAvailable
          ? validPositiveMoney(row.remaining_amount)
          : null,
        paymentStatus: paymentSchemaAvailable
          ? (row.payment_status ?? null)
          : null,
        paymentLink: paymentSchemaAvailable
          ? validOptionalText(row.payment_link, 2000)
          : null,
        pixKey: paymentSchemaAvailable
          ? validOptionalText(row.pix_key, 220)
          : null,
        paymentInstructions: paymentSchemaAvailable
          ? validOptionalText(row.payment_instructions, 4000)
          : null,
        paymentLinkSentAt: paymentSchemaAvailable
          ? (row.payment_link_sent_at ?? null)
          : null,
        finalPaymentNotifiedAt: paymentSchemaAvailable
          ? (row.final_payment_notified_at ?? null)
          : null,
        readyForFinalPayment:
          paymentSchemaAvailable && row.ready_for_final_payment === true,
        paymentVoucherPath: voucherPath,
        paymentVoucherType: voucherType,
        paymentVoucherRejectionReason: paymentSchemaAvailable
          ? validOptionalText(row.payment_voucher_rejection_reason, 500)
          : null,
        coinAmountApplied: coinPaymentsByQuote.get(row.id) ?? 0,
      };
    },
  );

  if (rows.length > Math.max(0, count - offset)) {
    throw new Error("catalog_quote_count_invalid");
  }

  return { total: count, limit, offset, rows };
}

function validPositiveMoney(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function validNonNegativeMoney(
  value: number | null | undefined,
): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function validDiscountPercent(value: number | null | undefined): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 50
    ? value
    : null;
}

function validOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("catalog_quote_row_invalid");
  }
  return value;
}

export type CatalogPreorderVoucherSubmission = {
  quoteId: string;
  paymentType: "deposit" | "final" | "full";
  amount: number;
  paymentStatus: "under_review";
};

/** Uploads private proof and asks the same quotes authority to queue its review. */
export async function submitCatalogPreorderVoucher(input: {
  quoteId: string;
  paymentType: "deposit" | "final" | "full";
  file: File;
  previousVoucherPath?: string | null;
}): Promise<CatalogPreorderVoucherSubmission> {
  requireCommercialQuoteMode();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("catalog_quote_local_preview_read_only");
  }
  if (
    !input ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.quoteId,
    ) ||
    !["deposit", "final", "full"].includes(input.paymentType) ||
    !(input.file instanceof File)
  ) {
    throw new Error("catalog_preorder_voucher_input_invalid");
  }

  const userId = await requireAuthenticatedUserId();
  const voucherPath = await uploadPaymentVoucher({
    file: input.file,
    userId,
    pathPrefix: `quotes:${input.quoteId}`,
  });

  let data: unknown;
  try {
    const result = await tonecos.rpc(
      "submit_catalog_preorder_voucher_for_current_user",
      {
        p_quote_id: input.quoteId.toLowerCase(),
        p_payment_type: input.paymentType,
        p_payment_voucher_path: voucherPath,
      },
    );
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    try {
      await deletePaymentVoucher(voucherPath, userId);
    } catch {
      // Keep the database/upload error; failed uploads remain private and owner-scoped.
    }
    throw error;
  }

  const result =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const amount = Number(result?.amount);
  if (
    result?.quote_id !== input.quoteId.toLowerCase() ||
    result.payment_type !== input.paymentType ||
    result.payment_status !== "under_review" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error("catalog_preorder_voucher_response_invalid");
  }

  if (input.previousVoucherPath && input.previousVoucherPath !== voucherPath) {
    try {
      await deletePaymentVoucher(input.previousVoucherPath, userId);
    } catch {
      // Replacing a proof succeeded; a stale private object does not undo that result.
    }
  }

  return {
    quoteId: input.quoteId.toLowerCase(),
    paymentType: input.paymentType,
    amount,
    paymentStatus: "under_review",
  };
}

/** Compatibility helper returning only the newest bounded rows. */
export async function listMyCatalogQuotes(
  userId: string,
  limit = 20,
): Promise<CustomerCatalogQuote[]> {
  return (await loadMyCatalogQuotePage(userId, { limit, offset: 0 })).rows;
}

function validateListedItems(value: unknown): CatalogQuoteItem[] {
  if (!Array.isArray(value)) throw new Error("catalog_quote_rows_invalid");
  return validateItems(value as CatalogQuoteItem[]);
}
