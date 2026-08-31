import { supabase } from "@/integrations/supabase/client";
import { updateAdminProductionSetting } from "@/services/admin/config/admin-config-mutations-service";

export interface ProductionGlobalLimitSetting {
  key: string;
  value: string;
  description?: string | null;
}

export async function fetchProductionGlobalLimitSetting(): Promise<ProductionGlobalLimitSetting> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value, description")
    .eq("key", "monthly_production_limit")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Limite mensal de produção não configurado.");
  }

  const value = Number(data.value);
  if (!Number.isInteger(value) || value < 1 || value > 100000) {
    throw new Error("Limite mensal de produção inválido.");
  }

  return {
    key: data.key,
    value: String(value),
    description: data.description,
  };
}

export async function updateProductionGlobalLimitSetting(value: string): Promise<void> {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100000) {
    throw new Error("Limite mensal de produção inválido.");
  }

  await updateAdminProductionSetting({
    key: "monthly_production_limit",
    value: String(parsed),
  });
}
