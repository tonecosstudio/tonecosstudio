import { supabase } from "@/integrations/supabase/client";

export interface ActiveSubscriptionSummary {
  id: string;
  user_id: string;
  collection_id: string | null;
  plan_type: string | null;
  plan_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  next_delivery_at: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  deliveries_completed: number;
  deliveries_total: number | null;
  total_paid: number | null;
  payment_method: string | null;
  notes: string | null;
  selected_model_slugs: string[];
}

export async function fetchActiveSubscriptionSummary(
  userId: string
): Promise<ActiveSubscriptionSummary | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id,user_id,collection_id,plan_type,plan_id,status,created_at,updated_at,next_delivery_at,started_at,cancelled_at,completed_at,deliveries_completed,deliveries_total,total_paid,payment_method,notes,selected_model_slugs"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  if (!data) return null;
  const subscription = data as unknown as ActiveSubscriptionSummary;
  return {
    ...subscription,
    selected_model_slugs: Array.isArray(subscription.selected_model_slugs)
      ? subscription.selected_model_slugs.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}
