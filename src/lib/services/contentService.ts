/**
 * Content Service - SSOT (Single Source of Truth)
 * Centraliza TODOS os textos, políticas, prazos e informações do sistema
 * Garante consistência total em todas as páginas
 *
 * Versão 2.0: Suporte a Modelo Recorrente Mensal (2 ciclos por mês)
 */

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BATCH } from "@/config/constants";
import {
  calculateCurrentBatch,
  calculateCycle,
  type BatchRules,
  type CycleType,
} from "./batchCalculator";

export interface ContentSettings {
  // Prazos (Legado - mantido para compatibilidade)
  productionDaysMin: number;
  productionDaysMax: number;
  shippingDays: number;
  salesDurationDays: number;
  salesOpenDay: number;

  // Lote Atual (Legado - mantido para compatibilidade)
  currentBatchName: string;
  currentBatchSalesStart: Date;
  currentBatchSalesEnd: Date;
  currentBatchProductionStart: Date;
  currentBatchProductionEnd: Date;
  currentBatchShippingMonth: string;
  currentBatchShippingDeadline: number;

  // Novo Modelo de Ciclos (v2.0)
  currentCycleType: CycleType;
  currentCycleMonth: number;
  currentCycleYear: number;

  cycle1SalesStart: Date;
  cycle1SalesEnd: Date;
  cycle1ProductionStart: Date;
  cycle1ProductionEnd: Date;
  cycle1ShippingDeadline: Date;

  cycle2SalesStart: Date;
  cycle2SalesEnd: Date;
  cycle2ProductionStart: Date;
  cycle2ProductionEnd: Date;
  cycle2ShippingDeadline: Date;

  shippingBusinessDays: number;

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
  if (cachedContent && now - cacheTimestamp < CACHE_DURATION) {
    return cachedContent;
  }

  // Valores padrão (fallback)
  const fallbackRules: BatchRules = { shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS };
  const fallbackCurrentBatch = calculateCurrentBatch(fallbackRules);
  const fallbackCycle1 = calculateCycle(
    "cycle1",
    fallbackCurrentBatch.month,
    fallbackCurrentBatch.year,
    fallbackRules
  );
  const fallbackCycle2 = calculateCycle(
    "cycle2",
    fallbackCurrentBatch.month,
    fallbackCurrentBatch.year,
    fallbackRules
  );

  const settings: ContentSettings = {
    // Legado
    productionDaysMin: BATCH.PRODUCTION_DAYS_MIN,
    productionDaysMax: BATCH.PRODUCTION_DAYS_MAX,
    shippingDays: BATCH.SHIPPING_BUSINESS_DAYS,
    salesDurationDays: BATCH.SALES_DURATION_DAYS,
    salesOpenDay: BATCH.SALES_OPEN_DAY,
    currentBatchName: fallbackCurrentBatch.name,
    currentBatchSalesStart: fallbackCurrentBatch.salesStart,
    currentBatchSalesEnd: fallbackCurrentBatch.salesEnd,
    currentBatchProductionStart: fallbackCurrentBatch.productionStart,
    currentBatchProductionEnd: fallbackCurrentBatch.productionEnd,
    currentBatchShippingMonth: fallbackCurrentBatch.shippingMonth,
    currentBatchShippingDeadline: fallbackCurrentBatch.shippingDeadline,

    // Novo Modelo de Ciclos (v2.0)
    currentCycleType: fallbackCurrentBatch.cycleType,
    currentCycleMonth: fallbackCurrentBatch.month,
    currentCycleYear: fallbackCurrentBatch.year,

    cycle1SalesStart: fallbackCycle1.salesStart,
    cycle1SalesEnd: fallbackCycle1.salesEnd,
    cycle1ProductionStart: fallbackCycle1.productionStart,
    cycle1ProductionEnd: fallbackCycle1.productionEnd,
    cycle1ShippingDeadline: fallbackCycle1.shippingDeadlineDate,

    cycle2SalesStart: fallbackCycle2.salesStart,
    cycle2SalesEnd: fallbackCycle2.salesEnd,
    cycle2ProductionStart: fallbackCycle2.productionStart,
    cycle2ProductionEnd: fallbackCycle2.productionEnd,
    cycle2ShippingDeadline: fallbackCycle2.shippingDeadlineDate,

    shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS,
    exchangeDeadlineDays: BATCH.EXCHANGE_DEADLINE_DAYS,
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
      const settingsMap = new Map(systemSettings.map((s) => [s.key, s.value]));

      // Processar cada configuração
      const get = (key: string, defaultValue: string): string => {
        const value = settingsMap.get(key);
        return value === undefined || value === null ? defaultValue : String(value);
      };
      const getNum = (key: string, defaultValue: number) =>
        parseFloat(get(key, defaultValue.toString()));
      const getDate = (key: string, defaultValue: Date) => {
        const value = get(key, "");
        return value ? new Date(value) : defaultValue;
      };

      settings.productionDaysMin = getNum("production_days_min", BATCH.PRODUCTION_DAYS_MIN);
      settings.productionDaysMax = getNum("production_days_max", BATCH.PRODUCTION_DAYS_MAX);
      settings.shippingDays = getNum("shipping_days", BATCH.SHIPPING_BUSINESS_DAYS);
      settings.salesDurationDays = getNum("sales_duration_days", BATCH.SALES_DURATION_DAYS);
      settings.salesOpenDay = getNum("sales_open_day", BATCH.SALES_OPEN_DAY);

      settings.currentBatchName = get("current_batch_name", fallbackCurrentBatch.name);
      settings.currentBatchSalesStart = getDate(
        "current_batch_sales_start",
        fallbackCurrentBatch.salesStart
      );
      settings.currentBatchSalesEnd = getDate(
        "current_batch_sales_end",
        fallbackCurrentBatch.salesEnd
      );
      settings.currentBatchProductionStart = getDate(
        "current_batch_production_start",
        fallbackCurrentBatch.productionStart
      );
      settings.currentBatchProductionEnd = getDate(
        "current_batch_production_end",
        fallbackCurrentBatch.productionEnd
      );
      settings.currentBatchShippingMonth = get(
        "current_batch_shipping_month",
        fallbackCurrentBatch.shippingMonth
      );
      settings.currentBatchShippingDeadline = getNum(
        "current_batch_shipping_deadline",
        fallbackCurrentBatch.shippingDeadline
      );

      settings.exchangeDeadlineDays = getNum(
        "exchange_deadline_days",
        BATCH.EXCHANGE_DEADLINE_DAYS
      );
      settings.exchangePolicyText = get("exchange_policy_text", settings.exchangePolicyText);
      settings.cancellationPolicyText = get(
        "cancellation_policy_text",
        settings.cancellationPolicyText
      );
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

      // Novo Modelo de Ciclos (v2.0)
      settings.currentCycleType = get(
        "current_cycle_type",
        fallbackCurrentBatch.cycleType
      ) as CycleType;
      settings.currentCycleMonth = getNum("current_cycle_month", fallbackCurrentBatch.month);
      settings.currentCycleYear = getNum("current_cycle_year", fallbackCurrentBatch.year);

      settings.cycle1SalesStart = getDate("cycle1_sales_start", fallbackCycle1.salesStart);
      settings.cycle1SalesEnd = getDate("cycle1_sales_end", fallbackCycle1.salesEnd);
      settings.cycle1ProductionStart = getDate(
        "cycle1_production_start",
        fallbackCycle1.productionStart
      );
      settings.cycle1ProductionEnd = getDate(
        "cycle1_production_end",
        fallbackCycle1.productionEnd
      );
      settings.cycle1ShippingDeadline = getDate(
        "cycle1_shipping_deadline",
        fallbackCycle1.shippingDeadlineDate
      );

      settings.cycle2SalesStart = getDate("cycle2_sales_start", fallbackCycle2.salesStart);
      settings.cycle2SalesEnd = getDate("cycle2_sales_end", fallbackCycle2.salesEnd);
      settings.cycle2ProductionStart = getDate(
        "cycle2_production_start",
        fallbackCycle2.productionStart
      );
      settings.cycle2ProductionEnd = getDate(
        "cycle2_production_end",
        fallbackCycle2.productionEnd
      );
      settings.cycle2ShippingDeadline = getDate(
        "cycle2_shipping_deadline",
        fallbackCycle2.shippingDeadlineDate
      );

      settings.shippingBusinessDays = getNum(
        "shipping_business_days",
        BATCH.SHIPPING_BUSINESS_DAYS
      );
    }

    // Atualizar cache
    cachedContent = settings;
    cacheTimestamp = now;
  } catch (error) {
    log.error("Erro ao buscar configurações de conteúdo", { error });
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
  processed = processed.replace(
    /\{\{production_days_min\}\}/g,
    settings.productionDaysMin.toString()
  );
  processed = processed.replace(
    /\{\{production_days_max\}\}/g,
    settings.productionDaysMax.toString()
  );
  processed = processed.replace(/\{\{shipping_days\}\}/g, settings.shippingDays.toString());
  processed = processed.replace(
    /\{\{sales_duration_days\}\}/g,
    settings.salesDurationDays.toString()
  );
  processed = processed.replace(/\{\{sales_open_day\}\}/g, settings.salesOpenDay.toString());

  processed = processed.replace(/\{\{current_batch_name\}\}/g, settings.currentBatchName);
  processed = processed.replace(
    /\{\{current_batch_shipping_month\}\}/g,
    settings.currentBatchShippingMonth
  );
  processed = processed.replace(
    /\{\{current_batch_shipping_deadline\}\}/g,
    settings.currentBatchShippingDeadline.toString()
  );

  processed = processed.replace(
    /\{\{exchange_deadline_days\}\}/g,
    settings.exchangeDeadlineDays.toString()
  );
  processed = processed.replace(
    /\{\{support_response_hours\}\}/g,
    settings.supportResponseHours.toString()
  );

  // Substituir datas formatadas
  const formatDate = (date: Date) => format(date, "dd/MM", { locale: ptBR });
  const formatDateFull = (date: Date) => format(date, "dd-MM", { locale: ptBR });

  processed = processed.replace(
    /\{\{current_batch_sales_start_formatted\}\}/g,
    formatDate(settings.currentBatchSalesStart)
  );
  processed = processed.replace(
    /\{\{current_batch_sales_end_formatted\}\}/g,
    formatDate(settings.currentBatchSalesEnd)
  );
  processed = processed.replace(
    /\{\{current_batch_production_start_formatted\}\}/g,
    formatDateFull(settings.currentBatchProductionStart)
  );
  processed = processed.replace(
    /\{\{current_batch_production_end_formatted\}\}/g,
    formatDateFull(settings.currentBatchProductionEnd)
  );

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
export function formatContentDate(
  date: Date,
  formatStr: string = "dd 'de' MMMM 'de' yyyy"
): string {
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
