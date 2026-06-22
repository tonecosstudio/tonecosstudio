/**
 * Stage Validation Service
 *
 * Validates production stage transitions to ensure:
 * - Stages are completed in order
 * - No stage skipping without admin override
 * - All transitions are logged
 */
import { supabase } from "@/integrations/supabase/client";
import log from "@/lib/logger";
import {
  assertCurrentUserId,
  currentUserHasAdminAccess,
} from "@/services/auth/current-user";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  PRODUCTION_STAGE_ORDER,
  getProductionStageLabel,
} from "@/config/production-stages";
import type { StageType } from "./stage-types";

// ============================================================================
// Types
// ============================================================================

export interface StageValidationResult {
  isValid: boolean;
  error?: string;
  canOverride: boolean;
  requiresJustification: boolean;
}

export interface StageTransitionLog {
  id: string;
  productionQueueId: string;
  fromStage: StageType | null;
  toStage: StageType;
  userId: string;
  userName: string;
  timestamp: string;
  isOverride: boolean;
  justification: string | null;
}

const ORDERED_STAGES: StageType[] = [...PRODUCTION_STAGE_ORDER];

interface StageValidationQueryError {
  message: string;
}

interface StageValidationQuery<T> extends PromiseLike<{
  data: T[] | null;
  error: StageValidationQueryError | null;
}> {
  eq(column: string, value: string): StageValidationQuery<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): Promise<{ data: T[] | null; error: StageValidationQueryError | null }>;
}

interface StageValidationGateway {
  from(table: "production_stages"): {
    select(columns: string): StageValidationQuery<ProductionStageValidationRow>;
  };
  from(table: "stage_transition_logs"): {
    select(columns: string): StageValidationQuery<StageTransitionLogRow>;
  };
}

interface ProductionStageValidationRow {
  id: string;
  stage_name: string;
  status: string;
  is_blocked: boolean;
  stage_order: number | null;
}

interface StageTransitionLogRow {
  id: string;
  production_queue_id: string;
  from_stage: string | null;
  to_stage: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  is_override: boolean;
  justification: string | null;
}

type OrderedProductionStageValidationRow = ProductionStageValidationRow & {
  resolvedStageOrder: number;
};

const stageValidationGateway = supabase as unknown as StageValidationGateway;

function isStageType(value: unknown): value is StageType {
  return (
    typeof value === "string" && ORDERED_STAGES.includes(value as StageType)
  );
}

function requireStageType(value: unknown, context: string): StageType {
  if (isStageType(value)) {
    return value;
  }

  throw new Error(`Invalid production stage in ${context}: ${String(value)}`);
}

function resolveStageOrder(stage: ProductionStageValidationRow): number {
  if (typeof stage.stage_order === "number") {
    return stage.stage_order;
  }

  const index = ORDERED_STAGES.indexOf(
    requireStageType(stage.stage_name, stage.id),
  );
  return index + 1;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates if a stage transition is allowed
 *
 * @param productionQueueId - ID of the production queue item
 * @param targetStageId - ID of the stage to transition to
 * @returns Validation result with error message if invalid
 */
export async function validateStageTransition(
  productionQueueId: string,
  targetStageId: string,
): Promise<StageValidationResult> {
  try {
    // Fetch all stages for this production item
    const { data: stageRows, error } = await stageValidationGateway
      .from("production_stages")
      .select("id, stage_name, status, is_blocked, stage_order")
      .eq("production_queue_id", productionQueueId)
      .order("stage_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch stages: ${error.message}`);
    }

    if (!stageRows || stageRows.length === 0) {
      return {
        isValid: false,
        error: "No stages found for this production item",
        canOverride: false,
        requiresJustification: false,
      };
    }

    const stages: OrderedProductionStageValidationRow[] = stageRows.map(
      (stage) => ({
        ...stage,
        resolvedStageOrder: resolveStageOrder(stage),
      }),
    );

    // Find the target stage
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) {
      return {
        isValid: false,
        error: "Target stage not found",
        canOverride: false,
        requiresJustification: false,
      };
    }

    // Check if target stage is already completed
    if (targetStage.status === "completed") {
      return {
        isValid: false,
        error: "This stage has already been completed",
        canOverride: false,
        requiresJustification: false,
      };
    }

    // Check if target stage is blocked
    if (targetStage.is_blocked) {
      return {
        isValid: false,
        error: "This stage is currently blocked. Please unblock it first.",
        canOverride: false,
        requiresJustification: false,
      };
    }

    // Find the previous stage (if any)
    const previousStage = stages.find(
      (s) => s.resolvedStageOrder === targetStage.resolvedStageOrder - 1,
    );

    // Check if any earlier stages are not completed (stage skipping)
    const incompleteEarlierStages = stages.filter(
      (s) =>
        s.resolvedStageOrder < targetStage.resolvedStageOrder &&
        s.status !== "completed",
    );

    if (incompleteEarlierStages.length > 0) {
      const stageNames = incompleteEarlierStages
        .map((s) => getStageName(s.stage_name))
        .join(", ");
      return {
        isValid: false,
        error: `Cannot skip stages. The following stages must be completed first: ${stageNames}`,
        canOverride: true,
        requiresJustification: true,
      };
    }

    // If this is the first stage, allow it
    if (!previousStage) {
      return {
        isValid: true,
        canOverride: false,
        requiresJustification: false,
      };
    }

    // All validations passed
    return {
      isValid: true,
      canOverride: false,
      requiresJustification: false,
    };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
      canOverride: false,
      requiresJustification: false,
    };
  }
}

/**
 * Validates if a user has admin override permissions
 *
 * @param userId - ID of the user
 * @returns True if user has admin override permissions
 */
export async function canUserOverride(userId: string): Promise<boolean> {
  try {
    await assertCurrentUserId(userId);
    return await currentUserHasAdminAccess();
  } catch {
    return false;
  }
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Logs a stage transition
 *
 * @param productionQueueId - ID of the production queue item
 * @param fromStage - Previous stage (null if starting)
 * @param toStage - New stage
 * @param userId - ID of the user making the transition
 * @param userName - Name of the user
 * @param isOverride - Whether this was an admin override
 * @param justification - Justification for override (if applicable)
 */
export async function logStageTransition(
  productionQueueId: string,
  fromStage: StageType | null,
  toStage: StageType,
  userId: string,
  userName: string,
  isOverride: boolean = false,
  justification: string | null = null,
): Promise<void> {
  try {
    void userId;
    void userName;

    await callAdminRpc(
      "admin_log_stage_transition",
      {
        p_production_queue_id: productionQueueId,
        p_from_stage: fromStage,
        p_to_stage: toStage,
        p_is_override: isOverride,
        p_justification: justification,
      },
    );
  } catch (error) {
    log.error("Failed to log stage transition", { error });
    // Don't throw - logging failure shouldn't block the transition
  }
}

/**
 * Gets the transition history for a production item
 *
 * @param productionQueueId - ID of the production queue item
 * @returns Array of transition logs
 */
export async function getTransitionHistory(
  productionQueueId: string,
): Promise<StageTransitionLog[]> {
  try {
    const { data, error } = await stageValidationGateway
      .from("stage_transition_logs")
      .select(
        "id, production_queue_id, from_stage, to_stage, user_id, user_name, timestamp, is_override, justification",
      )
      .eq("production_queue_id", productionQueueId)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transition history: ${error.message}`);
    }

    return (data || []).map((log) => ({
      id: log.id,
      productionQueueId: log.production_queue_id,
      fromStage: log.from_stage
        ? requireStageType(log.from_stage, log.id)
        : null,
      toStage: requireStageType(log.to_stage, log.id),
      userId: log.user_id,
      userName: log.user_name,
      timestamp: log.timestamp,
      isOverride: log.is_override,
      justification: log.justification,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get transition history: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets a human-readable stage name
 */
function getStageName(stage: string): string {
  return getProductionStageLabel(stage);
}

/**
 * Gets the next stage in sequence
 */
export function getNextStage(currentStage: StageType): StageType | null {
  const currentIndex = ORDERED_STAGES.indexOf(currentStage);
  return currentIndex >= 0 ? (ORDERED_STAGES[currentIndex + 1] ?? null) : null;
}

/**
 * Gets the previous stage in sequence
 */
export function getPreviousStage(currentStage: StageType): StageType | null {
  const currentIndex = ORDERED_STAGES.indexOf(currentStage);
  return currentIndex > 0 ? ORDERED_STAGES[currentIndex - 1] : null;
}

/**
 * Validates a direct stage transition for the production pipeline.
 */
export function isValidStageTransition(
  from: StageType,
  to: StageType,
): boolean {
  const fromIndex = ORDERED_STAGES.indexOf(from);
  const toIndex = ORDERED_STAGES.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }

  if (toIndex === fromIndex + 1) {
    return true;
  }

  if (
    from === "quality_check" &&
    (to === "painting" || to === "post_processing")
  ) {
    return true;
  }

  return false;
}
