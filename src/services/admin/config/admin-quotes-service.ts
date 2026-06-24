import { supabase } from "@/integrations/supabase/client";
import { updateQuoteStatusRpc } from "@/services/admin/orders/admin-order-status-service";

export type QuoteRow = {
  id: string;
  user_id: string;
  status: string;
  deadline: string | null;
  notes: string | null;
  created_at: string;
};

export type QuoteItemRow = {
  id: string;
  quote_id: string;
  character_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
};

export type ModelMini = {
  id: string;
  name: string;
  franchise: string | null;
};

interface AdminQuotesFilter<T> extends PromiseLike<{ data: T[] | null; error: Error | null }> {
  order(
    column: string,
    options?: { ascending?: boolean }
  ): {
    limit(count: number): Promise<{ data: T[] | null; error: Error | null }>;
  };
  in(column: string, values: string[]): Promise<{ data: T[] | null; error: Error | null }>;
}

interface AdminQuotesGateway {
  from(table: "quotes"): {
    select(columns: string): AdminQuotesFilter<QuoteRow>;
  };
  from(table: "quote_items"): {
    select(columns: string): AdminQuotesFilter<QuoteItemRow>;
  };
  from(table: "models"): {
    select(columns: string): AdminQuotesFilter<ModelMini>;
  };
}

const adminQuotesGateway = supabase as unknown as AdminQuotesGateway;

export async function fetchAdminQuotes(): Promise<QuoteRow[]> {
  const { data, error } = await adminQuotesGateway
    .from("quotes")
    .select("id,user_id,status,deadline,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

export async function fetchAdminQuoteItems(quoteIds: string[]): Promise<QuoteItemRow[]> {
  if (quoteIds.length === 0) return [];
  const { data, error } = await adminQuotesGateway
    .from("quote_items")
    .select("id,quote_id,character_id,name,description,quantity")
    .in("quote_id", quoteIds);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminQuoteModels(modelIds: string[]): Promise<ModelMini[]> {
  if (modelIds.length === 0) return [];
  const { data, error } = await adminQuotesGateway
    .from("models")
    .select("id,name,franchise")
    .in("id", modelIds);
  if (error) throw error;
  return (data ?? []) as ModelMini[];
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  await updateQuoteStatusRpc(quoteId, status);
}
