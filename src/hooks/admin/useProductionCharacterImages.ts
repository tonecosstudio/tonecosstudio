import { useQuery } from "@tanstack/react-query";
import { fetchProductionCharacterImages } from "@/services/admin/production-character-images-service";

export function useProductionCharacterImages(characterIds: string[]) {
  return useQuery({
    queryKey: ["production", "character-images", characterIds],
    queryFn: () => fetchProductionCharacterImages(characterIds),
    enabled: characterIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
