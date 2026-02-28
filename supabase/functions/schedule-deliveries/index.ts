import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, toUTC } from "../_shared/timezone.ts";

/**
 * Edge Function: schedule-deliveries
 * 
 * Gerencia agendamento e reagendamento manual de entregas.
 * Permite que administradores:
 * - Reagendem entregas para outros ciclos
 * - Atualizem status de entregas
 * - Troquem personagens de entregas (se ciclo permitir)
 * 
 * Feature: premium-club-fixed-price-model
 * Task: 3.10
 */

type DeliveryStatus = 
  | 'scheduled'
  | 'pending_production'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

interface ScheduleDeliveriesRequest {
  action: 'reschedule' | 'update_status' | 'change_character';
  deliveryId: string;
  cycleId?: string;
  status?: DeliveryStatus;
  characterId?: string;
  trackingCode?: string;
}

interface CycleData {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  status: string;
  shipping_date: string;
}

interface DeliveryData {
  id: string;
  subscription_id: string;
  cycle_id: string;
  character_id: string | null;
  delivery_number: number;
  status: DeliveryStatus;
  scheduled_date: string | null;
}

/**
 * Verifica se o ciclo permite alterações
 */
async function canModifyDelivery(service: any, cycleId: string): Promise<boolean> {
  const { data: cycle, error } = await service
    .from('cycles')
    .select('status')
    .eq('id', cycleId)
    .single();
  
  if (error) {
    throw new Error(`Erro ao verificar ciclo: ${error.message}`);
  }
  
  // Apenas ciclos "open" permitem modificações
  return cycle.status === 'open';
}

/**
 * Reagenda uma entrega para outro ciclo
 */
async function rescheduleDelivery(
  service: any,
  deliveryId: string,
  newCycleId: string
): Promise<void> {
  // Buscar novo ciclo
  const { data: newCycle, error: cycleError } = await service
    .from('cycles')
    .select('id, shipping_date, status')
    .eq('id', newCycleId)
    .single();
  
  if (cycleError) throw cycleError;
  if (!newCycle) {
    throw new Error('Ciclo de destino não encontrado');
  }
  
  // Verificar se o novo ciclo permite modificações
  const canModify = await canModifyDelivery(service, newCycleId);
  if (!canModify) {
    throw new Error(
      'O ciclo de destino não está aberto para modificações. ' +
      'Apenas ciclos com status "open" permitem reagendamento.'
    );
  }
  
  // Atualizar entrega
  const { error: updateError } = await service
    .from('subscription_deliveries')
    .update({
      cycle_id: newCycleId,
      scheduled_date: newCycle.shipping_date,
    })
    .eq('id', deliveryId);
  
  if (updateError) {
    throw new Error(`Erro ao reagendar entrega: ${updateError.message}`);
  }
}

/**
 * Atualiza o status de uma entrega
 */
async function updateDeliveryStatus(
  service: any,
  deliveryId: string,
  status: DeliveryStatus,
  trackingCode?: string
): Promise<void> {
  const updateData: any = {
    status,
    status_changed_at: toUTC(nowInBahia()).toISOString(),
  };
  
  // Adicionar timestamps específicos baseado no status
  if (status === 'shipped') {
    updateData.shipped_at = toUTC(nowInBahia()).toISOString();
    if (trackingCode) {
      updateData.tracking_code = trackingCode;
    }
  } else if (status === 'delivered') {
    updateData.delivered_at = toUTC(nowInBahia()).toISOString();
  }
  
  const { error } = await service
    .from('subscription_deliveries')
    .update(updateData)
    .eq('id', deliveryId);
  
  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`);
  }
}

/**
 * Troca o personagem de uma entrega
 */
async function changeCharacter(
  service: any,
  deliveryId: string,
  newCharacterId: string
): Promise<void> {
  // Buscar entrega
  const { data: delivery, error: deliveryError } = await service
    .from('subscription_deliveries')
    .select('cycle_id')
    .eq('id', deliveryId)
    .single();
  
  if (deliveryError) throw deliveryError;
  if (!delivery) {
    throw new Error('Entrega não encontrada');
  }
  
  // Verificar se o ciclo permite modificações
  const canModify = await canModifyDelivery(service, delivery.cycle_id);
  if (!canModify) {
    throw new Error(
      'Não é possível trocar o personagem. ' +
      'O ciclo já está em produção ou foi encerrado.'
    );
  }
  
  // Verificar se o personagem existe
  const { data: character, error: characterError } = await service
    .from('collection_characters')
    .select('id')
    .eq('id', newCharacterId)
    .single();
  
  if (characterError || !character) {
    throw new Error('Personagem não encontrado');
  }
  
  // Atualizar entrega
  const { error: updateError } = await service
    .from('subscription_deliveries')
    .update({ character_id: newCharacterId })
    .eq('id', deliveryId);
  
  if (updateError) {
    throw new Error(`Erro ao trocar personagem: ${updateError.message}`);
  }
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Verificar se é admin
    await assertAdmin(req);

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as ScheduleDeliveriesRequest;

    const { action, deliveryId } = body;

    // Validar entrada
    if (!action || !deliveryId) {
      return new Response(
        JSON.stringify({ error: "action e deliveryId são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verificar se a entrega existe
    const { data: delivery, error: deliveryError } = await service
      .from('subscription_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return new Response(
        JSON.stringify({ error: "Entrega não encontrada" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Executar ação
    switch (action) {
      case 'reschedule':
        if (!body.cycleId) {
          return new Response(
            JSON.stringify({ error: "cycleId é obrigatório para reagendamento" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        await rescheduleDelivery(service, deliveryId, body.cycleId);
        break;

      case 'update_status':
        if (!body.status) {
          return new Response(
            JSON.stringify({ error: "status é obrigatório para atualização" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        await updateDeliveryStatus(service, deliveryId, body.status, body.trackingCode);
        break;

      case 'change_character':
        if (!body.characterId) {
          return new Response(
            JSON.stringify({ error: "characterId é obrigatório para troca de personagem" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        await changeCharacter(service, deliveryId, body.characterId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida. Use: reschedule, update_status ou change_character" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    // Buscar entrega atualizada
    const { data: updatedDelivery } = await service
      .from('subscription_deliveries')
      .select(`
        *,
        cycle:cycles(cycle_number, month, year, shipping_date, status)
      `)
      .eq('id', deliveryId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Entrega ${action === 'reschedule' ? 'reagendada' : action === 'update_status' ? 'atualizada' : 'modificada'} com sucesso`,
        delivery: updatedDelivery,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in schedule-deliveries:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
