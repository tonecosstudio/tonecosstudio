export type StageType =
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

export type StageStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface ProductionStageRecord {
  id: string;
  productionQueueId: string;
  stageName: StageType;
  stageOrder: number;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number;
  actualDuration: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  notes: string | null;
  photos: string[];
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  unblockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
