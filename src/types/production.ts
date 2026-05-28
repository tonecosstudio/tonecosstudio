export type ProductionStatus =
  | "awaiting_choice"
  | "ready_for_production"
  | "in_production"
  | "completed"
  | "on_hold"
  | "cancelled";

export type ProductionStage =
  | "awaiting_payment"
  | "payment_confirmed"
  | "awaiting_choice"
  | "model_preparation"
  | "printing"
  | "post_processing"
  | "painting"
  | "quality_check"
  | "packaging"
  | "ready_to_ship"
  | "shipped"
  | "delivered";

export const PRODUCTION_PRIORITIES = ["critical", "high", "normal", "low"] as const;
export type Priority = (typeof PRODUCTION_PRIORITIES)[number];

const PRODUCTION_PRIORITY_SET = new Set<string>(PRODUCTION_PRIORITIES);

export function isProductionPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRODUCTION_PRIORITY_SET.has(value);
}

export function getProductionPriorityFromScore(
  priority: unknown,
  priorityScore?: unknown
): Priority {
  if (isProductionPriority(priority)) {
    return priority;
  }

  const score =
    typeof priorityScore === "number"
      ? priorityScore
      : typeof priority === "number"
        ? priority
        : null;

  if (score === null) return "normal";
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score <= 30) return "low";
  return "normal";
}

export type ChoiceStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "locked"
  | "expired";

export interface ProductionFilters {
  collections?: string[];
  priorities?: Priority[];
  stages?: ProductionStage[];
  statuses?: ProductionStatus[];
  assignedTo?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface ProductionQueueItem {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  customerId: string;
  customerName: string;
  customerEmail: string;
  collectionId: string;
  collectionName: string;
  characterId: string | null;
  characterName: string | null;
  productionStatus: ProductionStatus;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceMadeAt: string | null;
  priority: Priority;
  priorityScore: number;
  scheduledProductionDate: string | null;
  estimatedCompletionDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  productionNotes: string | null;
  customerNotes: string | null;
  internalFlags: string[];
  createdAt: string;
  updatedAt: string;
}
