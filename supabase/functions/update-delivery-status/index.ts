import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, toUTC } from "../_shared/timezone.ts";

/**
 * Edge Function: update-delivery-status
 * 
 * Atualiza o status de uma entrega com validação de transições,
 * registro de ações do admin e envio de notificações ao assinante.
 * 
 * Estados válidos de entrega:
 * - scheduled (Agendado)
 * - pending_choice (Aguardando Escolha)
 * - confirmed (Confirmado)
 * - in_production (Em Produção)
 * - shipped (Enviado)
 * - delivered (Entregue)
 * 
 * Máquina de estados:
 * scheduled → pending_choice → confirmed → in_production → shipped → delivered
 * 
 * Requirements: 15.3, 33.6
 * Task: 21.4
 */

type DeliveryStatus = 
  | 'scheduled'
  | 'pending_choice'
  | 'confirmed'
  | 'in_production'
  | 'shipped'
  | 'delivered';

interface UpdateDeliveryStatusRequest {
  deliveryId: string;
  newStatus: DeliveryStatus;
  trackingCode?: string;
  notes?: string;
}

interface AdminActionLog {
  delivery_id: string;
  admin_user_id: string;
  action_type: string;
  previous_status: string;
  new_status: string;
  notes: string | null;
  created_at: string;
}

/**
 * Valida formato do código de rastreamento brasileiro
 * Formato: 2 letras + 9 números + 2 letras (ex: BR123456789BR)
 */
function validateTrackingCode(code: string): boolean {
  if (!code) return true; // Código vazio é válido (opcional)
  const trackingRegex = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
  return trackingRegex.test(code);
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
  // Criar tabela de logs se não existir (será criada via migration)
  const logEntry: Partial<AdminActionLog> = {
    delivery_id: deliveryId,
    admin_user_id: adminUserId,
    action_type: 'status_update',
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
    // Não falhar a operação se o log falhar
  }
}

/**
 * Envia notificação ao assinante sobre mudança de status ou adição de código de rastreamento
 */
async function notifySubscriber(
  service: any,
  deliveryId: string,
  newStatus: string,
  trackingCode?: string,
  trackingCodeAdded?: boolean
): Promise<void> {
  // Buscar informações da entrega e do assinante
  const { data: delivery, error: deliveryError } = await service
    .from('subscription_deliveries')
    .select(`
      id,
      delivery_number,
      subscriptions (
        user_id,
        profiles (
          email,
          full_name
        )
      ),
      collections (
        name
      )
    `)
    .eq('id', deliveryId)
    .single();

  if (deliveryError || !delivery) {
    console.error('Erro ao buscar entrega para notificação:', deliveryError);
    return;
  }

  // Preparar mensagem baseada no status ou adição de tracking
  let subject = '';
  let message = '';
  
  // Se código de rastreamento foi adicionado, enviar notificação específica
  if (trackingCodeAdded && trackingCode) {
    subject = 'Código de rastreamento disponível!';
    message = `Olá ${delivery.subscriptions.profiles.full_name},\n\nO código de rastreamento da sua entrega #${delivery.delivery_number} (${delivery.collections.name}) está disponível!\n\nCódigo: ${trackingCode}\n\nRastreie seu pedido em: https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${trackingCode}`;
  } else {
    // Mensagens baseadas no status
    switch (newStatus) {
      case 'confirmed':
        subject = 'Sua escolha foi confirmada!';
        message = `Olá ${delivery.subscriptions.profiles.full_name},\n\nSua escolha da coleção "${delivery.collections.name}" para a entrega #${delivery.delivery_number} foi confirmada e entrará em produção em breve.`;
        break;
      case 'in_production':
        subject = 'Sua peça entrou em produção!';
        message = `Olá ${delivery.subscriptions.profiles.full_name},\n\nSua peça da coleção "${delivery.collections.name}" (entrega #${delivery.delivery_number}) entrou em produção!`;
        break;
      case 'shipped':
        subject = 'Sua peça foi enviada!';
        message = `Olá ${delivery.subscriptions.profiles.full_name},\n\nSua peça da coleção "${delivery.collections.name}" (entrega #${delivery.delivery_number}) foi enviada!${trackingCode ? `\n\nCódigo de rastreamento: ${trackingCode}\n\nRastreie seu pedido em: https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${trackingCode}` : ''}`;
        break;
      case 'delivered':
        subject = 'Sua peça foi entregue!';
        message = `Olá ${delivery.subscriptions.profiles.full_name},\n\nSua peça da coleção "${delivery.collections.name}" (entrega #${delivery.delivery_number}) foi entregue! Esperamos que você goste!`;
        break;
      default:
        // Não enviar notificação para outros status
        return;
    }
  }

  // Enviar email (placeholder - será implementado na Fase 6)
  console.log(`[NOTIFICAÇÃO] Para: ${delivery.subscriptions.profiles.email}`);
  console.log(`[NOTIFICAÇÃO] Assunto: ${subject}`);
  console.log(`[NOTIFICAÇÃO] Mensagem: ${message}`);
  
  // TODO: Integrar com serviço de email quando implementado
  // await sendEmail(delivery.subscriptions.profiles.email, subject, message);
}

/**
 * Atualiza o status de uma entrega
 */
async function updateDeliveryStatus(
  service: any,
  deliveryId: string,
  newStatus: DeliveryStatus,
  adminUserId: string,
  trackingCode?: string,
  notes?: string
): Promise<any> {
  // Buscar entrega atual
  const { data: delivery, error: deliveryError } = await service
    .from('subscription_deliveries')
    .select('id, status, tracking_code, subscription_id')
    .eq('id', deliveryId)
    .single();

  if (deliveryError || !delivery) {
    throw new Error('Entrega não encontrada');
  }

  const currentStatus = delivery.status;
  const previousTrackingCode = delivery.tracking_code;

  // Validar transição de status
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(
      `Transição de status inválida: ${currentStatus} → ${newStatus}. ` +
      `Transições válidas seguem a máquina de estados: ` +
      `scheduled → pending_choice → confirmed → in_production → shipped → delivered`
    );
  }

  // Preparar dados de atualização
  const updateData: any = {
    status: newStatus,
    updated_at: toUTC(nowInBahia()).toISOString(),
  };

  // Adicionar código de rastreamento se fornecido
  if (trackingCode) {
    updateData.tracking_code = trackingCode;
  }

  // Adicionar timestamps específicos baseado no status
  if (newStatus === 'shipped') {
    updateData.shipped_at = toUTC(nowInBahia()).toISOString();
  } else if (newStatus === 'delivered') {
    updateData.actual_delivery_date = toUTC(nowInBahia()).toISOString();
  }

  // Atualizar entrega
  const { data: updatedDelivery, error: updateError } = await service
    .from('subscription_deliveries')
    .update(updateData)
    .eq('id', deliveryId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Erro ao atualizar status: ${updateError.message}`);
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

  // Detectar se código de rastreamento foi adicionado
  const trackingCodeAdded = !previousTrackingCode && trackingCode;

  // Enviar notificação ao assinante
  await notifySubscriber(service, deliveryId, newStatus, trackingCode, !!trackingCodeAdded);

  return updatedDelivery;
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Verificar se é admin e obter user ID
    const adminUser = await assertAdmin(req);
    const adminUserId = adminUser.userId;

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as UpdateDeliveryStatusRequest;

    const { deliveryId, newStatus, trackingCode, notes } = body;

    // Validar entrada
    if (!deliveryId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "deliveryId e newStatus são obrigatórios" }),
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

    // Validar código de rastreamento se fornecido
    if (trackingCode && !validateTrackingCode(trackingCode)) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de código de rastreamento inválido. Use o formato: 2 letras + 9 números + 2 letras (ex: BR123456789BR)' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Atualizar status
    const updatedDelivery = await updateDeliveryStatus(
      service,
      deliveryId,
      newStatus,
      adminUserId,
      trackingCode,
      notes
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Status da entrega atualizado para: ${newStatus}`,
        delivery: updatedDelivery,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in update-delivery-status:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
