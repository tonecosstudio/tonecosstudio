import { supabase } from "@/integrations/supabase/client";

export interface PendingChoice {
  delivery_id: string;
  delivery_number: number;
  user_id: string;
  user_name: string;
  user_email: string;
  subscription_id: string;
}

interface DeliveryPendingRow {
  id: string;
  delivery_number: number;
  subscriptions: {
    id: string;
    users: {
      id: string;
      email: string;
      raw_user_meta_data?: { full_name?: string } | null;
    } | null;
  } | null;
}

export async function fetchPendingChoices(cycleIds: string[]): Promise<PendingChoice[]> {
  if (!cycleIds || cycleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("subscription_deliveries")
    .select(`
      id,
      delivery_number,
      subscription_id,
      subscriptions!inner (
        id,
        user_id,
        users:user_id (
          id,
          email,
          raw_user_meta_data
        )
      )
    `)
    .in("cycle_id", cycleIds)
    .eq("status", "pending_choice")
    .is("collection_id", null)
    .order("delivery_number", { ascending: true });

  if (error) throw error;

  return ((data || []) as DeliveryPendingRow[]).map((delivery) => ({
    delivery_id: delivery.id,
    delivery_number: delivery.delivery_number,
    subscription_id: delivery.subscriptions?.id || "",
    user_id: delivery.subscriptions?.users?.id || "",
    user_name: delivery.subscriptions?.users?.raw_user_meta_data?.full_name || "Sem nome",
    user_email: delivery.subscriptions?.users?.email || "",
  }));
}

