import { supabase } from "@/integrations/supabase/client";
import { updateAdminProductionSetting } from "@/services/admin/config/admin-config-mutations-service";
import { parseSystemSettingString } from "@/lib/system-settings-values";

const DEADLINE_KEYS = [
  "production_days_min",
  "production_days_max",
  "shipping_business_days",
  "sales_duration_days",
  "delivery_interval_days",
  "character_choice_days",
  "balance_payment_days",
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

const DEADLINE_MAX: Record<ProductionDeadlineKey, number> = {
  production_days_min: 3650,
  production_days_max: 3650,
  shipping_business_days: 31,
  sales_duration_days: 3650,
  delivery_interval_days: 3650,
  character_choice_days: 365,
  balance_payment_days: 365,
};

function parseDeadlineValue(key: ProductionDeadlineKey, value: unknown): number {
  const parsedValue = parseSystemSettingString(key, value);
  const parsed = Number(parsedValue);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > DEADLINE_MAX[key]) {
    throw new Error(`Configuração operacional inválida: ${key}`);
  }

  return parsed;
}

function validateProductionRange(settings: ProductionDeadlineSettingsMap): void {
  const min = Number(settings.production_days_min.value);
  const max = Number(settings.production_days_max.value);

  if (max < min) {
    throw new Error(
      "Configuração operacional inválida: production_days_max é menor que production_days_min",
    );
  }
}

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

    settingsMap[key] = {
      value: String(parseDeadlineValue(key, item.value)),
      description: item.description,
    };
  }

  const completeSettings = settingsMap as ProductionDeadlineSettingsMap;
  validateProductionRange(completeSettings);
  return completeSettings;
}

export async function updateProductionDeadlineSetting(input: {
  key: ProductionDeadlineKey;
  value: string;
}): Promise<{ key: ProductionDeadlineKey; value: string }> {
  if (!DEADLINE_KEYS.includes(input.key)) {
    throw new Error("Chave de prazo operacional inválida.");
  }

  const parsed = parseDeadlineValue(input.key, input.value);

  await updateAdminProductionSetting({
    key: input.key,
    value: String(parsed),
  });

  return { key: input.key, value: String(parsed) };
}
