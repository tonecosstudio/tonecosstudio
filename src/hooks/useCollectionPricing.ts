// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollectionPricing {
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  remaining_full: number;
  remaining_pix: number;
  is_custom: boolean;
}

export function useCollectionPricing(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-pricing", collectionId],
    queryFn: async () => {
      if (!collectionId) {
        throw new Error("Collection ID is required");
      }

      const { data, error } = await supabase
        .rpc("get_collection_pricing", { p_collection_id: collectionId });

      if (error) throw error;
      
      // RPC retorna array, pegar primeiro item
      return data?.[0] as CollectionPricing;
    },
    enabled: !!collectionId,
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

      return data.reduce((acc, setting) => {
        acc[setting.key] = parseFloat(setting.value);
        return acc;
      }, {} as Record<string, number>);
    },
  });
}
