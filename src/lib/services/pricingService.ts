/**
 * Pricing Service - SSOT (Single Source of Truth)
 * Centralizes price and fee configuration used across the app.
 */

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";
import { BATCH, PRICING } from "@/config/constants";

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

let cachedSettings: PricingSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchPricingSettings(): Promise<PricingSettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings;
  }

  const settings: PricingSettings = {
    defaultPriceFull: PRICING.DEFAULT_PRICE_FULL,
    defaultPricePix: PRICING.DEFAULT_PRICE_PIX,
    defaultDepositAmount: PRICING.DEFAULT_DEPOSIT_AMOUNT,
    pixDiscountPercentage: PRICING.PIX_DISCOUNT_PERCENTAGE,
    monthlyProductionLimit: BATCH.MONTHLY_PRODUCTION_LIMIT,
    salesOpenDay: BATCH.SALES_OPEN_DAY,
  };

  try {
    const { data: systemSettings, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "default_price_full",
        "default_price_pix",
        "default_deposit_amount",
        "pix_discount_percentage",
        "monthly_production_limit",
        "sales_open_day",
      ]);

    if (!error && systemSettings) {
      systemSettings.forEach((setting) => {
        const value = parseSystemSettingNumber(setting.key, setting.value);
        switch (setting.key) {
          case "default_price_full":
            settings.defaultPriceFull = value;
            break;
          case "default_price_pix":
            settings.defaultPricePix = value;
            break;
          case "default_deposit_amount":
            settings.defaultDepositAmount = value;
            break;
          case "pix_discount_percentage":
            settings.pixDiscountPercentage = value;
            break;
          case "monthly_production_limit":
            settings.monthlyProductionLimit = value;
            break;
          case "sales_open_day":
            settings.salesOpenDay = value;
            break;
        }
      });
    }

    try {
      const { data: productionData, error: prodError } = await supabase.rpc(
        "get_current_production_limit"
      );

      if (!prodError && productionData && productionData.length > 0) {
        const current = productionData[0];
        settings.currentMonthLimit = current.prod_global_limit;
        settings.currentMonthSold = current.prod_units_sold;
        settings.currentMonthAvailable = current.prod_available;
        settings.currentMonthPercentage = current.prod_percentage_sold;
      }
    } catch {
      // Older databases may not have the production limit RPC yet.
    }

    cachedSettings = settings;
    cacheTimestamp = now;
  } catch (error) {
    log.error("Erro ao buscar configuracoes de precos", { error });
  }

  return settings;
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
  const safePercentage = (amount: number, base: number) => (base > 0 ? (amount / base) * 100 : 0);

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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
