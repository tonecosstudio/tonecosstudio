export type DeliveryStatus =
  | "scheduled"
  | "pending_choice"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "revealed"
  | "cancelled";

export const VALID_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  "scheduled",
  "pending_choice",
  "confirmed",
  "in_production",
  "shipped",
  "delivered",
  "revealed",
  "cancelled",
];

const VALID_CURRENT_DELIVERY_STATUSES: readonly string[] = [
  "pending",
  ...VALID_DELIVERY_STATUSES,
];

const FORWARD_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  scheduled: ["pending_choice", "confirmed", "cancelled"],
  pending_choice: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["revealed"],
  revealed: [],
  cancelled: [],
};

const REVERSE_TRANSITIONS: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  pending_choice: ["scheduled", "pending"],
  confirmed: ["pending_choice", "scheduled", "pending"],
  in_production: ["confirmed"],
  shipped: ["in_production"],
  delivered: ["shipped"],
  revealed: ["delivered"],
};

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return typeof value === "string" && VALID_DELIVERY_STATUSES.includes(value as DeliveryStatus);
}

export function isValidDeliveryStatusTransition(
  currentStatus: string,
  newStatus: string,
  options: { allowSameStatus?: boolean; allowReverse?: boolean } = {},
): boolean {
  if (options.allowSameStatus && currentStatus === newStatus) return true;
  if (!VALID_CURRENT_DELIVERY_STATUSES.includes(currentStatus) || !isDeliveryStatus(newStatus)) {
    return false;
  }

  if (currentStatus === "pending") {
    return ["scheduled", "pending_choice", "confirmed", "cancelled"].includes(newStatus);
  }

  const typedCurrentStatus = currentStatus as DeliveryStatus;

  if (FORWARD_TRANSITIONS[typedCurrentStatus].includes(newStatus)) return true;
  if (options.allowReverse === false) return false;

  return (REVERSE_TRANSITIONS[typedCurrentStatus] || []).includes(newStatus);
}
