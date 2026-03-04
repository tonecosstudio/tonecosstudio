// @ts-nocheck
/**
 * Hook para usar configurações de preços (SSOT)
 * Atualiza automaticamente quando as configurações mudam
 */

import { useQuery } from "@tanstack/react-query";
import { fetchPricingSettings, type PricingSettings } from "@/lib/services/pricingService";

export function usePricingSettings() {
  return useQuery<PricingSettings>({
    queryKey: ["pricing-settings"],
    queryFn: fetchPricingSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (garbage collection time)
    refetchOnWindowFocus: false,
  });
}
