import { useQuery } from "@tanstack/react-query";
import * as adminCollectionsService from "@/services/admin/catalog/admin-collections-service";

export function useAdminCollectionsData(selectedCollection: string | null) {
  const collectionsQuery = useQuery({
    queryKey: ["admin-collections-v2"],
    queryFn: adminCollectionsService.fetchCollectionsWithCharacterCount,
  });

  const charactersQuery = useQuery({
    queryKey: ["admin-characters-v2", selectedCollection],
    enabled: Boolean(selectedCollection),
    queryFn: async () => {
      if (!selectedCollection) return [];
      return adminCollectionsService.fetchCharactersByCollection(selectedCollection);
    },
  });

  const collections = collectionsQuery.data || [];
  const characters = charactersQuery.data || [];
  const selectedCollectionData = collections.find((c: { id: string }) => c.id === selectedCollection);

  return {
    collectionsQuery,
    charactersQuery,
    collections,
    characters,
    selectedCollectionData,
  };
}
