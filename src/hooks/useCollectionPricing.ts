import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";

/**
 * Interface para preços de coleção
 * Agora inclui informações de nível de preço quando aplicável
 * Requisitos: 4.1, 4.2, 4.3, 4.5, 12.3
 */
export interface CollectionPricing {
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  remaining_full: number;
  remaining_pix: number;
  is_custom: boolean;
  tier_id?: string | null;
  tier_name?: string | null;
  pricing_source: 'custom' | 'tier' | 'default';
}

/**
 * Hook para buscar preços de uma coleção
 * Busca preços de nível, customizado ou padrão automaticamente
 * Requisitos: 4.1, 4.2, 4.3, 4.5, 12.3
 */
export function useCollectionPricing(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-pricing", collectionId],
    queryFn: async () => {
      if (!collectionId) {
        throw new Error("Collection ID is required");
      }

      const { data, error } = await supabase.rpc("get_collection_pricing", {
        p_collection_id: collectionId,
      });

      if (error) throw error;

      // RPC retorna array, pegar primeiro item
      return data?.[0] as CollectionPricing;
    },
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000, // 2 minutos - cache para melhor performance
  });
}

export function useGlobalPricingSettings() {
  return useQuery({
    queryKey: ["global-pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", [
          "default_price_full",
          "default_price_pix",
          "default_deposit_amount",
          "pix_discount_percentage",
        ]);

      if (error) throw error;

      return data.reduce(
        (acc, setting) => {
          acc[setting.key] = parseSystemSettingNumber(setting.key, setting.value);
          return acc;
        },
        {} as Record<string, number>
      );
    },
  });
}
