import { supabase } from "@/integrations/supabase/client";

export async function updateSubscriptionPlanCollectionLimit(planId: string, newLimit: number) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ collections_count: newLimit })
    .eq("id", planId)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar limite: ${error.message}`);
  return data;
}
