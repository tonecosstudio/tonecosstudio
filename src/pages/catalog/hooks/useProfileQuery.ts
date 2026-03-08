import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/profile";

export function useProfileQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", { userId: userId ?? null }],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      return getMyProfile(userId);
    },
    staleTime: 30_000,
  });
}
