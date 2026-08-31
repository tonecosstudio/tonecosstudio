/**
 * Pricing Service - SSOT (Single Source of Truth)
 * Centralizes price and fee configuration used across the app.
 */

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";
import { BATCH } from "@/config/constants";

export { formatCurrency } from "@/lib/utils";

export interface PricingSettings {
  defaultPriceFull: number;
  defaultPricePix: number;
  defaultDepositAmount: number;
  pixDiscountPercentage: number;
  monthlyProductionLimit: number;
  salesOpenDay: number;
  currentMonthLimit?: number;
  currentMonthSold?: number;
  currentMonthAvailable?: number;
  currentMonthPercentage?: number;
}

export interface TaxRates {
  taxPix: number;
  taxSaleInstallment: number;
  taxInstallment6x: number;
  taxInstallment10xStore: number;
  taxInstallment10xClient: number;
}

const REQUIRED_COMMERCIAL_KEYS = [
  "default_price_full",
  "default_price_pix",
  "default_deposit_amount",
  "pix_discount_percentage",
] as const;

const OPTIONAL_OPERATIONAL_KEYS = [
  "monthly_production_limit",
  "sales_open_day",
] as const;

let cachedSettings: PricingSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function assertFiniteInRange(
  key: string,
  value: number,
  { min, max = Number.POSITIVE_INFINITY }: { min: number; max?: number },
): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Configuração comercial inválida: ${key}`);
  }

  return value;
}

function readRequiredSetting(settings: Map<string, unknown>, key: string): number {
  if (!settings.has(key)) {
    throw new Error(`Configuração comercial ausente: ${key}`);
  }

  return parseSystemSettingNumber(key, settings.get(key));
}

function readOptionalSetting(
  settings: Map<string, unknown>,
  key: string,
  fallback: number,
): number {
  if (!settings.has(key)) {
    return fallback;
  }

  return parseSystemSettingNumber(key, settings.get(key));
}

export async function fetchPricingSettings(): Promise<PricingSettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const keys = [...REQUIRED_COMMERCIAL_KEYS, ...OPTIONAL_OPERATIONAL_KEYS];
    const { data: systemSettings, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", keys);

    if (error) {
      throw new Error(`Falha ao carregar configuração comercial: ${error.message}`);
    }

    const settingValues = new Map<string, unknown>(
      (systemSettings ?? []).map((setting) => [setting.key, setting.value]),
    );

    const defaultPriceFull = assertFiniteInRange(
      "default_price_full",
      readRequiredSetting(settingValues, "default_price_full"),
      { min: Number.EPSILON },
    );
    const defaultPricePix = assertFiniteInRange(
      "default_price_pix",
      readRequiredSetting(settingValues, "default_price_pix"),
      { min: Number.EPSILON, max: defaultPriceFull },
    );
    const defaultDepositAmount = assertFiniteInRange(
      "default_deposit_amount",
      readRequiredSetting(settingValues, "default_deposit_amount"),
      { min: 0, max: Math.min(defaultPriceFull, defaultPricePix) },
    );
    const pixDiscountPercentage = assertFiniteInRange(
      "pix_discount_percentage",
      readRequiredSetting(settingValues, "pix_discount_percentage"),
      { min: 0, max: 100 },
    );

    const monthlyProductionLimit = assertFiniteInRange(
      "monthly_production_limit",
      readOptionalSetting(
        settingValues,
        "monthly_production_limit",
        BATCH.MONTHLY_PRODUCTION_LIMIT,
      ),
      { min: 1 },
    );
    const salesOpenDay = assertFiniteInRange(
      "sales_open_day",
      readOptionalSetting(settingValues, "sales_open_day", BATCH.SALES_OPEN_DAY),
      { min: 1, max: 31 },
    );

    if (!Number.isInteger(monthlyProductionLimit) || !Number.isInteger(salesOpenDay)) {
      throw new Error("Configuração operacional de vendas deve usar números inteiros");
    }

    const settings: PricingSettings = {
      defaultPriceFull,
      defaultPricePix,
      defaultDepositAmount,
      pixDiscountPercentage,
      monthlyProductionLimit,
      salesOpenDay,
    };

    try {
      const { data: productionData, error: prodError } = await supabase.rpc(
        "get_current_production_limit",
      );

      if (!prodError && productionData && productionData.length > 0) {
        const current = productionData[0];
        const currentMonthLimit = Number(current.prod_global_limit);
        const currentMonthSold = Number(current.prod_units_sold);
        const currentMonthAvailable = Number(current.prod_available);
        const currentMonthPercentage = Number(current.prod_percentage_sold);

        if (
          [
            currentMonthLimit,
            currentMonthSold,
            currentMonthAvailable,
            currentMonthPercentage,
          ].every(Number.isFinite)
        ) {
          settings.currentMonthLimit = currentMonthLimit;
          settings.currentMonthSold = currentMonthSold;
          settings.currentMonthAvailable = currentMonthAvailable;
          settings.currentMonthPercentage = currentMonthPercentage;
        }
      }
    } catch {
      // Production metrics are optional and must never replace commercial pricing.
    }

    cachedSettings = settings;
    cacheTimestamp = now;
    return settings;
  } catch (error) {
    log.error("Erro ao buscar configurações de preços", { error });
    throw error;
  }
}

export function clearPricingCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export const TAX_RATES: TaxRates = {
  taxPix: 0.01,
  taxSaleInstallment: 0.0498,
  taxInstallment6x: 0.0996,
  taxInstallment10xStore: 0.1493,
  taxInstallment10xClient: 0.2065,
};

export function calculatePixPrice(fullPrice: number, discountPercentage: number): number {
  return fullPrice * (1 - discountPercentage / 100);
}

export function calculateRemaining(totalPrice: number, depositAmount: number): number {
  return totalPrice - depositAmount;
}

export function calculateNetValues(fullPrice: number, pixDiscountPercentage: number) {
  const pixPrice = calculatePixPrice(fullPrice, pixDiscountPercentage);
  const safePercentage = (amount: number, base: number) =>
    base > 0 ? (amount / base) * 100 : 0;

  const pixTax = pixPrice * TAX_RATES.taxPix;
  const netPix = pixPrice - pixTax;

  const tax6xSale = fullPrice * TAX_RATES.taxSaleInstallment;
  const tax6xInstallment = fullPrice * TAX_RATES.taxInstallment6x;
  const net6x = fullPrice - tax6xSale - tax6xInstallment;

  const tax10xStoreSale = fullPrice * TAX_RATES.taxSaleInstallment;
  const tax10xStoreInstallment = fullPrice * TAX_RATES.taxInstallment10xStore;
  const net10xStore = fullPrice - tax10xStoreSale - tax10xStoreInstallment;

  const clientSurcharge = fullPrice * TAX_RATES.taxInstallment10xClient;
  const priceWithInterest = fullPrice + clientSurcharge;
  const tax10xClientSale = fullPrice * TAX_RATES.taxSaleInstallment;
  const tax10xClientInstallment = fullPrice * TAX_RATES.taxInstallment10xClient;
  const net10xClient = priceWithInterest - tax10xClientSale - tax10xClientInstallment;

  return {
    pix: {
      clientPays: pixPrice,
      tax: pixTax,
      youReceive: netPix,
      percentage: safePercentage(netPix, pixPrice),
    },
    installment6x: {
      clientPays: fullPrice,
      installmentValue: fullPrice / 6,
      taxes: tax6xSale + tax6xInstallment,
      youReceive: net6x,
      percentage: safePercentage(net6x, fullPrice),
    },
    installment10xStore: {
      clientPays: fullPrice,
      installmentValue: fullPrice / 10,
      taxes: tax10xStoreSale + tax10xStoreInstallment,
      youReceive: net10xStore,
      percentage: safePercentage(net10xStore, fullPrice),
    },
    installment10xClient: {
      clientPays: priceWithInterest,
      installmentValue: priceWithInterest / 10,
      surcharge: clientSurcharge,
      taxes: tax10xClientSale + tax10xClientInstallment,
      youReceive: net10xClient,
      percentage: safePercentage(net10xClient, fullPrice),
    },
  };
}
