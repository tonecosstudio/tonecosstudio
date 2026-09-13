import type {
  PaymentStatus,
  PaymentTimelineAction,
  PaymentTimelineEvent,
} from "@/types/manual-payment";

const TIMELINE_ACTIONS = new Set<PaymentTimelineAction>([
  "created",
  "status_changed",
  "file_uploaded",
  "approved",
  "rejected",
  "info_requested",
]);

const PAYMENT_STATUSES = new Set<PaymentStatus>([
  "pending",
  "under_review",
  "requires_info",
  "approved",
  "rejected",
]);

function isNullableStatus(value: unknown): value is PaymentStatus | null {
  return value === null || (typeof value === "string" && PAYMENT_STATUSES.has(value as PaymentStatus));
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parsePaymentTimelineResponse(
  value: unknown,
  expectedPaymentId: string,
): PaymentTimelineEvent[] {
  if (!Array.isArray(value)) {
    throw new Error("Payment timeline response is invalid");
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Payment timeline response is invalid");
    }

    const event = entry as Record<string, unknown>;
    const action = event.action_type;
    const createdAt = event.created_at;

    if (
      typeof event.id !== "string" ||
      !event.id.trim() ||
      event.payment_id !== expectedPaymentId ||
      typeof action !== "string" ||
      !TIMELINE_ACTIONS.has(action as PaymentTimelineAction) ||
      !isNullableStatus(event.old_status) ||
      !isNullableStatus(event.new_status) ||
      !isNullableText(event.notes) ||
      typeof createdAt !== "string" ||
      Number.isNaN(Date.parse(createdAt))
    ) {
      throw new Error("Payment timeline response is invalid");
    }

    return {
      id: event.id,
      payment_id: expectedPaymentId,
      action_type: action as PaymentTimelineAction,
      old_status: event.old_status,
      new_status: event.new_status,
      notes: event.notes,
      created_at: createdAt,
    };
  });
}
