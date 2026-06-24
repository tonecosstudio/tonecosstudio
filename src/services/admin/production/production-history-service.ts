import { supabase } from "@/integrations/supabase/client";

export interface ProductionHistoryEntry {
  id: string;
  created_at: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  user_email: string;
}

type ProductionQueueOrderRef = {
  order_id: string;
  order_type: string;
};

type ProductionHistoryRow = {
  id: string;
  created_at: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
};

type UserProfileEmailRow = {
  id: string;
  email: string | null;
};

export async function fetchProductionHistory(
  productionQueueId: string
): Promise<ProductionHistoryEntry[]> {
  const { data: productionItem, error: productionItemError } = await supabase
    .from("production_queue")
    .select("order_id, order_type")
    .eq("id", productionQueueId)
    .maybeSingle();

  if (productionItemError) throw productionItemError;
  if (!productionItem) return [];

  const orderRef = productionItem as ProductionQueueOrderRef;

  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, created_at, old_status, new_status, changed_by, changed_by_name")
    .eq("order_id", orderRef.order_id)
    .eq("order_type", orderRef.order_type)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const entries = (data ?? []) as ProductionHistoryRow[];
  const userIds = Array.from(new Set(entries.map((entry) => entry.changed_by).filter(Boolean))) as string[];

  let userEmailById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    userEmailById = new Map(
      ((profilesData ?? []) as UserProfileEmailRow[]).map((profile) => [
        profile.id,
        profile.email ?? "Usuario desconhecido",
      ])
    );
  }

  return entries.map((entry) => ({
    id: entry.id,
    created_at: entry.created_at,
    action: "status_change",
    old_value: entry.old_status,
    new_value: entry.new_status,
    changed_by: entry.changed_by,
    user_email: entry.changed_by
      ? entry.changed_by_name ?? userEmailById.get(entry.changed_by) ?? entry.changed_by
      : "Sistema",
  }));
}
