import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminQuoteItems,
  fetchAdminQuotes,
  updateQuoteStatus,
} from "@/services/admin/admin-quotes-service";
import type { ModelMini, QuoteItemRow } from "@/services/admin/admin-quotes-service";

export type { ModelMini, QuoteItemRow };

export function useAdminQuotesData() {
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: fetchAdminQuotes,
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-quote-items", quotesQuery.data?.map((q) => q.id) ?? []],
    enabled: (quotesQuery.data ?? []).length > 0,
    queryFn: async () => fetchAdminQuoteItems((quotesQuery.data ?? []).map((q) => q.id)),
  });

  const modelsQuery = useQuery<ModelMini[]>({
    queryKey: ["admin-quote-models"],
    enabled: false,
    queryFn: async () => [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });

  return { quotesQuery, itemsQuery, modelsQuery, updateStatusMutation };
}
