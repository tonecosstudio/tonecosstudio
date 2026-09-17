import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminQuotes,
  updateQuoteStatus,
} from "@/services/admin/config/admin-quotes-service";

export function useAdminQuotesData() {
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: fetchAdminQuotes,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });

  return { quotesQuery, updateStatusMutation };
}
