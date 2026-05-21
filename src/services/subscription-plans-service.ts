import { supabase } from "@/integrations/supabase/client";

export type PublicSubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_full: number | null;
  deliveries_total: number | null;
  total_credits: number | null;
  pricing_tiers?: unknown;
};

export async function listActiveSubscriptionPlans(): Promise<PublicSubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*, pricing_tiers(*)")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data ?? []) as PublicSubscriptionPlan[];
}
