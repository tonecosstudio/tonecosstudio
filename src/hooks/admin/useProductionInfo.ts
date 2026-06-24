import { useQuery } from "@tanstack/react-query";
import {
  fetchCharacterChoiceInfo,
  fetchProductionInfo,
  type CharacterChoiceInfo,
  type ProductionInfo,
  type ProductionOrderType,
} from "@/services/admin/production/admin-production-info-service";

export type {
  CharacterChoiceInfo,
  ProductionInfo,
  ProductionOrderType,
} from "@/services/admin/production/admin-production-info-service";

export function useProductionInfo(
  orderId: string | null,
  orderType: ProductionOrderType | null,
) {
  return useQuery({
    queryKey: ["production-info", orderId, orderType],
    queryFn: (): Promise<ProductionInfo | null> => fetchProductionInfo(orderId, orderType),
    enabled: Boolean(orderId && orderType),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useCharacterChoice(
  orderId: string | null,
  orderType: ProductionOrderType | null,
) {
  return useQuery({
    queryKey: ["character-choice", orderId, orderType],
    queryFn: (): Promise<CharacterChoiceInfo | null> =>
      fetchCharacterChoiceInfo(orderId, orderType),
    enabled: Boolean(orderId && orderType),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}
