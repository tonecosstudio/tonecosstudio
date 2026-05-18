import { useQuery } from "@tanstack/react-query";
import { getMyChoice, type CharacterChoice } from "@/services/customer/choice-service";

export type CharacterChoiceEntity = CharacterChoice;

export function useCharacterChoice(orderId: string) {
  return useQuery({
    queryKey: ["character-choice", orderId],
    queryFn: () => getMyChoice(orderId),
    retry: 1,
    enabled: Boolean(orderId),
  });
}
