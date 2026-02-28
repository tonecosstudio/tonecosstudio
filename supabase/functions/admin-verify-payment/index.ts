/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, toUTC } from "../_shared/timezone.ts";

/**
 * Edge Function: admin-verify-payment
 * 
 * Allows admins to approve or reject payment vouchers uploaded by customers.
 * When approved, the order status is updated to 'paid'.
 * When rejected, a notification is sent to the customer with the rejection reason.
 * All verification actions are logged with the admin user ID and timestamp for audit purposes.
 * 
 * Requirements: 25.7, 25.8, 33.6
 * Task: 25.5
 */

interface VerifyPaymentRequest {
  orderId: string;
  orderType: 'subscription' | 'standalone_purchase';
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}

interface AdminActionLog {
  admin_user_id: string;
  action_type: string;
  previous_status: string;
  new_status: string;
  notes: string | null;
  created_at: string;
}

/**
 * Logs admin verification action for audit trail
 */
async function logVerificationAction(
  service: any,
  orderId: string,
  orderType: 'subscription' | 'standalone_purchase',
  adminUserId: string,
  approved: boolean,
  previousStatus: string,
  newStatus: string,
  notes: string | null
): Promise<void> {
  const actionType = approved ? 
    (orderType === 'subscription' ? 'approve_payment_voucher' : 'approve_deposit_voucher') :
    (orderType === 'subscription' ? 'reject_payment_voucher' : 'reject_deposit_voucher');

  if (orderType === 'standalone_purchase') {
    // Log to standalone_purchase_admin_log
    const { error } = await service
      .from('standalone_purchase_admin_log')
      .insert({
        purchase_id: orderId,
        admin_user_id: adminUserId,
        action_type: actionType,
        previous_status: previousStatus,
        new_status: newStatus,
        notes: notes,
        created_at: toUTC(nowInBahia()).toISOString(),
      });

    if (error) {
      console.error('Error logging standalone purchase admin action:', error);
    }
  } else {
    // For subscriptions, we could create a similar log table or use a general admin_action_logs
    // For now, we'll log to console and could extend to a subscription_admin_log table
    console.log(`[ADMIN ACTION LOG] Subscription ${orderId}:`, {
      admin_user_id: adminUserId,
      action_type: actionType,
      previous_status: previousStatus,
      new_status: newStatus,
      notes: notes,
      timestamp: toUTC(nowInBahia()).toISOString(),
    });
  }
}

/**
 * Sends notification to customer about payment verification result
 */
async function notifyCustomer(
  service: any,
  orderId: string,
  orderType: 'subscription' | 'standalone_purchase',
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  let customerEmail: string | null = null;
  let customerName: string | null = null;
  let orderDetails: string | null = null;

  // Fetch customer information based on order type
  if (orderType === 'standalone_purchase') {
    const { data: purchase, error } = await service
      .from('standalone_purchases')
      .select(`
        id,
        total_amount,
        collections (name),
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !purchase) {
      console.error('Error fetching standalone purchase for notification:', error);
      return;
    }

    customerEmail = purchase.profiles?.email;
    customerName = purchase.profiles?.full_name;
    orderDetails = `Compra avulsa - ${purchase.collections?.name} (R$ ${purchase.total_amount})`;
  } else {
    const { data: subscription, error } = await service
      .from('subscriptions')
      .select(`
        id,
        plan_type,
        total_paid,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !subscription) {
      console.error('Error fetching subscription for notification:', error);
      return;
    }

    customerEmail = subscription.profiles?.email;
    customerName = subscription.profiles?.full_name;
    orderDetails = `Assinatura ${subscription.plan_type} (R$ ${subscription.total_paid})`;
  }

  if (!customerEmail) {
    console.error('Customer email not found for notification');
    return;
  }

  // Prepare notification message
  let subject: string;
  let message: string;

  if (approved) {
    subject = 'Pagamento Aprovado! ✅';
    message = `Olá ${customerName || 'Cliente'},\n\nSeu pagamento foi aprovado com sucesso!\n\nDetalhes do pedido:\n${orderDetails}\n\nSeu pedido está sendo processado e você receberá atualizações em breve.\n\nObrigado por escolher a Ordax!`;
  } else {
    subject = 'Pagamento Rejeitado ❌';
    message = `Olá ${customerName || 'Cliente'},\n\nInfelizmente, seu comprovante de pagamento foi rejeitado.\n\nDetalhes do pedido:\n${orderDetails}\n\nMotivo da rejeição:\n${rejectionReason || 'Comprovante inválido ou ilegível'}\n\nPor favor, faça o upload de um novo comprovante válido através do seu painel.\n\nSe tiver dúvidas, entre em contato com nosso suporte.`;
  }

  // Log notification (actual email sending would be implemented via email service)
  console.log(`[NOTIFICATION] To: ${customerEmail}`);
  console.log(`[NOTIFICATION] Subject: ${subject}`);
  console.log(`[NOTIFICATION] Message: ${message}`);

  // TODO: Integrate with email service when implemented
  // await sendEmail(customerEmail, subject, message);
}

/**
 * Approves payment voucher and updates order status
 */
async function approvePayment(
  service: any,
  orderId: string,
  orderType: 'subscription' | 'standalone_purchase',
  adminUserId: string,
  notes?: string
): Promise<any> {
  if (orderType === 'standalone_purchase') {
    // Fetch current purchase
    const { data: purchase, error: fetchError } = await service
      .from('standalone_purchases')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !purchase) {
      throw new Error('Compra avulsa não encontrada');
    }

    const previousStatus = purchase.status;
    let newStatus: string;

    // Determine new status based on current status
    if (previousStatus === 'deposit_paid') {
      newStatus = 'awaiting_balance';
    } else if (previousStatus === 'awaiting_balance') {
      newStatus = 'balance_paid';
    } else {
      throw new Error(`Status inválido para aprovação de pagamento: ${previousStatus}`);
    }

    // Update purchase status and clear rejection reason
    const updateData: any = {
      status: newStatus,
      updated_at: toUTC(nowInBahia()).toISOString(),
    };

    // Clear rejection reason on approval
    if (previousStatus === 'deposit_paid') {
      updateData.deposit_rejection_reason = null;
    } else if (previousStatus === 'awaiting_balance') {
      updateData.balance_rejection_reason = null;
      updateData.balance_paid_at = toUTC(nowInBahia()).toISOString();
    }

    const { data: updatedPurchase, error: updateError } = await service
      .from('standalone_purchases')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }

    // Log admin action
    await logVerificationAction(
      service,
      orderId,
      orderType,
      adminUserId,
      true,
      previousStatus,
      newStatus,
      notes || null
    );

    // Send notification to customer
    await notifyCustomer(service, orderId, orderType, true);

    return updatedPurchase;
  } else {
    // Handle subscription payment approval
    const { data: subscription, error: fetchError } = await service
      .from('subscriptions')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const previousStatus = subscription.status;
    const newStatus = 'active';

    // Update subscription status to active and clear rejection reason
    const { data: updatedSubscription, error: updateError } = await service
      .from('subscriptions')
      .update({
        status: newStatus,
        payment_rejection_reason: null,
        updated_at: toUTC(nowInBahia()).toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }

    // Log admin action
    await logVerificationAction(
      service,
      orderId,
      orderType,
      adminUserId,
      true,
      previousStatus,
      newStatus,
      notes || null
    );

    // Send notification to customer
    await notifyCustomer(service, orderId, orderType, true);

    return updatedSubscription;
  }
}

/**
 * Rejects payment voucher and notifies customer
 */
async function rejectPayment(
  service: any,
  orderId: string,
  orderType: 'subscription' | 'standalone_purchase',
  adminUserId: string,
  rejectionReason: string,
  notes?: string
): Promise<any> {
  if (orderType === 'standalone_purchase') {
    // Fetch current purchase
    const { data: purchase, error: fetchError } = await service
      .from('standalone_purchases')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !purchase) {
      throw new Error('Compra avulsa não encontrada');
    }

    const previousStatus = purchase.status;
    // Status remains the same, but we clear the voucher URL to allow re-upload
    // The customer will need to upload a new voucher

    // Update purchase - clear voucher URL and store rejection reason based on current status
    const updateData: any = {
      updated_at: toUTC(nowInBahia()).toISOString(),
    };

    if (previousStatus === 'deposit_paid') {
      updateData.payment_voucher_deposit_url = null;
      updateData.deposit_rejection_reason = rejectionReason;
    } else if (previousStatus === 'awaiting_balance') {
      updateData.payment_voucher_balance_url = null;
      updateData.balance_rejection_reason = rejectionReason;
    }

    const { data: updatedPurchase, error: updateError } = await service
      .from('standalone_purchases')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar compra: ${updateError.message}`);
    }

    // Log admin action
    await logVerificationAction(
      service,
      orderId,
      orderType,
      adminUserId,
      false,
      previousStatus,
      previousStatus, // Status doesn't change on rejection
      `Rejeitado: ${rejectionReason}${notes ? ` | ${notes}` : ''}`
    );

    // Send notification to customer with rejection reason
    await notifyCustomer(service, orderId, orderType, false, rejectionReason);

    return updatedPurchase;
  } else {
    // Handle subscription payment rejection
    const { data: subscription, error: fetchError } = await service
      .from('subscriptions')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const previousStatus = subscription.status;

    // Clear payment voucher URL and store rejection reason to allow re-upload
    const { data: updatedSubscription, error: updateError } = await service
      .from('subscriptions')
      .update({
        payment_voucher_url: null,
        payment_rejection_reason: rejectionReason,
        updated_at: toUTC(nowInBahia()).toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar assinatura: ${updateError.message}`);
    }

    // Log admin action
    await logVerificationAction(
      service,
      orderId,
      orderType,
      adminUserId,
      false,
      previousStatus,
      previousStatus, // Status doesn't change on rejection
      `Rejeitado: ${rejectionReason}${notes ? ` | ${notes}` : ''}`
    );

    // Send notification to customer with rejection reason
    await notifyCustomer(service, orderId, orderType, false, rejectionReason);

    return updatedSubscription;
  }
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Verify admin authorization
    const adminUser = await assertAdmin(req);
    const adminUserId = adminUser.userId;

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as VerifyPaymentRequest;

    const { orderId, orderType, approved, rejectionReason, notes } = body;

    // Validate input
    if (!orderId || !orderType) {
      return new Response(
        JSON.stringify({ error: "orderId e orderType são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({ error: "approved deve ser um valor booleano" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate order type
    if (!['subscription', 'standalone_purchase'].includes(orderType)) {
      return new Response(
        JSON.stringify({ 
          error: "orderType inválido. Use 'subscription' ou 'standalone_purchase'" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If rejected, rejection reason is required and must be valid
    if (!approved) {
      if (!rejectionReason) {
        return new Response(
          JSON.stringify({ 
            error: "rejectionReason é obrigatório quando o pagamento é rejeitado" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Validate rejection reason length and content
      const trimmedReason = rejectionReason.trim();
      if (trimmedReason.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "rejectionReason não pode estar vazio" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (trimmedReason.length > 500) {
        return new Response(
          JSON.stringify({ 
            error: "rejectionReason não pode exceder 500 caracteres" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Basic XSS prevention - reject if contains HTML tags
      if (/<[^>]*>/g.test(trimmedReason)) {
        return new Response(
          JSON.stringify({ 
            error: "rejectionReason não pode conter tags HTML" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Validate notes if provided
    if (notes) {
      const trimmedNotes = notes.trim();
      if (trimmedNotes.length > 1000) {
        return new Response(
          JSON.stringify({ 
            error: "notes não pode exceder 1000 caracteres" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Basic XSS prevention
      if (/<[^>]*>/g.test(trimmedNotes)) {
        return new Response(
          JSON.stringify({ 
            error: "notes não pode conter tags HTML" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Process verification
    let result;
    if (approved) {
      result = await approvePayment(service, orderId, orderType, adminUserId, notes);
    } else {
      result = await rejectPayment(
        service, 
        orderId, 
        orderType, 
        adminUserId, 
        rejectionReason!, 
        notes
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: approved 
          ? 'Pagamento aprovado com sucesso' 
          : 'Pagamento rejeitado. Cliente notificado.',
        order: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in admin-verify-payment:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
