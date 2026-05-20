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

export type Priority = "critical" | "high" | "normal" | "low";

export type ChoiceStatus = "pending" | "submitted" | "approved" | "rejected" | "locked";

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
