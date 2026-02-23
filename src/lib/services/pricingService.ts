// @ts-nocheck
/**
 * Pricing Service - SSOT (Single Source of Truth)
 * Centraliza TODAS as configurações de preços e taxas do sistema
 * Garante que todos os componentes usem os mesmos valores do banco de dados
 */

import { supabase } from "@/integrations/supabase/client";

export interface PricingSettings {
  // Preços Padrão
  defaultPriceFull: number;
  defaultPricePix: number;
  defaultDepositAmount: number;
  
  // Descontos
  pixDiscountPercentage: number;
  
  // Limites de Produção
  monthlyProductionLimit: number;
  salesOpenDay: number;
  
  // Dados do Mês Atual
  currentMonthLimit?: number;
  currentMonthSold?: number;
  currentMonthAvailable?: number;
  currentMonthPercentage?: number;
}

export interface TaxRates {
  // Mercado Pago
  taxPix: number;
  taxSaleInstallment: number;
  taxInstallment6x: number;
  taxInstallment10xStore: number;
  taxInstallment10xClient: number;
}

// Cache em memória (5 minutos)
let cachedSettings: PricingSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configurações de preços do sistema (SSOT)
 * Usa cache para evitar múltiplas queries
 */
export async function fetchPricingSettings(): Promise<PricingSettings> {
  // Verificar cache
  const now = Date.now();
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings;
  }

  const settings: PricingSettings = {
    defaultPriceFull: 500,
    defaultPricePix: 475,
    defaultDepositAmount: 100,
    pixDiscountPercentage: 5,
    monthlyProductionLimit: 20,
    salesOpenDay: 15,
  };

  try {
    // Buscar configurações do banco
    const { data: systemSettings, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "default_price_full",
        "default_price_pix",
        "default_deposit_amount",
        "pix_discount_percentage",
        "monthly_production_limit",
        "sales_open_day"
      ]);

    if (!error && systemSettings) {
      systemSettings.forEach(setting => {
        const value = parseFloat(setting.value);
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

    // Buscar dados de produção do mês atual
    try {
      const { data: productionData, error: prodError } = await supabase
        .rpc("get_current_production_limit");

      if (!prodError && productionData && productionData.length > 0) {
        const current = productionData[0];
        settings.currentMonthLimit = current.prod_global_limit;
        settings.currentMonthSold = current.prod_units_sold;
        settings.currentMonthAvailable = current.prod_available;
        settings.currentMonthPercentage = current.prod_percentage_sold;
      }
    } catch (error) {
      // Silenciosamente ignora se a função não existir
    }

    // Atualizar cache
    cachedSettings = settings;
    cacheTimestamp = now;

  } catch (error) {
    console.error("Erro ao buscar configurações de preços:", error);
  }

  return settings;
}

/**
 * Limpa o cache de configurações
 * Útil após atualizar configurações no admin
 */
export function clearPricingCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

/**
 * Taxas do Mercado Pago (fixas)
 * Estas taxas são definidas pelo Mercado Pago e não mudam
 */
export const TAX_RATES: TaxRates = {
  taxPix: 0.01, // 1%
  taxSaleInstallment: 0.0498, // 4,98%
  taxInstallment6x: 0.0996, // 9,96%
  taxInstallment10xStore: 0.1493, // 14,93%
  taxInstallment10xClient: 0.2065, // 20,65%
};

/**
 * Calcula preço PIX com desconto
 */
export function calculatePixPrice(fullPrice: number, discountPercentage: number): number {
  return fullPrice * (1 - discountPercentage / 100);
}

/**
 * Calcula valor restante após entrada
 */
export function calculateRemaining(totalPrice: number, depositAmount: number): number {
  return totalPrice - depositAmount;
}

/**
 * Calcula valores líquidos após taxas do Mercado Pago
 */
export function calculateNetValues(fullPrice: number, pixDiscountPercentage: number) {
  const pixPrice = calculatePixPrice(fullPrice, pixDiscountPercentage);
  
  // PIX
  const pixTax = pixPrice * TAX_RATES.taxPix;
  const netPix = pixPrice - pixTax;
  
  // 6x sem juros
  const tax6xSale = fullPrice * TAX_RATES.taxSaleInstallment;
  const tax6xInstallment = fullPrice * TAX_RATES.taxInstallment6x;
  const net6x = fullPrice - tax6xSale - tax6xInstallment;
  
  // 10x sem juros (loja paga)
  const tax10xStoreSale = fullPrice * TAX_RATES.taxSaleInstallment;
  const tax10xStoreInstallment = fullPrice * TAX_RATES.taxInstallment10xStore;
  const net10xStore = fullPrice - tax10xStoreSale - tax10xStoreInstallment;
  
  // 10x com juros (cliente paga)
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
      percentage: (netPix / pixPrice) * 100,
    },
    installment6x: {
      clientPays: fullPrice,
      installmentValue: fullPrice / 6,
      taxes: tax6xSale + tax6xInstallment,
      youReceive: net6x,
      percentage: (net6x / fullPrice) * 100,
    },
    installment10xStore: {
      clientPays: fullPrice,
      installmentValue: fullPrice / 10,
      taxes: tax10xStoreSale + tax10xStoreInstallment,
      youReceive: net10xStore,
      percentage: (net10xStore / fullPrice) * 100,
    },
    installment10xClient: {
      clientPays: priceWithInterest,
      installmentValue: priceWithInterest / 10,
      surcharge: clientSurcharge,
      taxes: tax10xClientSale + tax10xClientInstallment,
      youReceive: net10xClient,
      percentage: (net10xClient / fullPrice) * 100,
    },
  };
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

/**
 * Hook React para usar configurações de preços
 * Atualiza automaticamente quando as configurações mudam
 */
export function usePricingSettings() {
  // Este hook será implementado nos componentes React
  // Por enquanto, retorna a função de fetch
  return { fetchPricingSettings, clearPricingCache };
}
