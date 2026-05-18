import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliveryChangeHistory,
  fetchDeliveryDetail,
  fetchSubscriberAddress,
  updateDeliveryStatus,
  type UpdateDeliveryStatusInput,
} from '@/services/admin/delivery-detail-service';

export function useDeliveryDetail(deliveryId: string | null, open: boolean) {
  return useQuery({
    queryKey: ['delivery-detail', deliveryId],
    queryFn: () => (deliveryId ? fetchDeliveryDetail(deliveryId) : null),
    enabled: !!deliveryId && open,
  });
}

export function useSubscriberAddress(userId: string | undefined, open: boolean) {
  return useQuery({
    queryKey: ['subscriber-address', userId],
    queryFn: () => (userId ? fetchSubscriberAddress(userId) : null),
    enabled: !!userId && open,
  });
}

export function useDeliveryChangeHistory(deliveryId: string | null, open: boolean) {
  return useQuery({
    queryKey: ['collection-change-history', deliveryId],
    queryFn: () => (deliveryId ? fetchDeliveryChangeHistory(deliveryId) : []),
    enabled: !!deliveryId && open,
  });
}

export function useUpdateDeliveryStatus(deliveryId: string | null, onSuccess: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeliveryStatusInput) => updateDeliveryStatus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-detail', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      onSuccess();
    },
  });
}
