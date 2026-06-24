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

export async function getCurrentProductionLimit(): Promise<ProductionLimit> {
  const { data, error } = await supabase.rpc("get_current_production_limit").single();

  if (error) throw error;
  return data as ProductionLimit;
}

export async function checkSalesOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc("are_sales_open");

  if (error) throw error;
  return data as boolean;
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
