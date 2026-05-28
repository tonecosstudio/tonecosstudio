import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { NOTIFICATION_ROUTES } from "@/config/routes";

type PaymentNotificationType =
  | "payment_created"
  | "payment_under_review"
  | "payment_approved"
  | "payment_rejected"
  | "payment_info_request";

interface NotificationService {
  sendPaymentCreated(paymentId: string): Promise<void>;
  sendPaymentUnderReview(paymentId: string): Promise<void>;
  sendPaymentApproved(paymentId: string): Promise<void>;
  sendPaymentRejected(paymentId: string, reason: string): Promise<void>;
  sendInfoRequested(paymentId: string, message: string): Promise<void>;
}

interface PaymentNotificationContext {
  paymentId: string;
  userId: string | null;
  referenceNumber: string | null;
}

interface AdminNotificationRpcArgs {
  p_type: PaymentNotificationType;
  p_title: string;
  p_message: string;
  p_priority: "low" | "medium" | "high" | "urgent";
  p_icon: string;
  p_action_url: string;
  p_related_id: string;
  p_related_type: "payment";
  p_metadata: Record<string, string | null>;
}

interface AdminNotificationRpcClient {
  rpc(
    fn: "create_admin_notification",
    args: AdminNotificationRpcArgs
  ): Promise<{ error: { message?: string } | null }>;
}

interface UserNotificationRpcClient {
  rpc(
    fn: "create_user_notification",
    args: {
      p_user_id: string;
      p_type: PaymentNotificationType;
      p_title: string;
      p_message: string;
      p_priority?: "low" | "medium" | "high" | "urgent";
      p_action_url?: string | null;
      p_related_id?: string | null;
      p_related_type?: string | null;
      p_metadata?: Record<string, string | null>;
    }
  ): Promise<{ error: { message?: string } | null }>;
}

const adminPaymentsUrl = NOTIFICATION_ROUTES.adminPayments;

async function getPaymentNotificationContext(
  paymentId: string
): Promise<PaymentNotificationContext> {
  const { data, error } = await supabase
    .from("manual_payments")
    .select("id, user_id, reference_number")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch payment notification context: ${error.message}`);
  }

  return {
    paymentId,
    userId: data?.user_id ?? null,
    referenceNumber: data?.reference_number ?? null,
  };
}

async function createAdminPaymentNotification(
  context: PaymentNotificationContext,
  type: Extract<PaymentNotificationType, "payment_created" | "payment_under_review">,
  title: string,
  message: string,
  priority: AdminNotificationRpcArgs["p_priority"]
): Promise<void> {
  const { error } = await (supabase as unknown as AdminNotificationRpcClient).rpc(
    "create_admin_notification",
    {
      p_type: type,
      p_title: title,
      p_message: message,
      p_priority: priority,
      p_icon: "CreditCard",
      p_action_url: adminPaymentsUrl,
      p_related_id: context.paymentId,
      p_related_type: "payment",
      p_metadata: {
        payment_id: context.paymentId,
        reference_number: context.referenceNumber,
      },
    }
  );

  if (error) {
    throw new Error(error.message ?? "Failed to create admin payment notification");
  }
}

async function createUserPaymentNotification(
  context: PaymentNotificationContext,
  type: Extract<
    PaymentNotificationType,
    "payment_approved" | "payment_rejected" | "payment_info_request"
  >,
  title: string,
  message: string
): Promise<void> {
  if (!context.userId) {
    log.warn("Skipping user payment notification without user id", {
      paymentId: context.paymentId,
      type,
    });
    return;
  }

  const { error } = await (supabase as unknown as UserNotificationRpcClient).rpc(
    "create_user_notification",
    {
      p_user_id: context.userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_priority: "medium",
      p_related_id: context.paymentId,
      p_related_type: "payment",
      p_metadata: {
        payment_id: context.paymentId,
        reference_number: context.referenceNumber,
      },
    }
  );

  if (error) {
    throw new Error(error.message ?? "Failed to create user payment notification");
  }
}

class SupabaseNotificationService implements NotificationService {
  async sendPaymentCreated(paymentId: string): Promise<void> {
    const context = await getPaymentNotificationContext(paymentId);
    await createAdminPaymentNotification(
      context,
      "payment_created",
      "Novo pagamento criado",
      `Pagamento ${context.referenceNumber ?? paymentId} foi criado e aguarda comprovante.`,
      "medium"
    );
  }

  async sendPaymentUnderReview(paymentId: string): Promise<void> {
    const context = await getPaymentNotificationContext(paymentId);
    await createAdminPaymentNotification(
      context,
      "payment_under_review",
      "Pagamento em revisao",
      `Pagamento ${context.referenceNumber ?? paymentId} recebeu comprovante e precisa de analise.`,
      "high"
    );
  }

  async sendPaymentApproved(paymentId: string): Promise<void> {
    const context = await getPaymentNotificationContext(paymentId);
    await createUserPaymentNotification(
      context,
      "payment_approved",
      "Pagamento aprovado",
      `Seu pagamento ${context.referenceNumber ?? paymentId} foi aprovado.`
    );
  }

  async sendPaymentRejected(paymentId: string, reason: string): Promise<void> {
    const context = await getPaymentNotificationContext(paymentId);
    await createUserPaymentNotification(
      context,
      "payment_rejected",
      "Pagamento rejeitado",
      `Seu pagamento ${context.referenceNumber ?? paymentId} foi rejeitado. Motivo: ${reason}`
    );
  }

  async sendInfoRequested(paymentId: string, message: string): Promise<void> {
    const context = await getPaymentNotificationContext(paymentId);
    await createUserPaymentNotification(
      context,
      "payment_info_request",
      "Informacoes solicitadas",
      `Precisamos de mais informacoes sobre o pagamento ${context.referenceNumber ?? paymentId}: ${message}`
    );
  }
}

const notificationService: NotificationService = new SupabaseNotificationService();

export function getNotificationService(): NotificationService {
  return notificationService;
}
