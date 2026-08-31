import { supabase } from "@/integrations/supabase/client";

export interface ProductionLimit {
  prod_month: number;
  prod_year: number;
  prod_global_limit: number;
  prod_units_sold: number;
  prod_available: number;
  prod_is_closed: boolean;
  prod_percentage_sold: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProductionLimit(value: unknown): ProductionLimit {
  if (!isRecord(value)) {
    throw new Error("Configuração de produção indisponível.");
  }

  const month = toFiniteNumber(value.prod_month);
  const year = toFiniteNumber(value.prod_year);
  const globalLimit = toFiniteNumber(value.prod_global_limit);
  const unitsSold = toFiniteNumber(value.prod_units_sold);
  const available = toFiniteNumber(value.prod_available);
  const percentageSold = toFiniteNumber(value.prod_percentage_sold);
  const isClosed = value.prod_is_closed;

  const invalid =
    month === null ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year === null ||
    !Number.isInteger(year) ||
    year < 2020 ||
    globalLimit === null ||
    !Number.isInteger(globalLimit) ||
    globalLimit < 1 ||
    unitsSold === null ||
    !Number.isInteger(unitsSold) ||
    unitsSold < 0 ||
    available === null ||
    !Number.isInteger(available) ||
    available < 0 ||
    percentageSold === null ||
    percentageSold < 0 ||
    typeof isClosed !== "boolean";

  if (invalid || unitsSold > globalLimit || available !== Math.max(globalLimit - unitsSold, 0)) {
    throw new Error("Configuração de produção inválida.");
  }

  return {
    prod_month: month,
    prod_year: year,
    prod_global_limit: globalLimit,
    prod_units_sold: unitsSold,
    prod_available: available,
    prod_is_closed: isClosed,
    prod_percentage_sold: percentageSold,
  };
}

export async function getCurrentProductionLimit(): Promise<ProductionLimit> {
  const { data, error } = await supabase.rpc("get_current_production_limit").single();

  if (error) throw error;
  return normalizeProductionLimit(data);
}

export async function checkSalesOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc("are_sales_open");

  if (error) throw error;
  if (typeof data !== "boolean") {
    throw new Error("Status de vendas indisponível.");
  }

  return data;
}

export async function closeMonthlySales(reason: string = "manual"): Promise<unknown> {
  const { data, error } = await supabase.rpc("close_monthly_sales", {
    reason,
  });

  if (error) throw error;
  return data;
}

export async function reopenMonthlySales(): Promise<unknown> {
  const { data, error } = await supabase.rpc("reopen_monthly_sales");

  if (error) throw error;
  return data;
}
