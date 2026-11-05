import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import type { CatalogQuoteItem } from "@/services/customer/catalog-quote-service";
import { MAX_CANONICAL_SELECTION } from "@/services/catalog/public-catalog-selection";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";

export type AdminCatalogQuote = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  notes: string | null;
  items: CatalogQuoteItem[];
  /** Pending records are unpriced; zero is never displayed as an offer. */
  quotedAmount: number | null;
};

async function requireTonecosAdmin(): Promise<void> {
  await requireAuthenticatedUserId();
  const { data, error } = await tonecos.rpc("is_tonecos_admin");
  if (error) throw error;
  if (data !== true) throw new Error("Admin access required");
}

function assertCommercialMode() {
  if (import.meta.env.VITE_PREVIEW_READ_ONLY === "true" ||
      import.meta.env.VITE_CATALOG_QUOTES_ENABLED !== "true") {
    throw new Error("catalog_quotes_not_enabled");
  }
}

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
  requested_catalog_models: unknown;
};

/** Admin-only bounded intake queue, distinct from the historical quotes list. */
export async function listAdminCatalogQuotes(limit = 50): Promise<AdminCatalogQuote[]> {
  assertCommercialMode();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("admin_catalog_quote_limit_invalid");
  }
  await requireTonecosAdmin();
  const { data, error } = await tonecos
    .from("quotes")
    .select("id,user_id,status,created_at,notes,total_amount,requested_catalog_models,catalog_requested_at")
    .not("catalog_requested_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as QuoteRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    notes: row.notes,
    items: decodeItems(row.requested_catalog_models),
    quotedAmount: row.status === "answered" && row.total_amount !== null && row.total_amount > 0
      ? row.total_amount : null,
  }));
}

/** Only the privileged server RPC may change the quote's monetary amount. */
export async function answerCatalogQuoteRequest(quoteId: string, amount: number): Promise<string> {
  assertCommercialMode();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId) ||
      !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    throw new Error("admin_catalog_quote_response_invalid");
  }
  await requireTonecosAdmin();
  const { data, error } = await tonecos.rpc("answer_catalog_quote_request", {
    p_quote_id: quoteId,
    p_amount: amount,
  });
  if (error) throw error;
  if (data !== quoteId) throw new Error("admin_catalog_quote_result_invalid");
  return data;
}
