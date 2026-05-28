import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { EmailService, getEmailConfig, textToHtml } from "../_shared/email.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";
import {
  isDeliveryStatus,
  type DeliveryStatus,
  VALID_DELIVERY_STATUSES,
} from "../_shared/delivery-status.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

interface UpdateDeliveryStatusRequest {
  deliveryId: string;
  newStatus: DeliveryStatus;
  trackingCode?: string;
  notes?: string;
}

const CORREIOS_TRACKING_BASE_URL =
  "https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm";

const UPDATE_DELIVERY_STATUS_SCHEMA: Schema = {
  deliveryId: { type: "uuid", required: true },
  newStatus: { type: "string", required: true, maxLength: 20, trim: true },
  trackingCode: { type: "string", maxLength: 32, trim: true, rejectHtml: true },
  notes: { type: "string", maxLength: 1000, trim: true, rejectHtml: true },
};

interface DeliveryStatusRpcResult {
  delivery?: Record<string, unknown>;
  newStatus?: string;
  previousStatus?: string;
  trackingCodeAdded?: boolean;
  trackingCodeChanged?: boolean;
}

function buildCorreiosTrackingUrl(trackingCode: string): string {
  const url = new URL(CORREIOS_TRACKING_BASE_URL);
  url.searchParams.set("objeto", trackingCode);
  return url.toString();
}

function isCorreiosTrackingCode(code: string): boolean {
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code);
}

function validateTrackingCode(code: string): boolean {
  if (!code) return true;
  return /^[A-Z0-9][A-Z0-9 -]{5,31}$/.test(code);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function shouldSendShippingEmail(service: any, userId: string): Promise<boolean> {
  const { data, error } = await service
    .from("notification_preferences")
    .select("shipping_emails")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar preferencias de email:", error);
    return true;
  }

  return data?.shipping_emails ?? true;
}

async function createUserNotification(
  service: any,
  userId: string,
  deliveryId: string,
  title: string,
  message: string,
): Promise<void> {
  const { error } = await service.rpc("admin_insert_user_notification", {
    p_user_id: userId,
    p_type: "delivery_status_update",
    p_title: title,
    p_message: message,
    p_related_id: deliveryId,
    p_related_type: "subscription_delivery",
    p_priority: "medium",
  });

  if (error) {
    console.error("Erro ao criar notificacao de entrega para usuario:", error);
  }
}

async function sendNotificationEmail(to: string, subject: string, message: string): Promise<void> {
  const emailService = new EmailService(getEmailConfig({ fromName: "ORDAX Entregas" }));
  await emailService.sendEmail({
    to,
    subject,
    html: `<p>${textToHtml(message)}</p>`,
  });
}

async function notifySubscriber(
  service: any,
  deliveryId: string,
  newStatus: string,
  trackingCode?: string,
  trackingCodeAdded?: boolean,
): Promise<void> {
  const { data: delivery, error: deliveryError } = await service
    .from("subscription_deliveries")
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
    .eq("id", deliveryId)
    .single();

  if (deliveryError || !delivery) {
    console.error("Erro ao buscar entrega para notificacao:", deliveryError);
    return;
  }

  const subscription = firstRelation(delivery.subscriptions);
  const profile = firstRelation(subscription?.profiles);
  const collection = firstRelation(delivery.collections);
  const userId = subscription?.user_id;
  const customerEmail = profile?.email;
  const customerName = profile?.full_name || "Cliente";
  const collectionName = collection?.name || "sua colecao";

  if (!userId) {
    console.error("Usuario da entrega nao encontrado para notificacao");
    return;
  }

  let subject = "";
  let message = "";

  if (trackingCodeAdded && trackingCode) {
    const trackingUrl = isCorreiosTrackingCode(trackingCode) ? buildCorreiosTrackingUrl(trackingCode) : "";
    subject = "Codigo de rastreamento disponivel";
    message = `Ola ${customerName},\n\nO codigo de rastreamento da sua entrega #${delivery.delivery_number} (${collectionName}) esta disponivel.\n\nCodigo: ${trackingCode}${trackingUrl ? `\n\nRastreie seu pedido em: ${trackingUrl}` : ""}`;
  } else {
    switch (newStatus) {
      case "confirmed":
        subject = "Sua escolha foi confirmada";
        message = `Ola ${customerName},\n\nSua escolha da colecao "${collectionName}" para a entrega #${delivery.delivery_number} foi confirmada e entrara em producao em breve.`;
        break;
      case "in_production":
        subject = "Sua peca entrou em producao";
        message = `Ola ${customerName},\n\nSua peca da colecao "${collectionName}" (entrega #${delivery.delivery_number}) entrou em producao.`;
        break;
      case "shipped": {
        const trackingUrl =
          trackingCode && isCorreiosTrackingCode(trackingCode) ? buildCorreiosTrackingUrl(trackingCode) : "";
        subject = "Sua peca foi enviada";
        message = `Ola ${customerName},\n\nSua peca da colecao "${collectionName}" (entrega #${delivery.delivery_number}) foi enviada.${trackingCode ? `\n\nCodigo de rastreamento: ${trackingCode}${trackingUrl ? `\n\nRastreie seu pedido em: ${trackingUrl}` : ""}` : ""}`;
        break;
      }
      case "delivered":
        subject = "Sua peca foi entregue";
        message = `Ola ${customerName},\n\nSua peca da colecao "${collectionName}" (entrega #${delivery.delivery_number}) foi entregue.`;
        break;
      case "revealed":
        subject = "Sua peca foi revelada";
        message = `Ola ${customerName},\n\nSua peca da colecao "${collectionName}" (entrega #${delivery.delivery_number}) foi revelada.`;
        break;
      case "cancelled":
        subject = "Entrega cancelada";
        message = `Ola ${customerName},\n\nA entrega #${delivery.delivery_number} da colecao "${collectionName}" foi cancelada.`;
        break;
      default:
        return;
    }
  }

  await createUserNotification(service, userId, deliveryId, subject, message);

  if (!customerEmail) {
    console.error("Email do cliente nao encontrado para notificacao de entrega");
    return;
  }

  if (!(await shouldSendShippingEmail(service, userId))) {
    return;
  }

  try {
    await sendNotificationEmail(customerEmail, subject, message);
  } catch (error) {
    console.error("Erro ao enviar email de notificacao de entrega:", error);
  }
}

async function updateDeliveryStatus(
  service: any,
  deliveryId: string,
  newStatus: DeliveryStatus,
  adminUserId: string,
  trackingCode?: string,
  notes?: string,
): Promise<DeliveryStatusRpcResult> {
  const { data, error } = await service.rpc("admin_update_subscription_delivery_status", {
    p_delivery_id: deliveryId,
    p_status: newStatus,
    p_tracking_code: trackingCode ?? null,
    p_notes: notes ?? null,
    p_action_type: "status_update",
    p_allow_same_status: Boolean(trackingCode),
    p_admin_user_id: adminUserId,
  });

  if (error) {
    const message = error.message || "Erro ao atualizar status";
    if (message.includes("DELIVERY_NOT_FOUND")) throw new Error("Entrega nao encontrada");
    if (message.includes("INVALID_STATUS_TRANSITION")) throw new Error("Transicao de status invalida");
    if (message.includes("INVALID_TRACKING_CODE")) throw new Error("Formato de codigo de rastreamento invalido");
    if (message.includes("INVALID_NOTES")) throw new Error("Notas invalidas");
    throw new Error("Erro ao atualizar status");
  }

  const result = (data || {}) as DeliveryStatusRpcResult;
  const delivery = result.delivery || {};
  const resolvedStatus = typeof result.newStatus === "string" ? result.newStatus : newStatus;
  const resolvedTrackingCode =
    typeof delivery.tracking_code === "string" ? delivery.tracking_code : trackingCode;

  await notifySubscriber(
    service,
    deliveryId,
    resolvedStatus,
    resolvedTrackingCode,
    Boolean(result.trackingCodeAdded),
  );

  return result;
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const adminUser = await assertAdmin(req);
    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, UPDATE_DELIVERY_STATUS_SCHEMA);
    if ("error" in validation) return validation.error;

    const { deliveryId, newStatus, trackingCode: rawTrackingCode, notes } =
      validation.data as unknown as UpdateDeliveryStatusRequest;
    const trackingCode = rawTrackingCode?.toUpperCase();

    if (!isDeliveryStatus(newStatus)) {
      return json({ error: `Status invalido. Status validos: ${VALID_DELIVERY_STATUSES.join(", ")}` }, 400);
    }

    if (trackingCode && !validateTrackingCode(trackingCode)) {
      return json(
        { error: "Formato de codigo de rastreamento invalido" },
        400,
      );
    }

    const result = await updateDeliveryStatus(
      service,
      deliveryId,
      newStatus,
      adminUser.userId,
      trackingCode,
      notes,
    );

    return json({
      success: true,
      message: `Status da entrega atualizado para: ${newStatus}`,
      delivery: result.delivery ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in update-delivery-status:", msg);
    const status =
      msg === "Unauthorized" ? 401 :
      msg.startsWith("Forbidden") ? 403 :
      msg.includes("obrigatorio") || msg.includes("inval") || msg.includes("cannot") ? 400 :
      500;
    return json({ error: status >= 500 ? "Internal server error" : msg }, status);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
