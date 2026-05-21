import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listForYouCatalogModels } from "@/services/catalog/catalog-models-service";

export function useForYouModels(params: {
  userId: string | null | undefined;
  needle: string;
  likedIds: Set<string>;
  profilePreferenceTags: unknown;
  profileLoading: boolean;
}) {
  const { userId, needle, likedIds, profilePreferenceTags, profileLoading } = params;

  const preferenceTags = useMemo(() => {
    const tags = (Array.isArray(profilePreferenceTags) ? profilePreferenceTags : []) as unknown[];
    return new Set(
      (tags ?? []).map((tag) => String(tag).trim().toLocaleLowerCase()).filter(Boolean),
    );
  }, [profilePreferenceTags]);

  const preferenceTagKey = useMemo(
    () => Array.from(preferenceTags).sort().join("|"),
    [preferenceTags],
  );

  const likedIdsKey = useMemo(
    () => Array.from(likedIds).sort().slice(0, 50).join("|"),
    [likedIds],
  );

  const query = useQuery({
    queryKey: ["models_for_you", { userId: userId ?? null, preferenceTagKey, likedIdsKey }],
    enabled: Boolean(userId) && !needle && !profileLoading,
    queryFn: () =>
      listForYouCatalogModels({
        excludedIds: Array.from(likedIds),
        preferenceTags,
      }),
    staleTime: 15_000,
  });

  return { ...query, preferenceTags, preferenceTagKey };
}
