import { adminProductionGateway as supabase } from "@/services/admin/admin-production-gateway";

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
      value: item.value,
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
  const { error } = await supabase
    .from("system_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw error;
  return { key, value };
}
