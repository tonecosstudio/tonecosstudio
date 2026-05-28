import { adminProductionGateway as supabase } from "@/services/admin/admin-production-gateway";
import { updateAdminProductionSetting } from "@/services/admin/admin-config-mutations-service";
import { parseSystemSettingString } from "@/lib/system-settings-values";

const DEADLINE_KEYS = [
  "production_days_min",
  "shipping_business_days",
  "sales_duration_days",
  "delivery_interval_days",
  "monthly_capacity",
] as const;

export type ProductionDeadlineKey = (typeof DEADLINE_KEYS)[number];

export interface ProductionDeadlineSettingValue {
  value: string;
  description: string | null;
}

export type ProductionDeadlineSettingsMap = Record<string, ProductionDeadlineSettingValue>;

export async function fetchProductionDeadlinesSettings(): Promise<ProductionDeadlineSettingsMap> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value, description")
    .in("key", [...DEADLINE_KEYS]);

  if (error) throw error;

  const settingsMap: ProductionDeadlineSettingsMap = {};
  (data || []).forEach((item) => {
    settingsMap[item.key] = {
      value: parseSystemSettingString(item.key, item.value),
      description: item.description,
    };
  });

  return settingsMap;
}

export async function updateProductionDeadlineSetting(input: {
  key: string;
  value: string;
}): Promise<{ key: string; value: string }> {
  const { key, value } = input;
  await updateAdminProductionSetting({ key, value });
  return { key, value };
}
