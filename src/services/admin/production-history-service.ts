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

type ProductionHistoryRow = Omit<ProductionHistoryEntry, "user_email">;

type UserProfileEmailRow = {
  id: string;
  email: string | null;
};

export async function fetchProductionHistory(
  productionQueueId: string
): Promise<ProductionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("production_queue_history")
    .select("id, created_at, action, old_value, new_value, changed_by")
    .eq("production_queue_id", productionQueueId)
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
    ...entry,
    user_email: entry.changed_by
      ? userEmailById.get(entry.changed_by) ?? "Usuario desconhecido"
      : "Sistema",
  }));
}
