import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { assertTonecosQuotesEnabled } from "@/config/tonecos-commercial-authority";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = new Set(["pending", "reviewing", "answered", "archived"]);
const eventTypes = new Set(["submitted", "status_changed", "answered"]);

export type CatalogQuoteEvent = {
  id: number;
  quoteId: string;
  type: "submitted" | "status_changed" | "answered";
  fromStatus: string | null;
  toStatus: string;
  amount: number | null;
  createdAt: string;
};

type QuoteEventRow = TonecosMvpDatabase["public"]["Tables"]["quote_events"]["Row"];

/** Reads only events visible through quote_events RLS.
 * The browser has SELECT only; all writes remain inside the canonical quote RPCs.
 */
export async function loadCatalogQuoteHistory(
  quoteIds: readonly string[],
): Promise<Record<string, CatalogQuoteEvent[]>> {
  assertTonecosQuotesEnabled();
  if (!Array.isArray(quoteIds) || quoteIds.length > 100) {
    throw new Error("catalog_quote_history_ids_invalid");
  }

  const ids = [...new Set(quoteIds)];
  if (ids.some((id) => typeof id !== "string" || !uuid.test(id))) {
    throw new Error("catalog_quote_history_ids_invalid");
  }
  if (ids.length === 0) return {};

  const query = tonecos
    .from("quote_events")
    .select(
      "id,quote_id,event_type,from_status,to_status,amount,created_at",
    )
    .in("quote_id", ids)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;

  const history: Record<string, CatalogQuoteEvent[]> = Object.fromEntries(
    ids.map((id) => [id, []]),
  );

  for (const raw of data ?? []) {
    const row = raw as QuoteEventRow;
    if (
      !Number.isSafeInteger(row.id) ||
      row.id < 1 ||
      !ids.includes(row.quote_id) ||
      !eventTypes.has(row.event_type) ||
      !(row.from_status === null || statuses.has(row.from_status)) ||
      !statuses.has(row.to_status) ||
      typeof row.created_at !== "string" ||
      Number.isNaN(Date.parse(row.created_at)) ||
      (row.event_type === "answered"
        ? row.amount === null || !Number.isFinite(row.amount) || row.amount <= 0
        : row.amount !== null)
    ) {
      throw new Error("catalog_quote_history_row_invalid");
    }
    history[row.quote_id].push({
      id: row.id,
      quoteId: row.quote_id,
      type: row.event_type as CatalogQuoteEvent["type"],
      fromStatus: row.from_status,
      toStatus: row.to_status,
      amount: row.amount,
      createdAt: row.created_at,
    });
  }

  return history;
}
