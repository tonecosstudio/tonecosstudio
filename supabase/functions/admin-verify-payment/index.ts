/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { EmailService, getEmailConfig, textToHtml } from "../_shared/email.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

type OrderType = "subscription" | "standalone_purchase";

interface VerifyPaymentRequest {
  orderId: string;
  orderType: OrderType;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}

const VERIFY_PAYMENT_SCHEMA: Schema = {
  orderId: { type: "uuid", required: true },
  orderType: { type: "string", required: true, maxLength: 40, trim: true },
  approved: { type: "boolean", required: true },
  rejectionReason: {
    type: "string",
    maxLength: 500,
    trim: true,
    rejectHtml: true,
  },
  notes: { type: "string", maxLength: 1000, trim: true, rejectHtml: true },
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function shouldSendPaymentEmail(
  service: any,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from("notification_preferences")
    .select("payment_emails")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching payment email preference:", error);
    return true;
  }

  return data?.payment_emails ?? true;
}

async function createUserPaymentNotification(
  service: any,
  userId: string,
  orderId: string,
  orderType: OrderType,
  approved: boolean,
  message: string,
): Promise<void> {
  const { error } = await service.rpc("admin_insert_user_notification", {
    p_user_id: userId,
    p_type: approved ? "payment_approved" : "payment_rejected",
    p_title: approved ? "Pagamento aprovado" : "Pagamento rejeitado",
    p_message: message,
    p_related_id: orderId,
    p_related_type: orderType,
    p_priority: approved ? "medium" : "high",
  });

  if (error) {
    console.error("Error creating user payment notification:", error);
  }
}

async function sendPaymentEmail(
  to: string,
  subject: string,
  message: string,
): Promise<void> {
  const emailService = new EmailService(
    getEmailConfig({ fromName: "ORDAX Pagamentos" }),
  );
  await emailService.sendEmail({
    to,
    subject,
    html: `<p>${textToHtml(message)}</p>`,
  });
}

function mapSubscriptionPaymentRpcError(message: string): string {
  if (message.includes("SUBSCRIPTION_NOT_FOUND"))
    return "Assinatura nao encontrada";
  if (message.includes("INVALID_SUBSCRIPTION_STATUS"))
    return "Status da assinatura invalido para verificacao";
  if (message.includes("rejection reason") || message.includes("REJECTION")) {
    return "Motivo de rejeicao invalido";
  }
  if (message.includes("ADMIN_USER_ID_REQUIRED"))
    return "Administrador nao identificado";
  return "Erro ao verificar pagamento da assinatura";
}

async function notifyCustomer(
  service: any,
  orderId: string,
  orderType: OrderType,
  approved: boolean,
  rejectionReason?: string,
): Promise<void> {
  let userId: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;
  let orderDetails: string | null = null;

  if (orderType === "standalone_purchase") {
    const { data: purchase, error } = await service
      .from("standalone_purchases")
      .select(
        `
        id,
        user_id,
        total_amount,
        collections (name),
        profiles:user_id (
          email,
          full_name
        )
      `,
      )
      .eq("id", orderId)
      .single();

    if (error || !purchase) {
      console.error(
        "Error fetching standalone purchase for notification:",
        error,
      );
      return;
    }

    const profile = firstRelation(purchase.profiles);
    const collection = firstRelation(purchase.collections);
    userId = purchase.user_id;
    customerEmail = profile?.email ?? null;
    customerName = profile?.full_name ?? null;
    orderDetails = `Compra avulsa - ${collection?.name ?? "colecao"} (R$ ${purchase.total_amount})`;
  } else {
    const { data: subscription, error } = await service
      .from("subscriptions")
      .select(
        `
        id,
        user_id,
        plan_type,
        total_paid,
        profiles:user_id (
          email,
          full_name
        )
      `,
      )
      .eq("id", orderId)
      .single();

    if (error || !subscription) {
      console.error("Error fetching subscription for notification:", error);
      return;
    }

    const profile = firstRelation(subscription.profiles);
    userId = subscription.user_id;
    customerEmail = profile?.email ?? null;
    customerName = profile?.full_name ?? null;
    orderDetails = `Assinatura ${subscription.plan_type} (R$ ${subscription.total_paid})`;
  }

  if (!userId) {
    console.error("Customer user id not found for payment notification");
    return;
  }

  const subject = approved ? "Pagamento aprovado" : "Pagamento rejeitado";
  const message = approved
    ? `Ola ${customerName || "Cliente"},\n\nSeu pagamento foi aprovado com sucesso.\n\nDetalhes do pedido:\n${orderDetails}\n\nSeu pedido esta sendo processado e voce recebera atualizacoes em breve.`
    : `Ola ${customerName || "Cliente"},\n\nSeu comprovante de pagamento foi rejeitado.\n\nDetalhes do pedido:\n${orderDetails}\n\nMotivo da rejeicao:\n${rejectionReason || "Comprovante invalido ou ilegivel"}\n\nEnvie um novo comprovante valido pelo seu painel.`;

  await createUserPaymentNotification(
    service,
    userId,
    orderId,
    orderType,
    approved,
    message,
  );

  if (!customerEmail) {
    console.error("Customer email not found for payment notification");
    return;
  }

  if (!(await shouldSendPaymentEmail(service, userId))) {
    return;
  }

  try {
    await sendPaymentEmail(customerEmail, subject, message);
  } catch (error) {
    console.error("Error sending payment notification email:", error);
  }
}

async function approvePayment(
  service: any,
  adminClient: any,
  orderId: string,
  orderType: OrderType,
  adminUserId: string,
  notes?: string,
): Promise<any> {
  if (orderType === "standalone_purchase") {
    const { data: purchase, error: fetchError } = await service
      .from("standalone_purchases")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (fetchError || !purchase) {
      throw new Error("Compra avulsa nao encontrada");
    }

    let voucherType: "deposit" | "balance";

    if (purchase.status === "deposit_paid") {
      voucherType = "deposit";
    } else if (purchase.status === "awaiting_balance") {
      voucherType = "balance";
    } else {
      throw new Error(
        `Status invalido para aprovacao de pagamento: ${purchase.status}`,
      );
    }

    const { data: updatedPurchase, error: updateError } = await adminClient.rpc(
      "admin_approve_standalone_payment_voucher",
      {
        p_purchase_id: orderId,
        p_voucher_type: voucherType,
      },
    );

    if (updateError) {
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }

    await notifyCustomer(service, orderId, orderType, true);
    void adminUserId;
    void notes;
    return updatedPurchase;
  }

  const { data: updatedSubscription, error: updateError } = await service.rpc(
    "admin_verify_subscription_payment_voucher",
    {
      p_subscription_id: orderId,
      p_approved: true,
      p_rejection_reason: null,
      p_notes: notes ?? null,
      p_admin_user_id: adminUserId,
    },
  );

  if (updateError) {
    throw new Error(mapSubscriptionPaymentRpcError(updateError.message));
  }

  await notifyCustomer(service, orderId, orderType, true);
  return updatedSubscription;
}

async function rejectPayment(
  service: any,
  adminClient: any,
  orderId: string,
  orderType: OrderType,
  adminUserId: string,
  rejectionReason: string,
  notes?: string,
): Promise<any> {
  if (orderType === "standalone_purchase") {
    const { data: purchase, error: fetchError } = await service
      .from("standalone_purchases")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (fetchError || !purchase) {
      throw new Error("Compra avulsa nao encontrada");
    }

    let voucherType: "deposit" | "balance";

    if (purchase.status === "deposit_paid") {
      voucherType = "deposit";
    } else if (purchase.status === "awaiting_balance") {
      voucherType = "balance";
    } else {
      throw new Error(
        `Status invalido para rejeicao de pagamento: ${purchase.status}`,
      );
    }

    const { data: updatedPurchase, error: updateError } = await adminClient.rpc(
      "admin_reject_standalone_payment_voucher",
      {
        p_purchase_id: orderId,
        p_voucher_type: voucherType,
        p_reason: rejectionReason,
      },
    );

    if (updateError) {
      throw new Error(`Erro ao atualizar compra: ${updateError.message}`);
    }

    await notifyCustomer(service, orderId, orderType, false, rejectionReason);
    void adminUserId;
    void notes;
    return updatedPurchase;
  }

  const { data: updatedSubscription, error: updateError } = await service.rpc(
    "admin_verify_subscription_payment_voucher",
    {
      p_subscription_id: orderId,
      p_approved: false,
      p_rejection_reason: rejectionReason,
      p_notes: notes ?? null,
      p_admin_user_id: adminUserId,
    },
  );

  if (updateError) {
    throw new Error(mapSubscriptionPaymentRpcError(updateError.message));
  }

  await notifyCustomer(service, orderId, orderType, false, rejectionReason);
  return updatedSubscription;
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const adminUser = await assertRateLimitedAdmin(req, "admin-verify-payment");
    if (adminUser.rateLimited) return adminUser.rateLimited;

    const { client: adminClient } = await getClaims(req);
    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, VERIFY_PAYMENT_SCHEMA);
    if ("error" in validation) return validation.error;

    const { orderId, orderType, approved, rejectionReason, notes } =
      validation.data as unknown as VerifyPaymentRequest;

    if (!["subscription", "standalone_purchase"].includes(orderType)) {
      return json(
        {
          error: "orderType invalido. Use subscription ou standalone_purchase",
        },
        400,
      );
    }

    if (!approved && !rejectionReason) {
      return json(
        {
          error: "rejectionReason e obrigatorio quando o pagamento e rejeitado",
        },
        400,
      );
    }

    const result = approved
      ? await approvePayment(
          service,
          adminClient,
          orderId,
          orderType,
          adminUser.userId,
          notes,
        )
      : await rejectPayment(
          service,
          adminClient,
          orderId,
          orderType,
          adminUser.userId,
          rejectionReason!,
          notes,
        );

    return json({
      success: true,
      message: approved
        ? "Pagamento aprovado com sucesso"
        : "Pagamento rejeitado. Cliente notificado.",
      order: result,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in admin-verify-payment:", msg);
    const status =
      msg === "Unauthorized"
        ? 401
        : msg.startsWith("Forbidden")
          ? 403
          : msg.includes("obrigatorio") ||
              msg.includes("inval") ||
              msg.includes("cannot")
            ? 400
            : 500;
    return json(
      { error: status >= 500 ? "Internal server error" : msg },
      status,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
