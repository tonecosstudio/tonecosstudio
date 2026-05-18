import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveChoiceCollections,
  type ChoiceCollectionFilterOption,
} from "@/services/admin/choice-service";

export type { ChoiceCollectionFilterOption };

export function useChoiceCollections() {
  return useQuery({
    queryKey: ["collections-for-choice-filters"],
    queryFn: fetchActiveChoiceCollections,
  });
}

