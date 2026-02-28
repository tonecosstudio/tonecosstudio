import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, toUTC } from "../_shared/timezone.ts";

/**
 * Edge Function: bulk-update-delivery-status
 * 
 * Atualiza o status de múltiplas entregas em uma única operação.
 * Retorna contagem de sucessos e falhas para feedback ao admin.
 * 
 * Requirements: 15.9
 * Task: 21.7
 */

type DeliveryStatus = 
  | 'scheduled'
  | 'pending_choice'
  | 'confirmed'
  | 'in_production'
  | 'shipped'
  | 'delivered';

interface BulkUpdateRequest {
  deliveryIds: string[];
  newStatus: DeliveryStatus;
  notes?: string;
}

interface BulkUpdateResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Valida se a transição de status é permitida
 */
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'scheduled': ['pending_choice'],
    'pending_choice': ['confirmed'],
    'confirmed': ['in_production'],
    'in_production': ['shipped'],
    'shipped': ['delivered'],
    'delivered': [], // Estado final
  };

  // Permitir que admin possa voltar um status (para correções)
  const reverseTransitions: Record<string, string[]> = {
    'pending_choice': ['scheduled'],
    'confirmed': ['pending_choice'],
    'in_production': ['confirmed'],
    'shipped': ['in_production'],
    'delivered': ['shipped'],
  };

  const allowedForward = validTransitions[currentStatus] || [];
  const allowedBackward = reverseTransitions[currentStatus] || [];
  
  return allowedForward.includes(newStatus) || allowedBackward.includes(newStatus);
}

/**
 * Registra a ação do admin em uma tabela de logs
 */
async function logAdminAction(
  service: any,
  deliveryId: string,
  adminUserId: string,
  previousStatus: string,
  newStatus: string,
  notes: string | null
): Promise<void> {
  const logEntry = {
    delivery_id: deliveryId,
    admin_user_id: adminUserId,
    action_type: 'bulk_status_update',
    previous_status: previousStatus,
    new_status: newStatus,
    notes: notes,
    created_at: toUTC(nowInBahia()).toISOString(),
  };

  const { error } = await service
    .from('admin_action_logs')
    .insert(logEntry);

  if (error) {
    console.error('Erro ao registrar ação do admin:', error);
  }
}

/**
 * Atualiza o status de uma única entrega (usado internamente pelo bulk update)
 */
async function updateSingleDelivery(
  service: any,
  deliveryId: string,
  newStatus: DeliveryStatus,
  adminUserId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar entrega atual
    const { data: delivery, error: deliveryError } = await service
      .from('subscription_deliveries')
      .select('id, status')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return { success: false, error: 'Entrega não encontrada' };
    }

    const currentStatus = delivery.status;

    // Validar transição de status
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return { 
        success: false, 
        error: `Transição inválida: ${currentStatus} → ${newStatus}` 
      };
    }

    // Preparar dados de atualização
    const updateData: any = {
      status: newStatus,
      updated_at: toUTC(nowInBahia()).toISOString(),
    };

    // Adicionar timestamps específicos baseado no status
    if (newStatus === 'shipped') {
      updateData.shipped_at = toUTC(nowInBahia()).toISOString();
    } else if (newStatus === 'delivered') {
      updateData.actual_delivery_date = toUTC(nowInBahia()).toISOString();
    }

    // Atualizar entrega
    const { error: updateError } = await service
      .from('subscription_deliveries')
      .update(updateData)
      .eq('id', deliveryId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Registrar ação do admin
    await logAdminAction(
      service,
      deliveryId,
      adminUserId,
      currentStatus,
      newStatus,
      notes || null
    );

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

/**
 * Processa atualização em massa de entregas
 */
async function bulkUpdateDeliveryStatus(
  service: any,
  deliveryIds: string[],
  newStatus: DeliveryStatus,
  adminUserId: string,
  notes?: string
): Promise<BulkUpdateResult> {
  const results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }> = [];

  let successCount = 0;
  let failureCount = 0;

  // Processar cada entrega
  for (const deliveryId of deliveryIds) {
    const result = await updateSingleDelivery(
      service,
      deliveryId,
      newStatus,
      adminUserId,
      notes
    );

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    results.push({
      deliveryId,
      success: result.success,
      error: result.error,
    });
  }

  return {
    success: failureCount === 0,
    successCount,
    failureCount,
    results,
  };
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Verificar se é admin e obter user ID
    const adminUser = await assertAdmin(req);
    const adminUserId = adminUser.userId;

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as BulkUpdateRequest;

    const { deliveryIds, newStatus, notes } = body;

    // Validar entrada
    if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "deliveryIds deve ser um array não vazio" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!newStatus) {
      return new Response(
        JSON.stringify({ error: "newStatus é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validar status
    const validStatuses: DeliveryStatus[] = [
      'scheduled',
      'pending_choice',
      'confirmed',
      'in_production',
      'shipped',
      'delivered'
    ];

    if (!validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ 
          error: `Status inválido. Status válidos: ${validStatuses.join(', ')}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limitar número de entregas por operação (evitar timeout)
    if (deliveryIds.length > 100) {
      return new Response(
        JSON.stringify({ 
          error: 'Máximo de 100 entregas por operação. Por favor, selecione menos entregas.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Processar atualização em massa
    const result = await bulkUpdateDeliveryStatus(
      service,
      deliveryIds,
      newStatus,
      adminUserId,
      notes
    );

    return new Response(
      JSON.stringify({
        success: result.success,
        message: `Atualização concluída: ${result.successCount} sucesso(s), ${result.failureCount} falha(s)`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: result.results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in bulk-update-delivery-status:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
