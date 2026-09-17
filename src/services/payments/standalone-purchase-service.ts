import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { emailService } from "@/services/notifications/email-service";

export type StandaloneFulfillmentStatus =
  | "in_production"
  | "shipped"
  | "delivered"
  | "completed";

export type StandaloneAdminTransitionStatus =
  | "deposit_paid"
  | "awaiting_balance"
  | "balance_paid"
  | StandaloneFulfillmentStatus
  | "cancelled";

type VoucherType = "deposit" | "balance";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }

  return false;
}

function assertValidTrackingCode(value: string): string {
  const trackingCode = value.trim();

  if (!trackingCode) {
    throw new Error("Tracking code is required");
  }

  if (trackingCode.length > 100) {
    throw new Error("Tracking code must be at most 100 characters");
  }

  if (
    trackingCode.includes("<") ||
    trackingCode.includes(">") ||
    hasControlCharacter(trackingCode)
  ) {
    throw new Error("Tracking code contains invalid characters");
  }

  return trackingCode;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function requireRejectionReason(value: string): string {
  const reason = value.trim();
  if (!reason) throw new Error("Rejection reason is required");
  if (reason.length > 1000) throw new Error("Rejection reason is too long");
  return reason;
}

export async function cancelStandalonePurchase(
  purchaseId: string,
  reason?: string,
  _adminUserId?: string,
): Promise<void> {
  const cancellationReason = reason?.trim() || "Cancelled by admin";

  await callAdminRpc("admin_cancel_standalone_purchase", {
    p_purchase_id: purchaseId,
    p_reason: cancellationReason,
  });

  logInfo(
    "Standalone purchase cancelled",
    { purchaseId },
    "standalone-purchase",
  );
}

export async function markProductionComplete(
  purchaseId: string,
  _adminUserId?: string,
): Promise<void> {
  await callAdminRpc("admin_mark_standalone_production_complete", {
    p_purchase_id: purchaseId,
  });

  try {
    await emailService.sendProductionStarted(purchaseId);
  } catch (error) {
    logError(
      "Failed to send standalone production update email",
      error,
      "standalone-purchase",
    );
  }
}

export async function updateStandaloneTrackingCode(
  purchaseId: string,
  trackingCode: string,
  options?: { markShipped?: boolean },
): Promise<void> {
  const safeTrackingCode = assertValidTrackingCode(trackingCode);

  await callAdminRpc("admin_update_standalone_tracking_code", {
    p_purchase_id: purchaseId,
    p_tracking_code: safeTrackingCode,
    p_mark_shipped: Boolean(options?.markShipped),
  });
}

export async function updateStandaloneFulfillmentStatus(
  purchaseId: string,
  status: StandaloneFulfillmentStatus,
  notes?: string,
): Promise<void> {
  await callAdminRpc("admin_update_standalone_fulfillment_status", {
    p_purchase_id: purchaseId,
    p_new_status: status,
    p_notes: notes?.trim() || null,
  });
}

export async function approvePaymentVoucher(
  purchaseId: string,
  voucherType: VoucherType,
): Promise<void> {
  await callAdminRpc("admin_approve_standalone_payment_voucher", {
    p_purchase_id: purchaseId,
    p_voucher_type: voucherType,
  });
}

export async function rejectPaymentVoucher(
  purchaseId: string,
  voucherType: VoucherType,
  rejectionReason: string,
): Promise<void> {
  const safeReason = requireRejectionReason(rejectionReason);
  const result = await callAdminRpc<unknown>(
    "admin_reject_standalone_payment_voucher",
    {
      p_purchase_id: purchaseId,
      p_voucher_type: voucherType,
      p_reason: safeReason,
    },
  );

  const userId =
    typeof result === "object" &&
    result !== null &&
    "userId" in result &&
    typeof result.userId === "string"
      ? result.userId
      : null;

  if (!userId) return;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email, full_name, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile?.email) return;

    const name =
      profile.full_name || profile.display_name || profile.email.split("@")[0];
    const voucherLabel = voucherType === "deposit" ? "depósito" : "saldo";
    const html = [
      `<p>Olá, ${escapeHtml(name)}.</p>`,
      `<p>O comprovante de ${voucherLabel} foi rejeitado.</p>`,
      `<p><strong>Motivo:</strong> ${escapeHtml(safeReason)}</p>`,
      "<p>Envie um novo comprovante válido para prosseguir com o pedido.</p>",
    ].join("");

    await emailService.sendEmail(
      profile.email,
      `Comprovante de ${voucherLabel} rejeitado - ORDAX`,
      html,
      "voucher_rejection",
      userId,
      {
        purchase_id: purchaseId,
        voucher_type: voucherType,
        reason: safeReason,
      },
    );
  } catch (error) {
    logError(
      "Failed to send voucher rejection email",
      error,
      "standalone-purchase",
    );
  }
}

export async function transitionStandalonePurchaseStatus(
  purchaseId: string,
  newStatus: StandaloneAdminTransitionStatus | string,
  options?: { reason?: string; notes?: string },
): Promise<void> {
  switch (newStatus) {
    case "deposit_paid":
      await approvePaymentVoucher(purchaseId, "deposit");
      return;
    case "awaiting_balance":
      await markProductionComplete(purchaseId);
      return;
    case "balance_paid":
      await approvePaymentVoucher(purchaseId, "balance");
      return;
    case "cancelled":
      await cancelStandalonePurchase(
        purchaseId,
        options?.reason || "Cancelled by admin",
      );
      return;
    case "in_production":
    case "shipped":
    case "delivered":
    case "completed":
      await updateStandaloneFulfillmentStatus(
        purchaseId,
        newStatus,
        options?.notes,
      );
      return;
    default:
      throw new Error(
        `Unsupported standalone purchase status transition: ${newStatus}`,
      );
  }
}
