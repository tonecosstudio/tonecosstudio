import { supabase } from "@/integrations/supabase/client";

export type PublicSubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_full: number;
  deliveries_total: number;
  total_credits: number | null;
  pricing_tiers?: unknown;
};

type PublicSubscriptionPlanRow = Omit<
  PublicSubscriptionPlan,
  "price_full" | "deliveries_total" | "total_credits"
> & {
  price_full: unknown;
  deliveries_total: unknown;
  total_credits: unknown;
};

function normalizePublicSubscriptionPlan(
  row: PublicSubscriptionPlanRow,
): PublicSubscriptionPlan {
  const priceFull = Number(row.price_full);
  const deliveriesTotal = Number(row.deliveries_total);
  const totalCredits = row.total_credits == null ? null : Number(row.total_credits);

  const invalidPrice = !Number.isFinite(priceFull) || priceFull <= 0;
  const invalidDeliveries =
    !Number.isFinite(deliveriesTotal) ||
    !Number.isInteger(deliveriesTotal) ||
    deliveriesTotal <= 0;
  const invalidCredits =
    totalCredits !== null &&
    (!Number.isFinite(totalCredits) || !Number.isInteger(totalCredits) || totalCredits < 0);

  if (invalidPrice || invalidDeliveries || invalidCredits) {
    throw new Error(`Configuração comercial inválida no plano ${row.id}`);
  }

  return {
    ...row,
    price_full: priceFull,
    deliveries_total: deliveriesTotal,
    total_credits: totalCredits,
  };
}

export async function listActiveSubscriptionPlans(): Promise<PublicSubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*, pricing_tiers(*)")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return ((data ?? []) as unknown as PublicSubscriptionPlanRow[]).map(
    normalizePublicSubscriptionPlan,
  );
}
