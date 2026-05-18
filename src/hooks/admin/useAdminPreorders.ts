import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminPreorders,
  fetchAdminPreordersStats,
  registerAdminPreorderManualPayment,
  releaseAdminPreorderFinalPayment,
} from "@/services/admin/admin-preorders-service";

export function useAdminPreordersData() {
  const preordersQuery = useQuery({
    queryKey: ["admin-preorders"],
    queryFn: fetchAdminPreorders,
  });

  const statsQuery = useQuery({
    queryKey: ["admin-preorders-stats"],
    queryFn: fetchAdminPreordersStats,
  });

  return {
    preorders: preordersQuery.data || [],
    stats: statsQuery.data,
    preordersQuery,
    statsQuery,
  };
}

export function useReleaseAdminPreorderFinalPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: releaseAdminPreorderFinalPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preorders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-preorders-stats"] });
    },
  });
}

export function useRegisterAdminPreorderManualPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerAdminPreorderManualPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preorders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-preorders-stats"] });
    },
  });
}
