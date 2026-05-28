import { adminProductionGateway as supabase } from "@/services/admin/admin-production-gateway";
import { updateAdminProductionSetting } from "@/services/admin/admin-config-mutations-service";

export interface ProductionGlobalLimitSetting {
  key: string;
  value: string;
  description?: string | null;
}

export async function fetchProductionGlobalLimitSetting(): Promise<ProductionGlobalLimitSetting> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("key", "monthly_production_limit")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { key: "monthly_production_limit", value: "100" };
  }

  return data as ProductionGlobalLimitSetting;
}

export async function updateProductionGlobalLimitSetting(value: string): Promise<void> {
  await updateAdminProductionSetting({ key: "monthly_production_limit", value });
}
