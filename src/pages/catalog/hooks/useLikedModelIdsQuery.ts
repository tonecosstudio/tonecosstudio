import { useQuery } from "@tanstack/react-query";
import { listLikedModelIds } from "@/lib/model-likes";

export function useLikedModelIdsQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["model_likes", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return new Set<string>();
      return listLikedModelIds(userId);
    },
    staleTime: 30_000,
  });
}
