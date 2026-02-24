/**
 * Content Service - SSOT (Single Source of Truth)
 * Centraliza TODOS os textos, políticas, prazos e informações do sistema
 * Garante consistência total em todas as páginas
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ContentSettings {
  // Prazos
  productionDaysMin: number;
  productionDaysMax: number;
  shippingDays: number;
  salesDurationDays: number;
  salesOpenDay: number;
  
  // Lote Atual
  currentBatchName: string;
  currentBatchSalesStart: Date;
  currentBatchSalesEnd: Date;
  currentBatchProductionStart: Date;
  currentBatchProductionEnd: Date;
  currentBatchShippingMonth: string;
  currentBatchShippingDeadline: number;
  
  // Políticas
  exchangeDeadlineDays: number;
  exchangePolicyText: string;
  cancellationPolicyText: string;
  refundPolicyText: string;
  
  // Suporte
  supportResponseHours: number;
  supportResponseText: string;
  
  // FAQ
  faqFirstDelivery: string;
  faqExchange: string;
  faqCancellation: string;
  faqPlanDifference: string;
  
  // Documentos
  termsLastUpdate: Date;
  privacyLastUpdate: Date;
  
  // Banners
  batchBannerTitle: string;
  batchBannerSubtitle: string;
  batchBannerNote: string;
}

// Cache em memória (5 minutos)
let cachedContent: ContentSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configurações de conteúdo do sistema (SSOT)
 */
export async function fetchContentSettings(): Promise<ContentSettings> {
  // Verificar cache
  const now = Date.now();
  if (cachedContent && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedContent;
  }

  // Valores padrão (fallback)
  const settings: ContentSettings = {
    productionDaysMin: 15,
    productionDaysMax: 20,
    shippingDays: 5,
    salesDurationDays: 30,
    salesOpenDay: 15,
    currentBatchName: "Fevereiro/Março",
    currentBatchSalesStart: new Date("2026-02-15"),
    currentBatchSalesEnd: new Date("2026-03-15"),
    currentBatchProductionStart: new Date("2026-03-16"),
    currentBatchProductionEnd: new Date("2026-03-30"),
    currentBatchShippingMonth: "Abril",
    currentBatchShippingDeadline: 5,
    exchangeDeadlineDays: 1,
    exchangePolicyText: "Você pode trocar suas coleções quantas vezes quiser.",
    cancellationPolicyText: "Você pode cancelar a qualquer momento.",
    refundPolicyText: "Não há reembolso após pagamento.",
    supportResponseHours: 48,
    supportResponseText: "Respondemos em até 48 horas úteis.",
    faqFirstDelivery: "Cronograma mensal fixo.",
    faqExchange: "Trocas ilimitadas.",
    faqCancellation: "Cancelamento a qualquer momento.",
    faqPlanDifference: "Planos maiores têm melhor custo-benefício.",
    termsLastUpdate: new Date("2026-02-03"),
    privacyLastUpdate: new Date("2026-02-03"),
    batchBannerTitle: "🔥 Lote Aberto!",
    batchBannerSubtitle: "Vendas abertas",
    batchBannerNote: "Cronograma fixo",
  };

  try {
    // Buscar todas as configurações
    const { data: systemSettings, error } = await supabase
      .from("system_settings")
      .select("key, value");

    if (!error && systemSettings) {
      const settingsMap = new Map(systemSettings.map(s => [s.key, s.value]));

      // Processar cada configuração
      const get = (key: string, defaultValue: any) => settingsMap.get(key) || defaultValue;
      const getNum = (key: string, defaultValue: number) => parseFloat(get(key, defaultValue.toString()));
      const getDate = (key: string, defaultValue: Date) => {
        const value = get(key, "");
        return value ? new Date(value) : defaultValue;
      };

      settings.productionDaysMin = getNum("production_days_min", 15);
      settings.productionDaysMax = getNum("production_days_max", 20);
      settings.shippingDays = getNum("shipping_days", 5);
      settings.salesDurationDays = getNum("sales_duration_days", 30);
      settings.salesOpenDay = getNum("sales_open_day", 15);
      
      settings.currentBatchName = get("current_batch_name", "Fevereiro/Março");
      settings.currentBatchSalesStart = getDate("current_batch_sales_start", new Date("2026-02-15"));
      settings.currentBatchSalesEnd = getDate("current_batch_sales_end", new Date("2026-03-15"));
      settings.currentBatchProductionStart = getDate("current_batch_production_start", new Date("2026-03-16"));
      settings.currentBatchProductionEnd = getDate("current_batch_production_end", new Date("2026-03-30"));
      settings.currentBatchShippingMonth = get("current_batch_shipping_month", "Abril");
      settings.currentBatchShippingDeadline = getNum("current_batch_shipping_deadline", 5);
      
      settings.exchangeDeadlineDays = getNum("exchange_deadline_days", 1);
      settings.exchangePolicyText = get("exchange_policy_text", settings.exchangePolicyText);
      settings.cancellationPolicyText = get("cancellation_policy_text", settings.cancellationPolicyText);
      settings.refundPolicyText = get("refund_policy_text", settings.refundPolicyText);
      
      settings.supportResponseHours = getNum("support_response_hours", 48);
      settings.supportResponseText = get("support_response_text", settings.supportResponseText);
      
      settings.faqFirstDelivery = get("faq_first_delivery", settings.faqFirstDelivery);
      settings.faqExchange = get("faq_exchange", settings.faqExchange);
      settings.faqCancellation = get("faq_cancellation", settings.faqCancellation);
      settings.faqPlanDifference = get("faq_plan_difference", settings.faqPlanDifference);
      
      settings.termsLastUpdate = getDate("terms_last_update", new Date("2026-02-03"));
      settings.privacyLastUpdate = getDate("privacy_last_update", new Date("2026-02-03"));
      
      settings.batchBannerTitle = get("batch_banner_title", settings.batchBannerTitle);
      settings.batchBannerSubtitle = get("batch_banner_subtitle", settings.batchBannerSubtitle);
      settings.batchBannerNote = get("batch_banner_note", settings.batchBannerNote);
    }

    // Atualizar cache
    cachedContent = settings;
    cacheTimestamp = now;

  } catch (error) {
    console.error("Erro ao buscar configurações de conteúdo:", error);
  }

  return settings;
}

/**
 * Processa variáveis em textos
 * Substitui {{variable}} por valores reais
 */
export function processContentVariables(text: string, settings: ContentSettings): string {
  let processed = text;

  // Substituir variáveis simples
  processed = processed.replace(/\{\{production_days_min\}\}/g, settings.productionDaysMin.toString());
  processed = processed.replace(/\{\{production_days_max\}\}/g, settings.productionDaysMax.toString());
  processed = processed.replace(/\{\{shipping_days\}\}/g, settings.shippingDays.toString());
  processed = processed.replace(/\{\{sales_duration_days\}\}/g, settings.salesDurationDays.toString());
  processed = processed.replace(/\{\{sales_open_day\}\}/g, settings.salesOpenDay.toString());
  
  processed = processed.replace(/\{\{current_batch_name\}\}/g, settings.currentBatchName);
  processed = processed.replace(/\{\{current_batch_shipping_month\}\}/g, settings.currentBatchShippingMonth);
  processed = processed.replace(/\{\{current_batch_shipping_deadline\}\}/g, settings.currentBatchShippingDeadline.toString());
  
  processed = processed.replace(/\{\{exchange_deadline_days\}\}/g, settings.exchangeDeadlineDays.toString());
  processed = processed.replace(/\{\{support_response_hours\}\}/g, settings.supportResponseHours.toString());
  
  // Substituir datas formatadas
  const formatDate = (date: Date) => format(date, "dd/MM", { locale: ptBR });
  const formatDateFull = (date: Date) => format(date, "dd-MM", { locale: ptBR });
  
  processed = processed.replace(/\{\{current_batch_sales_start_formatted\}\}/g, formatDate(settings.currentBatchSalesStart));
  processed = processed.replace(/\{\{current_batch_sales_end_formatted\}\}/g, formatDate(settings.currentBatchSalesEnd));
  processed = processed.replace(/\{\{current_batch_production_start_formatted\}\}/g, formatDateFull(settings.currentBatchProductionStart));
  processed = processed.replace(/\{\{current_batch_production_end_formatted\}\}/g, formatDateFull(settings.currentBatchProductionEnd));
  
  return processed;
}

/**
 * Limpa o cache de configurações
 */
export function clearContentCache() {
  cachedContent = null;
  cacheTimestamp = 0;
}

/**
 * Formata data para exibição
 */
export function formatContentDate(date: Date, formatStr: string = "dd 'de' MMMM 'de' yyyy"): string {
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Retorna texto de prazo de produção
 */
export function getProductionDeadlineText(settings: ContentSettings): string {
  if (settings.productionDaysMin === settings.productionDaysMax) {
    return `${settings.productionDaysMin} dias`;
  }
  return `${settings.productionDaysMin} a ${settings.productionDaysMax} dias`;
}

/**
 * Retorna texto completo do cronograma
 */
export function getFullScheduleText(settings: ContentSettings): string {
  const salesStart = formatContentDate(settings.currentBatchSalesStart, "dd/MM");
  const salesEnd = formatContentDate(settings.currentBatchSalesEnd, "dd/MM");
  const prodStart = formatContentDate(settings.currentBatchProductionStart, "dd-MM");
  const prodEnd = formatContentDate(settings.currentBatchProductionEnd, "dd-MM");
  
  return `Vendas: ${salesStart} a ${salesEnd} • Produção: ${prodStart} a ${prodEnd} • Envio: Até ${settings.currentBatchShippingDeadline}º dia útil de ${settings.currentBatchShippingMonth}`;
}
