import { useQuery } from "@tanstack/react-query";
import {
  getCharacterDetailsById,
  getCollectionDetailsBySlug,
  listArcadeCollectionsWithCounts,
  listActiveCollectionPreviews,
  listCollectionsWithCharacters,
  listRelatedCharacters,
  listReleasedCatalogCharacters,
  listShowcaseCollections,
  type ArcadeCatalogCharacter,
  type ArcadeCollection,
} from "@/services/collections/public-collections-service";

export type {
  ArcadeCatalogCharacter,
  ArcadeCollection,
  CharacterDetailsData,
  CharacterSelectCharacter,
  CharacterSelectCollection,
  CollectionDetails,
  CollectionDetailsCharacter,
  PublicCollectionPreview,
  RelatedCharacter,
  ShowcaseCollection,
} from "@/services/collections/public-collections-service";

export type CatalogCharacterGroup = {
  name: string;
  order: number;
  characters: ArcadeCatalogCharacter[];
};

function groupCatalogCharacters(characters: ArcadeCatalogCharacter[]): CatalogCharacterGroup[] {
  const grouped = characters.reduce<Record<string, CatalogCharacterGroup>>((acc, character) => {
    const category = character.price_category_display_name || "Outros";

    if (!acc[category]) {
      acc[category] = {
        name: category,
        order: character.price_category_order ?? 999,
        characters: [],
      };
    }

    acc[category].characters.push(character);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.order - b.order);
}

export function useArcadeCollections() {
  return useQuery<ArcadeCollection[]>({
    queryKey: ["collections-arcade"],
    queryFn: listArcadeCollectionsWithCounts,
  });
}

export function useReleasedCatalogCharacterGroups() {
  return useQuery<CatalogCharacterGroup[]>({
    queryKey: ["catalog-characters"],
    queryFn: async () => groupCatalogCharacters(await listReleasedCatalogCharacters()),
  });
}

export function useCollectionDetails(slug?: string) {
  return useQuery({
    queryKey: ["collection-details-arcade", slug],
    queryFn: () => getCollectionDetailsBySlug(slug as string),
    enabled: !!slug,
  });
}

export function useCollectionsWithCharacters() {
  return useQuery({
    queryKey: ["collections-with-characters"],
    queryFn: listCollectionsWithCharacters,
  });
}

export function useCharacterDetails(characterId?: string) {
  return useQuery({
    queryKey: ["character-details-arcade", characterId],
    queryFn: () => getCharacterDetailsById(characterId as string),
    enabled: !!characterId,
  });
}

export function useRelatedCharacters(collectionId?: string, characterId?: string) {
  return useQuery({
    queryKey: ["related-characters", collectionId, characterId],
    queryFn: () => listRelatedCharacters(collectionId as string, characterId as string),
    enabled: !!collectionId && !!characterId,
  });
}

export function useShowcaseCollections() {
  return useQuery({
    queryKey: ["collections-showcase"],
    queryFn: listShowcaseCollections,
  });
}

export function useActiveCollectionPreviews(limit?: number) {
  return useQuery({
    queryKey: ["collections-active", limit],
    queryFn: () => listActiveCollectionPreviews(limit),
  });
}
