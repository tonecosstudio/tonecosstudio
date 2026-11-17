import { supabase } from "@/integrations/supabase/client";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";

export type PublicSubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_full: number;
  deliveries_total: number;
  pricing_tiers?: unknown;
};

type PublicSubscriptionPlanRow = Omit<
  PublicSubscriptionPlan,
  "price_full" | "deliveries_total"
> & {
  price_full: unknown;
  deliveries_total: unknown;
};

function normalizePublicSubscriptionPlan(
  row: PublicSubscriptionPlanRow,
): PublicSubscriptionPlan {
  const priceFull = Number(row.price_full);
  const deliveriesTotal = Number(row.deliveries_total);
  const invalidPrice = !Number.isFinite(priceFull) || priceFull <= 0;
  try {
    decimalToHundredths(String(priceFull));
  } catch {
    throw new Error(`Preço inválido no plano ${row.id}`);
  }
  const invalidDeliveries =
    !Number.isFinite(deliveriesTotal) ||
    !Number.isInteger(deliveriesTotal) ||
    deliveriesTotal <= 0;

  if (invalidPrice || invalidDeliveries) {
    throw new Error(`Configuração comercial inválida no plano ${row.id}`);
  }

  return {
    ...row,
    price_full: priceFull,
    deliveries_total: deliveriesTotal,
  };
}

export async function listActiveSubscriptionPlans(): Promise<PublicSubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, description, plan_type, price_full, deliveries_total")
    .eq("is_active", true)
    .in("plan_type", ["avulso", "trimestral", "semestral"])
    .order("display_order");

  if (error) throw error;
  return ((data ?? []) as unknown as PublicSubscriptionPlanRow[]).map(
    normalizePublicSubscriptionPlan,
  );
}
