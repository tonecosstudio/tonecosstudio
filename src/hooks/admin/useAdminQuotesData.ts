import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminQuoteItems,
  fetchAdminQuoteModels,
  fetchAdminQuotes,
} from "@/services/admin/admin-quotes-service";

export function useAdminQuotesData() {
  const quotesQuery = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: fetchAdminQuotes,
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-quote-items", quotesQuery.data?.map((q) => q.id) ?? []],
    enabled: (quotesQuery.data ?? []).length > 0,
    queryFn: async () => fetchAdminQuoteItems((quotesQuery.data ?? []).map((q) => q.id)),
  });

  const modelsQuery = useQuery({
    queryKey: ["admin-quote-models", itemsQuery.data?.map((i) => i.model_id) ?? []],
    enabled: (itemsQuery.data ?? []).length > 0,
    queryFn: async () =>
      fetchAdminQuoteModels(Array.from(new Set((itemsQuery.data ?? []).map((i) => i.model_id)))),
  });

  return { quotesQuery, itemsQuery, modelsQuery };
}

