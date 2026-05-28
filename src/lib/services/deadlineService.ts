/**
 * Serviço centralizado para gerenciar prazos do sistema
 * SINGLE SOURCE OF TRUTH para todos os prazos
 *
 * Todos os prazos vêm de system_settings no banco de dados
 */

import React from "react";
import { BATCH } from "@/config/constants";
import { supabase } from "@/integrations/supabase/client";
import { calculateNthBusinessDayOfMonth } from "@/lib/business-days";
import { log } from "@/lib/logger";
import { getHolidayDates } from "@/services/holiday-service";

// Cache dos prazos (atualizado a cada 5 minutos)
let deadlinesCache: SystemDeadlines | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function parseSettingInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export interface SystemDeadlines {
  // Prazos principais (em dias)
  productionDaysMin: number;
  productionDaysMax: number;
  shippingBusinessDays: number;
  salesDurationDays: number;
  deliveryIntervalDays: number;

  // Prazos de ação (em dias)
  characterChoiceDays: number;
  balancePaymentDays: number;

  // Metadados
  fetchedAt: Date;
}

/**
 * Busca os prazos do banco de dados (system_settings)
 * Usa cache para evitar múltiplas requisições
 */
export async function getSystemDeadlines(): Promise<SystemDeadlines> {
  const now = Date.now();

  // Retornar cache se ainda válido
  if (deadlinesCache && now - lastFetchTime < CACHE_DURATION) {
    return deadlinesCache;
  }

  // Buscar do banco
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", [
      "production_days_min",
      "production_days_max",
      "shipping_business_days",
      "sales_duration_days",
      "delivery_interval_days",
      "character_choice_days",
      "balance_payment_days",
    ]);

  if (error) {
    log.error("Erro ao buscar prazos", { error });
    return getDefaultDeadlines();
  }

  // Converter para objeto
  const settings = data.reduce(
    (acc, item) => {
      acc[item.key] = parseSettingInteger(item.value);
      return acc;
    },
    {} as Record<string, number>
  );

  // Criar objeto de prazos
  deadlinesCache = {
    productionDaysMin: settings.production_days_min || BATCH.PRODUCTION_DAYS_MIN,
    productionDaysMax: settings.production_days_max || BATCH.PRODUCTION_DAYS_MAX,
    shippingBusinessDays: settings.shipping_business_days || BATCH.SHIPPING_BUSINESS_DAYS,
    salesDurationDays: settings.sales_duration_days || BATCH.SALES_DURATION_DAYS,
    deliveryIntervalDays: settings.delivery_interval_days || BATCH.DELIVERY_INTERVAL_DAYS,
    characterChoiceDays: settings.character_choice_days || BATCH.CHARACTER_CHOICE_DAYS,
    balancePaymentDays: settings.balance_payment_days || BATCH.BALANCE_PAYMENT_DAYS,
    fetchedAt: new Date(),
  };

  lastFetchTime = now;
  return deadlinesCache;
}

/**
 * Valores padrão (fallback)
 */
function getDefaultDeadlines(): SystemDeadlines {
  return {
    productionDaysMin: BATCH.PRODUCTION_DAYS_MIN,
    productionDaysMax: BATCH.PRODUCTION_DAYS_MAX,
    shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS,
    salesDurationDays: BATCH.SALES_DURATION_DAYS,
    deliveryIntervalDays: BATCH.DELIVERY_INTERVAL_DAYS,
    characterChoiceDays: BATCH.CHARACTER_CHOICE_DAYS,
    balancePaymentDays: BATCH.BALANCE_PAYMENT_DAYS,
    fetchedAt: new Date(),
  };
}

/**
 * Calcula as datas de um ciclo completo baseado na data de início das vendas
 */
export async function calculateDeliveryDates(salesStartDate: Date) {
  const deadlines = await getSystemDeadlines();

  // Mês 1: Vendas (mês completo)
  const salesStart = new Date(salesStartDate);
  salesStart.setDate(1); // Primeiro dia do mês

  const salesEnd = new Date(salesStart);
  salesEnd.setMonth(salesEnd.getMonth() + 1);
  salesEnd.setDate(0); // Último dia do mês

  // Mês 2: Produção (mês completo)
  const productionStart = new Date(salesEnd);
  productionStart.setDate(productionStart.getDate() + 1); // Dia seguinte ao fim das vendas

  const productionEnd = new Date(productionStart);
  productionEnd.setMonth(productionEnd.getMonth() + 1);
  productionEnd.setDate(0); // Último dia do mês

  // Mes 3: Envio a partir do dia util configurado
  const shippingMonthDate = new Date(productionEnd);
  shippingMonthDate.setMonth(shippingMonthDate.getMonth() + 1);
  shippingMonthDate.setDate(1);

  const shippingMonth = shippingMonthDate.getMonth() + 1;
  const shippingYear = shippingMonthDate.getFullYear();
  const holidays = await getHolidayDates(shippingYear);
  const shippingStart = calculateNthBusinessDayOfMonth(
    shippingMonth,
    shippingYear,
    deadlines.shippingBusinessDays,
    holidays
  );

  const shippingEnd = new Date(shippingStart);
  shippingEnd.setMonth(shippingEnd.getMonth() + 1);
  shippingEnd.setDate(0); // Último dia do mês

  return {
    salesStart,
    salesEnd,
    productionStart,
    productionEnd,
    shippingStart,
    shippingEnd,
    totalDays: Math.ceil((shippingEnd.getTime() - salesStart.getTime()) / (1000 * 60 * 60 * 24)),
  };
}

/**
 * Formata prazo para exibição
 */
export function formatDeadline(days: number, unit: "dias" | "dias úteis" = "dias"): string {
  if (days === 1) {
    return `1 ${unit === "dias" ? "dia" : "dia útil"}`;
  }
  return `${days} ${unit}`;
}

/**
 * Retorna descrição do fluxo completo
 */
export async function getDeliveryFlowDescription(): Promise<string> {
  const deadlines = await getSystemDeadlines();

  return `Producao: ~${deadlines.productionDaysMin} dias • Envio: ate o ${deadlines.shippingBusinessDays}o dia util do mes • Entrega: ${deadlines.deliveryIntervalDays} dias`;
}

/**
 * Invalida o cache (útil após atualizar configurações)
 */
export function invalidateDeadlinesCache(): void {
  deadlinesCache = null;
  lastFetchTime = 0;
}

/**
 * Hook React para usar os prazos
 */
export function useSystemDeadlines() {
  const [deadlines, setDeadlines] = React.useState<SystemDeadlines | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    getSystemDeadlines()
      .then(setDeadlines)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return { deadlines, isLoading, error, refetch: invalidateDeadlinesCache };
}
