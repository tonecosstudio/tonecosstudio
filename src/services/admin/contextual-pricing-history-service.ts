import { supabase } from "@/integrations/supabase/client";

export type ContextualPricingHistoryTab = "all" | "base_price" | "multiplier" | "discount";

export interface ContextualPricingHistoryEntry {
  id: string;
  change_type: "base_price" | "multiplier" | "discount";
  collection_type_id: string | null;
  collection_type_name: string | null;
  collection_type_display_name: string | null;
  user_context: string | null;
  old_value: number;
  new_value: number;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export async function fetchContextualPricingHistory(
  tab: ContextualPricingHistoryTab
): Promise<ContextualPricingHistoryEntry[]> {
  let query = supabase
    .from("pricing_history")
    .select(
      `
        *,
        collection_types (
          name,
          display_name
        )
      `
    )
    .order("changed_at", { ascending: false })
    .limit(100);

  if (tab !== "all") {
    query = query.eq("change_type", tab);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar histórico: ${error.message}`);

  return (data || []).map((entry) => ({
    id: entry.id,
    change_type: entry.change_type,
    collection_type_id: entry.collection_type_id,
    collection_type_name: entry.collection_types?.name || null,
    collection_type_display_name: entry.collection_types?.display_name || null,
    user_context: entry.user_context,
    old_value: entry.old_value,
    new_value: entry.new_value,
    changed_by: entry.changed_by,
    changed_at: entry.changed_at,
    reason: entry.reason,
  })) as ContextualPricingHistoryEntry[];
}
