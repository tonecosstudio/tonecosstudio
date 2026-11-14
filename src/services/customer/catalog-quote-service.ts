import { supabase } from "@/integrations/supabase/client";
import { assertTonecosQuotesEnabled } from "@/config/tonecos-commercial-authority";
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
  paymentVoucherType: "deposit" | "final" | null;
  paymentVoucherRejectionReason: string | null;
};

export type CustomerCatalogQuotePage = {
  total: number;
  limit: number;
  offset: number;
  rows: CustomerCatalogQuote[];
};

const requireCommercialQuoteMode = assertTonecosQuotesEnabled;

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
  admin_response: string | null;
  requested_catalog_models: unknown;
  catalog_requested_at: string | null;
  customer_whatsapp: string | null;
  postal_code: string | null;
  desired_scale: string;
  finishing: string;
  is_preorder: boolean | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  payment_status: string | null;
  payment_link: string | null;
  pix_key: string | null;
  payment_instructions: string | null;
  payment_link_sent_at: string | null;
  final_payment_notified_at: string | null;
  ready_for_final_payment: boolean;
  payment_voucher_path: string | null;
  payment_voucher_type: string | null;
  payment_voucher_rejection_reason: string | null;
};

/** Own records only; the quotes RLS policy remains the database's authority. */
export async function loadMyCatalogQuotePage(
  userId: string,
  options: { limit?: number; offset?: number; quoteId?: string } = {},
): Promise<CustomerCatalogQuotePage> {
  requireCommercialQuoteMode();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const quoteId = options.quoteId;
  if (
    (quoteId !== undefined &&
      (typeof quoteId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId))) ||
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

  await assertCurrentUserId(userId);
  // A deep link is resolved by the same protected quotes relation and RLS,
  // not by paging through a customer's history or exposing a public lookup.
  let query = tonecos
    .from("quotes")
    .select(
      "id,status,created_at,deadline,notes,total_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing,is_preorder,deposit_amount,remaining_amount,payment_status,payment_link,pix_key,payment_instructions,payment_link_sent_at,final_payment_notified_at,ready_for_final_payment,payment_voucher_path,payment_voucher_type,payment_voucher_rejection_reason",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .not("catalog_requested_at", "is", null);
  if (quoteId !== undefined) query = query.eq("id", quoteId.toLowerCase());
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    throw new Error("catalog_quote_count_invalid");
  }

  const rows = ((data ?? []) as QuoteDbRow[]).map((row): CustomerCatalogQuote => {
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
    const voucherPath = row.payment_voucher_path;
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
      quotedAmount:
        ["answered", "archived"].includes(row.status) &&
        row.total_amount !== null &&
        row.total_amount > 0
          ? row.total_amount
          : null,
      responseMessage: row.admin_response,
      whatsapp: row.customer_whatsapp,
      postalCode: row.postal_code,
      scale: row.desired_scale,
      finishing: row.finishing,
      isPreorder: row.is_preorder === true,
      depositAmount: validPositiveMoney(row.deposit_amount),
      remainingAmount: validPositiveMoney(row.remaining_amount),
      paymentStatus: row.payment_status ?? null,
      paymentLink: validOptionalText(row.payment_link, 2000),
      pixKey: validOptionalText(row.pix_key, 220),
      paymentInstructions: validOptionalText(row.payment_instructions, 4000),
      paymentLinkSentAt: row.payment_link_sent_at ?? null,
      finalPaymentNotifiedAt: row.final_payment_notified_at ?? null,
      readyForFinalPayment: row.ready_for_final_payment === true,
      paymentVoucherPath: voucherPath,
      paymentVoucherType:
        row.payment_voucher_type === "deposit"
          ? "deposit"
          : row.payment_voucher_type === "final"
            ? "final"
            : null,
      paymentVoucherRejectionReason: validOptionalText(
        row.payment_voucher_rejection_reason,
        500,
      ),
    };
  });

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

function validOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("catalog_quote_row_invalid");
  }
  return value;
}

export type CatalogPreorderVoucherSubmission = {
  quoteId: string;
  paymentType: "deposit" | "final";
  amount: number;
  paymentStatus: "under_review";
};

/** Uploads private proof and asks the same quotes authority to queue its review. */
export async function submitCatalogPreorderVoucher(input: {
  quoteId: string;
  paymentType: "deposit" | "final";
  file: File;
  previousVoucherPath?: string | null;
}): Promise<CatalogPreorderVoucherSubmission> {
  requireCommercialQuoteMode();
  if (
    !input ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.quoteId) ||
    (input.paymentType !== "deposit" && input.paymentType !== "final") ||
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
    const result = await tonecos.rpc("submit_catalog_preorder_voucher_for_current_user", {
      p_quote_id: input.quoteId.toLowerCase(),
      p_payment_type: input.paymentType,
      p_payment_voucher_path: voucherPath,
    });
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

  const result = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
  const amount = Number(result?.amount);
  if (
    result?.quote_id !== input.quoteId.toLowerCase() ||
    result.payment_type !== input.paymentType ||
    result.payment_status !== "under_review" ||
    !Number.isFinite(amount) || amount <= 0
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
