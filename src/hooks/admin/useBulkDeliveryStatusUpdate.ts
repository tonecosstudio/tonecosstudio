import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type BulkDeliveryStatusUpdateInput,
  type BulkUpdateResult,
  updateBulkDeliveryStatus,
} from '@/services/admin/bulk-delivery-status-update-service';

export function useBulkDeliveryStatusUpdate(onSuccess?: (result: BulkUpdateResult) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkDeliveryStatusUpdateInput) => updateBulkDeliveryStatus(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      onSuccess?.(result);
    },
  });
}
