// @ts-nocheck
/**
 * Hook para buscar configurações do sistema do banco de dados
 *
 * Prioridade:
 * 1. Dados do banco (system_settings)
 * 2. Variáveis de ambiente (.env)
 * 3. Valores padrão (constants.ts)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ENV, PRICING, BATCH, CONTACT, NOTIFICATIONS, UI } from "@/config/constants";

/**
 * Interface para configurações do sistema
 */
export interface SystemSettings {
  // Empresa
  company_name: string;
  company_address: string;
  company_logo_url: string;
  cnpj?: string;
  legal_name?: string;

  // Contato
  contact_email: string;
  support_email: string;
  privacy_email: string;
  dpo_email: string;
  phone_primary?: string;
  phone_whatsapp?: string;
  business_hours: string;

  // Website e Redes
  website_url: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;

  // Preços
  default_price_full: number;
  default_price_pix: number;
  default_deposit_amount: number;
  pix_discount_percentage: number;
  max_installments_no_interest: number;
  max_installments_with_interest: number;

  // Prazos
  shipping_business_days: number;
  exchange_deadline_days: number;
  days_to_next_delivery: number;

  // Notificações
  user_online_threshold_minutes: number;
  notification_polling_interval_ms: number;
  toast_duration_ms: number;

  // UI/UX
  default_page_size: number;
  search_debounce_ms: number;
  input_debounce_ms: number;
  image_compression_quality: number;
  max_image_size_mb: number;
  
  // Imagens
  hero_image_url?: string;
}

/**
 * Valores padrão (fallback quando banco não tem dados)
 */
const DEFAULT_SETTINGS: SystemSettings = {
  // Empresa
  company_name: CONTACT.COMPANY_NAME,
  company_address: CONTACT.COMPANY_ADDRESS,
  company_logo_url: "/logo.png",

  // Contato
  contact_email: CONTACT.CONTACT_EMAIL,
  support_email: CONTACT.SUPPORT_EMAIL,
  privacy_email: CONTACT.PRIVACY_EMAIL,
  dpo_email: CONTACT.DPO_EMAIL,
  business_hours: "Segunda a Sexta, 9h às 18h",

  // Website
  website_url: CONTACT.WEBSITE_URL,

  // Preços
  default_price_full: PRICING.DEFAULT_PRICE_FULL,
  default_price_pix: PRICING.DEFAULT_PRICE_PIX,
  default_deposit_amount: PRICING.DEFAULT_DEPOSIT_AMOUNT,
  pix_discount_percentage: PRICING.PIX_DISCOUNT_PERCENTAGE,
  max_installments_no_interest: PRICING.MAX_INSTALLMENTS_NO_INTEREST,
  max_installments_with_interest: PRICING.MAX_INSTALLMENTS_WITH_INTEREST,

  // Prazos
  shipping_business_days: BATCH.SHIPPING_BUSINESS_DAYS,
  exchange_deadline_days: BATCH.EXCHANGE_DEADLINE_DAYS,
  days_to_next_delivery: 30,

  // Notificações
  user_online_threshold_minutes: NOTIFICATIONS.USER_ONLINE_THRESHOLD_MINUTES,
  notification_polling_interval_ms: NOTIFICATIONS.POLLING_INTERVAL_MS,
  toast_duration_ms: NOTIFICATIONS.TOAST_DURATION_MS,

  // UI/UX
  default_page_size: UI.DEFAULT_PAGE_SIZE,
  search_debounce_ms: UI.SEARCH_DEBOUNCE_MS,
  input_debounce_ms: UI.INPUT_DEBOUNCE_MS,
  image_compression_quality: UI.IMAGE_COMPRESSION_QUALITY,
  max_image_size_mb: UI.MAX_IMAGE_SIZE_MB,
  
  // Imagens
  hero_image_url: undefined,
};

/**
 * Hook para buscar configurações do sistema
 *
 * @returns Configurações do sistema com fallback para valores padrão
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings_grouped").select("*").single();

      if (error) {
        console.warn("Erro ao buscar configurações do banco, usando valores padrão:", error);
        return DEFAULT_SETTINGS;
      }

      // Mesclar dados do banco com valores padrão (banco tem prioridade)
      return {
        ...DEFAULT_SETTINGS,
        ...data,
      } as SystemSettings;
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar uma configuração específica
 *
 * @param key - Chave da configuração
 * @returns Valor da configuração
 */
export function useSystemSetting(key: keyof SystemSettings) {
  const { data: settings } = useSystemSettings();
  return settings?.[key];
}

/**
 * Hook para buscar múltiplas configurações específicas
 *
 * @param keys - Array de chaves das configurações
 * @returns Objeto com as configurações solicitadas
 */
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

/**
 * Função auxiliar para buscar configurações fora de componentes React
 *
 * @returns Promise com as configurações
 */
export async function fetchSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase.from("system_settings_grouped").select("*").single();

  if (error) {
    console.warn("Erro ao buscar configurações do banco, usando valores padrão:", error);
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...data,
  } as SystemSettings;
}

/**
 * Função para atualizar uma configuração (apenas admin)
 *
 * @param key - Chave da configuração
 * @param value - Novo valor
 * @returns Promise com resultado da operação
 */
export async function updateSystemSetting(
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("system_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Função para atualizar múltiplas configurações (apenas admin)
 *
 * @param settings - Objeto com chave-valor das configurações
 * @returns Promise com resultado da operação
 */
export async function updateSystemSettings(
  settings: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("system_settings").upsert(updates, { onConflict: "key" });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
