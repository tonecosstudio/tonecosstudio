import { useQuery } from "@tanstack/react-query";
import { fetchPendingChoices, type ChoiceFilters } from "@/services/admin/choices/choice-service";

export type { ChoiceFilters };

export function useCharacterChoicesData(filters: ChoiceFilters, searchQuery: string) {
  return useQuery({
    queryKey: ["character-choices", filters, searchQuery],
    queryFn: () => fetchPendingChoices({ ...filters, searchQuery }),
  });
}
