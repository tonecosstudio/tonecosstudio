/**
 * Serviço centralizado para gerenciar prazos do sistema.
 *
 * Todos os prazos operacionais vêm de system_settings. Ausência, erro ou valor
 * inválido bloqueiam o cálculo em vez de inventar um prazo local.
 */

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateNthBusinessDayOfMonth } from "@/lib/business-days";
import { log } from "@/lib/logger";
import { getHolidayDates } from "@/services/calendar/holiday-service";

let deadlinesCache: SystemDeadlines | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

const DEADLINE_KEYS = [
  "production_days_min",
  "production_days_max",
  "shipping_business_days",
  "sales_duration_days",
  "delivery_interval_days",
  "character_choice_days",
  "balance_payment_days",
] as const;

type DeadlineSettingKey = (typeof DEADLINE_KEYS)[number];

function requirePositiveIntegerSetting(
  settings: Record<string, unknown>,
  key: DeadlineSettingKey,
  options: { max?: number } = {},
): number {
  const raw = settings[key];
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;
  const max = options.max ?? 3650;

  if (!Number.isInteger(value) || value <= 0 || value > max) {
    throw new Error(`Prazo oficial inválido ou ausente: ${key}`);
  }

  return value;
}

export interface SystemDeadlines {
  productionDaysMin: number;
  productionDaysMax: number;
  shippingBusinessDays: number;
  salesDurationDays: number;
  deliveryIntervalDays: number;
  characterChoiceDays: number;
  balancePaymentDays: number;
  fetchedAt: Date;
}

export async function getSystemDeadlines(): Promise<SystemDeadlines> {
  const now = Date.now();

  if (deadlinesCache && now - lastFetchTime < CACHE_DURATION) {
    return deadlinesCache;
  }

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", [...DEADLINE_KEYS]);

  if (error) {
    log.error("Erro ao buscar prazos oficiais", { error });
    throw new Error(`Prazos oficiais do sistema estão indisponíveis: ${error.message}`);
  }

  const settings = (data || []).reduce(
    (acc, item) => {
      acc[item.key] = item.value;
      return acc;
    },
    {} as Record<string, unknown>,
  );

  const productionDaysMin = requirePositiveIntegerSetting(settings, "production_days_min");
  const productionDaysMax = requirePositiveIntegerSetting(settings, "production_days_max");

  if (productionDaysMax < productionDaysMin) {
    throw new Error("Prazo oficial inválido: production_days_max é menor que production_days_min");
  }

  deadlinesCache = {
    productionDaysMin,
    productionDaysMax,
    shippingBusinessDays: requirePositiveIntegerSetting(
      settings,
      "shipping_business_days",
      { max: 31 },
    ),
    salesDurationDays: requirePositiveIntegerSetting(settings, "sales_duration_days"),
    deliveryIntervalDays: requirePositiveIntegerSetting(settings, "delivery_interval_days"),
    characterChoiceDays: requirePositiveIntegerSetting(settings, "character_choice_days", {
      max: 365,
    }),
    balancePaymentDays: requirePositiveIntegerSetting(settings, "balance_payment_days", {
      max: 365,
    }),
    fetchedAt: new Date(now),
  };

  lastFetchTime = now;
  return deadlinesCache;
}

export async function calculateDeliveryDates(salesStartDate: Date) {
  const deadlines = await getSystemDeadlines();

  const salesStart = new Date(salesStartDate);
  salesStart.setDate(1);

  const salesEnd = new Date(salesStart);
  salesEnd.setMonth(salesEnd.getMonth() + 1);
  salesEnd.setDate(0);

  const productionStart = new Date(salesEnd);
  productionStart.setDate(productionStart.getDate() + 1);

  const productionEnd = new Date(productionStart);
  productionEnd.setMonth(productionEnd.getMonth() + 1);
  productionEnd.setDate(0);

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
    holidays,
  );

  const shippingEnd = new Date(shippingStart);
  shippingEnd.setMonth(shippingEnd.getMonth() + 1);
  shippingEnd.setDate(0);

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

export function formatDeadline(days: number, unit: "dias" | "dias úteis" = "dias"): string {
  if (days === 1) {
    return `1 ${unit === "dias" ? "dia" : "dia útil"}`;
  }
  return `${days} ${unit}`;
}

export async function getDeliveryFlowDescription(): Promise<string> {
  const deadlines = await getSystemDeadlines();

  return `Producao: ~${deadlines.productionDaysMin} dias • Envio: ate o ${deadlines.shippingBusinessDays}o dia util do mes • Entrega: ${deadlines.deliveryIntervalDays} dias`;
}

export function invalidateDeadlinesCache(): void {
  deadlinesCache = null;
  lastFetchTime = 0;
}

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
