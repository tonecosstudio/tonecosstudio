import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { validCatalogSlug, type PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";
import { MAX_CANONICAL_SELECTION } from "@/services/catalog/public-catalog-selection";

/** One commercial quote authority: Supabase quotes. Catalog model slugs come from D1. */
export type CatalogQuoteItem = { slug: string; quantity: number };
export type CustomerCatalogQuote = {
  id: string;
  status: string;
  createdAt: string;
  deadline: string | null;
  notes: string | null;
  items: CatalogQuoteItem[];
  /** No price is supplied or approved by the customer. */
  quotedAmount: number | null;
};

function requireCommercialQuoteMode(): void {
  if (import.meta.env.VITE_PREVIEW_READ_ONLY === "true" ||
      import.meta.env.VITE_CATALOG_QUOTES_ENABLED !== "true") {
    throw new Error("catalog_quotes_not_enabled");
  }
}

function validateItems(items: readonly CatalogQuoteItem[]): CatalogQuoteItem[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_CANONICAL_SELECTION) {
    throw new Error("catalog_quote_selection_invalid");
  }
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item.slug !== "string" || !validCatalogSlug(item.slug) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 ||
        seen.has(item.slug)) {
      throw new Error("catalog_quote_item_invalid");
    }
    seen.add(item.slug);
    return { slug: item.slug, quantity: item.quantity };
  });
}

/** Convert only published items selected in the existing read-only catalog. */
export function quoteItemsFromSelection(models: readonly PublicCatalogModel[]): CatalogQuoteItem[] {
  return validateItems(models.map((model) => ({ slug: model.slug, quantity: 1 })));
}

type QuoteRpcResult = Promise<{
  data: string | null;
  error: { message: string } | null;
}>;
type QuoteRpcClient = {
  rpc(name: "submit_catalog_quote_request", args: {
    p_models: CatalogQuoteItem[];
    p_notes: string | null;
  }): QuoteRpcResult;
};

/** Requires a real authenticated customer; the DB derives owner from auth.uid(). */
export async function submitCatalogQuoteRequest(
  userId: string,
  items: readonly CatalogQuoteItem[],
  notes: string | null = null,
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
  await assertCurrentUserId(userId);
  const client = supabase as unknown as QuoteRpcClient;
  const { data, error } = await client.rpc("submit_catalog_quote_request", {
    p_models: safeItems,
    p_notes: safeNotes,
  });
  if (error) throw error;
  if (!data || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
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
  total_amount: number;
  requested_catalog_models: unknown;
  catalog_requested_at: string | null;
};

/** Own records only; the quotes RLS policy remains the database's authority. */
export async function listMyCatalogQuotes(
  userId: string,
  limit = 20,
): Promise<CustomerCatalogQuote[]> {
  requireCommercialQuoteMode();
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("catalog_quote_list_limit_invalid");
  }
  await assertCurrentUserId(userId);
  const { data, error } = await supabase
    .from("quotes")
    .select("id,status,created_at,deadline,notes,total_amount,requested_catalog_models,catalog_requested_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as QuoteDbRow[];
  return rows.map((row) => {
    const items = row.requested_catalog_models === null
      ? []
      : validateListedItems(row.requested_catalog_models);
    if (typeof row.id !== "string" || typeof row.status !== "string" ||
        typeof row.created_at !== "string") {
      throw new Error("catalog_quote_row_invalid");
    }
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      deadline: row.deadline,
      notes: row.notes,
      items,
      quotedAmount: row.status === "answered" && row.total_amount > 0
        ? row.total_amount : null,
    };
  });
}

function validateListedItems(value: unknown): CatalogQuoteItem[] {
  if (!Array.isArray(value)) throw new Error("catalog_quote_rows_invalid");
  if (value.length === 0) return []; // Pre-existing commercial quote.
  return validateItems(value as CatalogQuoteItem[]);
}
