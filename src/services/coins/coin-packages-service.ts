import { supabase } from "@/integrations/supabase/client";
import type { PriceInCoins } from "@/types/contextual-pricing";

export interface CoinPackage {
  id: string;
  name: string;
  amount: PriceInCoins;
  bonus: PriceInCoins;
  price_brl: number;
  is_active: boolean;
  is_popular: boolean;
  is_best_value: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function listActiveCoinPackages(): Promise<CoinPackage[]> {
  const { data, error } = await supabase
    .from("coin_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as CoinPackage[];
}

export async function getCoinPackage(packageId: string): Promise<CoinPackage> {
  const { data, error } = await supabase
    .from("coin_packages")
    .select("*")
    .eq("id", packageId)
    .single();

  if (error) throw error;
  return data as CoinPackage;
}
