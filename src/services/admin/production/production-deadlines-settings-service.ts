import { supabase } from "@/integrations/supabase/client";
import { updateAdminProductionSetting } from "@/services/admin/config/admin-config-mutations-service";
import { parseSystemSettingString } from "@/lib/system-settings-values";

const DEADLINE_KEYS = [
  "production_days_min",
  "shipping_business_days",
  "sales_duration_days",
  "delivery_interval_days",
] as const;

export type ProductionDeadlineKey = (typeof DEADLINE_KEYS)[number];

export interface ProductionDeadlineSettingValue {
  value: string;
  description: string | null;
}

export type ProductionDeadlineSettingsMap = Record<
  ProductionDeadlineKey,
  ProductionDeadlineSettingValue
>;

export async function fetchProductionDeadlinesSettings(): Promise<ProductionDeadlineSettingsMap> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value, description")
    .in("key", [...DEADLINE_KEYS]);

  if (error) throw error;

  const rows = data ?? [];
  const settingsMap = {} as Partial<ProductionDeadlineSettingsMap>;

  for (const key of DEADLINE_KEYS) {
    const item = rows.find((row) => row.key === key);
    if (!item) {
      throw new Error(`Configuração operacional ausente: ${key}`);
    }

    const value = parseSystemSettingString(item.key, item.value);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
      throw new Error(`Configuração operacional inválida: ${key}`);
    }

    settingsMap[key] = {
      value: String(parsed),
      description: item.description,
    };
  }

  return settingsMap as ProductionDeadlineSettingsMap;
}

export async function updateProductionDeadlineSetting(input: {
  key: ProductionDeadlineKey;
  value: string;
}): Promise<{ key: ProductionDeadlineKey; value: string }> {
  if (!DEADLINE_KEYS.includes(input.key)) {
    throw new Error("Chave de prazo operacional inválida.");
  }

  const parsed = Number(input.value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
    throw new Error("Prazo operacional deve ser um inteiro entre 1 e 365.");
  }

  await updateAdminProductionSetting({
    key: input.key,
    value: String(parsed),
  });

  return { key: input.key, value: String(parsed) };
}
