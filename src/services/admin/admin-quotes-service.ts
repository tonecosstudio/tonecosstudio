import { supabase } from "@/integrations/supabase/client";

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
  model_id: string;
  quantity: number;
  scale: string;
};

export type ModelMini = {
  id: string;
  name: string;
  franchise: string | null;
};

export async function fetchAdminQuotes(): Promise<QuoteRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id,user_id,status,deadline,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

export async function fetchAdminQuoteItems(quoteIds: string[]): Promise<QuoteItemRow[]> {
  if (quoteIds.length === 0) return [];
  const { data, error } = await supabase
    .from("quote_items")
    .select("id,quote_id,model_id,quantity,scale")
    .in("quote_id", quoteIds);
  if (error) throw error;
  return (data ?? []) as QuoteItemRow[];
}

export async function fetchAdminQuoteModels(modelIds: string[]): Promise<ModelMini[]> {
  if (modelIds.length === 0) return [];
  const { data, error } = await supabase
    .from("models")
    .select("id,name,franchise")
    .in("id", modelIds);
  if (error) throw error;
  return (data ?? []) as ModelMini[];
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
  if (error) throw error;
}

