import { useMutation, useQuery } from "@tanstack/react-query";
import {
  changeCharacterChoice,
  getAvailableCharacters,
  submitCharacterChoice,
} from "@/services/customer/choice-service";
import type { Character } from "@/services/customer/choice-service";

export type CharacterEntity = Character;

export function useAvailableCharacters(collectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["available-characters", collectionId],
    queryFn: () => getAvailableCharacters(collectionId),
    enabled: enabled && Boolean(collectionId),
  });
}

export function useSubmitCharacterChoice(orderId: string) {
  return useMutation({
    mutationFn: (characterId: string) => submitCharacterChoice(orderId, characterId),
  });
}

export function submitCharacterChoiceAction(orderId: string, characterId: string) {
  return submitCharacterChoice(orderId, characterId);
}

export function getAvailableCharactersAction(collectionId: string) {
  return getAvailableCharacters(collectionId);
}

export function changeCharacterChoiceAction(
  choiceId: string,
  characterId: string,
  reason: string,
) {
  return changeCharacterChoice(choiceId, characterId, reason);
}

export function useChangeCharacterChoice(choiceId: string) {
  return useMutation({
    mutationFn: ({ characterId, reason }: { characterId: string; reason: string }) =>
      changeCharacterChoice(choiceId, characterId, reason),
  });
}
