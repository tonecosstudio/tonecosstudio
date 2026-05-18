import { useQuery } from "@tanstack/react-query";
import {
  fetchAlternativeCharacters,
  fetchCharacterStock,
} from "@/services/admin/choice-approval-modal-service";

export function useCharacterStock(characterId?: string, enabled = true) {
  return useQuery({
    queryKey: ["character-stock", characterId],
    queryFn: () => fetchCharacterStock(characterId as string),
    enabled: enabled && !!characterId,
  });
}

export function useAlternativeCharacters(input: {
  collectionId?: string;
  characterId?: string | null;
  enabled?: boolean;
}) {
  const { collectionId, characterId, enabled = true } = input;

  return useQuery({
    queryKey: ["alternative-characters", collectionId, characterId],
    queryFn: () =>
      fetchAlternativeCharacters({
        collectionId: collectionId as string,
        characterId,
      }),
    enabled: enabled && !!collectionId,
  });
}
