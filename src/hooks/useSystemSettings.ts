import { useQuery } from "@tanstack/react-query";
import { BATCH, CONTACT, NOTIFICATIONS, PLANS, PRICING, UI } from "@/config/constants";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { upsertAdminSystemSettings } from "@/services/admin/admin-config-mutations-service";

export interface SystemSettings {
  company_name: string;
  company_address: string;
  company_logo_url: string;
  cnpj?: string;
  legal_name?: string;

  contact_email: string;
  support_email: string;
  privacy_email: string;
  dpo_email: string;
  phone_primary?: string;
  phone_whatsapp?: string;
  business_hours: string;

  website_url: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;

  default_price_full: number;
  default_price_pix: number;
  default_deposit_amount: number;
  pix_discount_percentage: number;
  max_installments_no_interest: number;
  max_installments_with_interest: number;

  shipping_business_days: number;
  exchange_deadline_days: number;
  days_to_next_delivery: number;

  user_online_threshold_minutes: number;
  notification_polling_interval_ms: number;
  toast_duration_ms: number;

  default_page_size: number;
  search_debounce_ms: number;
  input_debounce_ms: number;
  image_compression_quality: number;
  max_image_size_mb: number;

  hero_image_url?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: CONTACT.COMPANY_NAME,
  company_address: CONTACT.COMPANY_ADDRESS,
  company_logo_url: "/logo.png",

  contact_email: CONTACT.CONTACT_EMAIL,
  support_email: CONTACT.SUPPORT_EMAIL,
  privacy_email: CONTACT.PRIVACY_EMAIL,
  dpo_email: CONTACT.DPO_EMAIL,
  business_hours: CONTACT.BUSINESS_HOURS,

  website_url: CONTACT.WEBSITE_URL,

  default_price_full: PRICING.DEFAULT_PRICE_FULL,
  default_price_pix: PRICING.DEFAULT_PRICE_PIX,
  default_deposit_amount: PRICING.DEFAULT_DEPOSIT_AMOUNT,
  pix_discount_percentage: PRICING.PIX_DISCOUNT_PERCENTAGE,
  max_installments_no_interest: PRICING.MAX_INSTALLMENTS_NO_INTEREST,
  max_installments_with_interest: PRICING.MAX_INSTALLMENTS_WITH_INTEREST,

  shipping_business_days: BATCH.SHIPPING_BUSINESS_DAYS,
  exchange_deadline_days: BATCH.EXCHANGE_DEADLINE_DAYS,
  days_to_next_delivery: PLANS.DAYS_TO_NEXT_DELIVERY,

  user_online_threshold_minutes: NOTIFICATIONS.USER_ONLINE_THRESHOLD_MINUTES,
  notification_polling_interval_ms: NOTIFICATIONS.POLLING_INTERVAL_MS,
  toast_duration_ms: NOTIFICATIONS.TOAST_DURATION_MS,

  default_page_size: UI.DEFAULT_PAGE_SIZE,
  search_debounce_ms: UI.SEARCH_DEBOUNCE_MS,
  input_debounce_ms: UI.INPUT_DEBOUNCE_MS,
  image_compression_quality: UI.IMAGE_COMPRESSION_QUALITY,
  max_image_size_mb: UI.MAX_IMAGE_SIZE_MB,

  hero_image_url: undefined,
};

type SystemSettingsViewError = { message: string } | null;

interface SystemSettingsViewClient {
  from(table: "system_settings_grouped"): {
    select(columns: "settings"): {
      single(): PromiseLike<{
        data: { settings: Record<string, unknown> } | null;
        error: SystemSettingsViewError;
      }>;
    };
  };
}

const systemSettingsView = supabase as unknown as SystemSettingsViewClient;

const NUMERIC_SETTING_KEYS = [
  "default_price_full",
  "default_price_pix",
  "default_deposit_amount",
  "pix_discount_percentage",
  "max_installments_no_interest",
  "max_installments_with_interest",
  "shipping_business_days",
  "exchange_deadline_days",
  "days_to_next_delivery",
  "user_online_threshold_minutes",
  "notification_polling_interval_ms",
  "toast_duration_ms",
  "default_page_size",
  "search_debounce_ms",
  "input_debounce_ms",
  "image_compression_quality",
  "max_image_size_mb",
] as const satisfies readonly (keyof SystemSettings)[];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapSettingsPayload(rawSettings: unknown): Record<string, unknown> {
  if (!isRecord(rawSettings)) return {};

  const nestedSettings = rawSettings.settings;
  if (isRecord(nestedSettings)) return nestedSettings;

  return rawSettings;
}

function normalizeSystemSettings(rawSettings: unknown): SystemSettings {
  const settings = unwrapSettingsPayload(rawSettings);
  const normalized: Record<string, unknown> = { ...settings };

  NUMERIC_SETTING_KEYS.forEach((key) => {
    const value = normalized[key];
    if (value === undefined || value === null || value === "") return;

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      normalized[key] = numericValue;
    }
  });

  return {
    ...DEFAULT_SETTINGS,
    ...normalized,
  } as SystemSettings;
}

async function readSystemSettings(): Promise<SystemSettings> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_system_settings");

  if (!rpcError && rpcData) {
    return normalizeSystemSettings(rpcData);
  }

  const { data, error } = await systemSettingsView.from("system_settings_grouped").select("settings").single();

  if (error) {
    log.warn("Failed to fetch system settings view, using defaults", { error });
    return DEFAULT_SETTINGS;
  }

  return normalizeSystemSettings(data);
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: readSystemSettings,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSystemSetting(key: keyof SystemSettings) {
  const { data: settings } = useSystemSettings();
  return settings?.[key];
}

export function useSystemSettingsMultiple<K extends keyof SystemSettings>(
  keys: K[]
): Pick<SystemSettings, K> | undefined {
  const { data: settings } = useSystemSettings();

  if (!settings) return undefined;

  return keys.reduce(
    (acc, key) => {
      acc[key] = settings[key];
      return acc;
    },
    {} as Pick<SystemSettings, K>
  );
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return readSystemSettings();
}

export async function updateSystemSetting(
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertAdminSystemSettings({ [key]: value });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateSystemSettings(
  settings: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertAdminSystemSettings(settings);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
