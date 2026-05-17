import { useMutation } from "@tanstack/react-query";
import { approveChoice, rejectChoice, type CharacterChoice } from "@/services/admin/choice-service";

export type { CharacterChoice };

export function useApproveChoice() {
  return useMutation({
    mutationFn: (choiceId: string) => approveChoice(choiceId),
  });
}

export function useRejectChoice() {
  return useMutation({
    mutationFn: ({ choiceId, reason }: { choiceId: string; reason: string }) =>
      rejectChoice(choiceId, reason),
  });
}
