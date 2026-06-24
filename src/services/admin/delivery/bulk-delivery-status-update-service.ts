import { callAuthenticatedEdgeFunction } from '@/services/supabase/edge-function-client';
import type { SubscriptionDeliveryStatus } from '@/types/admin/orders';

export interface BulkUpdateResult {
  success: boolean;
  message: string;
  successCount: number;
  failureCount: number;
  results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BulkDeliveryStatusUpdateInput {
  deliveryIds: string[];
  newStatus: SubscriptionDeliveryStatus;
  notes?: string;
}

export async function updateBulkDeliveryStatus(
  input: BulkDeliveryStatusUpdateInput
): Promise<BulkUpdateResult> {
  return callAuthenticatedEdgeFunction(
    'bulk-update-delivery-status',
    input,
    'Erro ao atualizar entregas',
  );
}
