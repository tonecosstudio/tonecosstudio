import { supabase } from '@/integrations/supabase/client';

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
  newStatus: string;
  notes?: string;
}

export async function updateBulkDeliveryStatus(
  input: BulkDeliveryStatusUpdateInput
): Promise<BulkUpdateResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('Não autenticado');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-update-delivery-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar entregas');
  }

  return (await response.json()) as BulkUpdateResult;
}
