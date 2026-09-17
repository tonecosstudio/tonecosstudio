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

export async function fetchAdminQuotes(): Promise<QuoteRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id,user_id,status,deadline,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  await updateQuoteStatusRpc(quoteId, status);
}
