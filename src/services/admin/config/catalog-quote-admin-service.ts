import { supabase } from "@/integrations/supabase/client";
import { assertTonecosQuotesEnabled } from "@/config/tonecos-commercial-authority";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import type { CatalogQuoteItem } from "@/services/customer/catalog-quote-service";
import { MAX_CANONICAL_SELECTION } from "@/services/catalog/public-catalog-selection";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";

export type AdminCatalogQuote = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string;
  status: string;
  createdAt: string;
  notes: string | null;
  items: CatalogQuoteItem[];
  /** Pending records are unpriced; zero is never displayed as an offer. */
  quotedAmount: number | null;
  responseMessage: string | null;
  whatsapp: string | null; postalCode: string | null;
  scale: string; finishing: string;
};

const assertCommercialMode = assertTonecosQuotesEnabled;

function decodeItems(value: unknown): CatalogQuoteItem[] {
  if (!Array.isArray(value) || value.length < 1 ||
      value.length > MAX_CANONICAL_SELECTION) {
    throw new Error("admin_catalog_quote_items_invalid");
  }
  const seen = new Set<string>();
  return value.map((v: unknown) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      throw new Error("admin_catalog_quote_item_invalid");
    }
    const item = v as { slug?: unknown; quantity?: unknown };
    if (typeof item.slug !== "string" || !validCatalogSlug(item.slug) ||
        !Number.isInteger(item.quantity) || (item.quantity as number) < 1 ||
        (item.quantity as number) > 10 || seen.has(item.slug)) {
      throw new Error("admin_catalog_quote_item_invalid");
    }
    seen.add(item.slug);
    return { slug: item.slug, quantity: item.quantity as number };
  });
}

type QuoteRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  notes: string | null;
  total_amount: number | null;
  admin_response: string | null;
  requested_catalog_models: unknown;
  customer_whatsapp: string | null; postal_code: string | null;
  desired_scale: string; finishing: string;
};

/** Admin-only bounded intake queue, distinct from the historical quotes list. */
export async function listAdminCatalogQuotes(limit = 50): Promise<AdminCatalogQuote[]> {
  assertCommercialMode();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("admin_catalog_quote_limit_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos
    .from("quotes")
    .select("id,user_id,status,created_at,notes,total_amount,admin_response,requested_catalog_models,catalog_requested_at,customer_whatsapp,postal_code,desired_scale,finishing")
    .not("catalog_requested_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as QuoteRow[]).map((row) => ({
    ...row, items: decodeItems(row.requested_catalog_models),
  }));
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const { data: contacts, error: contactError } = await tonecos
    .from("profiles").select("id,email,full_name").in("id", ids);
  if (contactError) throw contactError;
  const byId = new Map((contacts ?? []).map((person) => [person.id, person]));
  return rows.map((row) => {
    const contact = byId.get(row.user_id);
    if (!contact?.email) throw new Error("admin_catalog_quote_contact_missing");
    if (row.admin_response !== null &&
        (typeof row.admin_response !== "string" || row.admin_response.length > 2000)) {
      throw new Error("admin_catalog_quote_response_invalid");
    }
    return {
      id: row.id,
      userId: row.user_id,
      customerName: contact.full_name,
      customerEmail: contact.email,
      status: row.status,
      createdAt: row.created_at,
      notes: row.notes,
      items: row.items,
      quotedAmount: ["answered", "archived"].includes(row.status) && row.total_amount !== null && row.total_amount > 0
        ? row.total_amount : null,
      responseMessage: row.admin_response,
      whatsapp: row.customer_whatsapp, postalCode: row.postal_code,
      scale: row.desired_scale, finishing: row.finishing,
    };
  });
}

/** Only the privileged server RPC may change the quote's monetary amount. */
export async function answerCatalogQuoteRequest(
  quoteId: string,
  amount: number,
  message: string,
): Promise<string> {
  assertCommercialMode();
  const responseMessage = typeof message === "string" ? message.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId) ||
      !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 ||
      responseMessage.length < 1 || responseMessage.length > 2000) {
    throw new Error("admin_catalog_quote_response_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("answer_catalog_quote_request", {
    p_quote_id: quoteId,
    p_amount: amount,
    p_message: responseMessage,
  });
  if (error) throw error;
  if (data !== quoteId) throw new Error("admin_catalog_quote_result_invalid");
  return data;
}

/** Uses the canonical quote status RPC; no direct client-side table mutations. */
export async function changeCatalogQuoteStatus(quoteId: string, status: "pending" | "reviewing" | "archived"): Promise<string> {
  assertCommercialMode();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId) ||
      !["pending", "reviewing", "archived"].includes(status)) {
    throw new Error("admin_catalog_quote_status_invalid");
  }
  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("admin_update_quote_status", {
    p_quote_id: quoteId,
    p_status: status,
  });
  if (error) throw error;
  if (data !== quoteId) throw new Error("admin_catalog_quote_status_result_invalid");
  return data;
}
