// @ts-nocheck
/**
 * Hook para gerenciar pacotes de coins
 * 
 * Busca pacotes disponíveis para compra
 * 
 * Spec: contextual-pricing-system
 * Task: 9A.5 (Página de Compra de Coins)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PriceInCoins } from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

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

// =====================================================
// QUERY KEYS
// =====================================================

export const coinPackagesKeys = {
  all: ["coin-packages"] as const,
  active: () => [...coinPackagesKeys.all, "active"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar pacotes de coins ativos
 * 
 * Cache: 5 minutos (pacotes não mudam frequentemente)
 * 
 * @returns Lista de pacotes ordenados por sort_order
 */
export function useCoinPackages() {
  return useQuery({
    queryKey: coinPackagesKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as CoinPackage[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para buscar um pacote específico
 * 
 * @param packageId - ID do pacote
 * @returns Pacote de coins
 */
export function useCoinPackage(packageId?: string | null) {
  return useQuery({
    queryKey: packageId ? [...coinPackagesKeys.all, packageId] : ["coin-packages", "none"],
    queryFn: async () => {
      if (!packageId) return null;

      const { data, error } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("id", packageId)
        .single();

      if (error) throw error;

      return data as CoinPackage;
    },
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Calcula total de coins de um pacote (amount + bonus)
 */
export function getTotalCoins(pkg: CoinPackage): PriceInCoins {
  return pkg.amount + pkg.bonus;
}

/**
 * Calcula percentual de bônus
 */
export function getBonusPercentage(pkg: CoinPackage): number {
  if (pkg.bonus === 0 || pkg.amount === 0) return 0;
  return Math.round((pkg.bonus / pkg.amount) * 100);
}

/**
 * Formata preço em BRL
 */
export function formatPriceBRL(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}
