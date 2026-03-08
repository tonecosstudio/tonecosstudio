/**
 * Stage Validation Service
 *
 * Validates production stage transitions to ensure:
 * - Stages are completed in order
 * - No stage skipping without admin override
 * - All transitions are logged
 */
// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { StageType, ProductionStageRecord } from "./stage-service";

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

// Stage order mapping
const STAGE_ORDER: Record<StageType, number> = {
  awaiting_payment: 1,
  payment_confirmed: 2,
  awaiting_choice: 3,
  model_preparation: 4,
  printing: 5,
  post_processing: 6,
  painting: 7,
  quality_check: 8,
  packaging: 9,
  ready_to_ship: 10,
  shipped: 11,
  delivered: 12,
};

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
  targetStageId: string
): Promise<StageValidationResult> {
  try {
    // Fetch all stages for this production item
    const { data: stages, error } = await supabase
      .from("production_stages")
      .select("*")
      .eq("production_queue_id", productionQueueId)
      .order("stage_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch stages: ${error.message}`);
    }

    if (!stages || stages.length === 0) {
      return {
        isValid: false,
        error: "No stages found for this production item",
        canOverride: false,
        requiresJustification: false,
      };
    }

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
    const previousStage = stages.find((s) => s.stage_order === targetStage.stage_order - 1);

    // Check if any earlier stages are not completed (stage skipping)
    const incompleteEarlierStages = stages.filter(
      (s) => s.stage_order < targetStage.stage_order && s.status !== "completed"
    );

    if (incompleteEarlierStages.length > 0) {
      const stageNames = incompleteEarlierStages.map((s) => getStageName(s.stage_name)).join(", ");
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
      error: error instanceof Error ? error.message : "Unknown validation error",
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
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (error) {
      return false;
    }

    return !!data;
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
  justification: string | null = null
): Promise<void> {
  try {
    const { error } = await supabase.from("stage_transition_logs").insert({
      production_queue_id: productionQueueId,
      from_stage: fromStage,
      to_stage: toStage,
      user_id: userId,
      user_name: userName,
      is_override: isOverride,
      justification: justification,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log stage transition:", error);
      // Don't throw - logging failure shouldn't block the transition
    }
  } catch (error) {
    console.error("Failed to log stage transition:", error);
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
  productionQueueId: string
): Promise<StageTransitionLog[]> {
  try {
    const { data, error } = await supabase
      .from("stage_transition_logs")
      .select("*")
      .eq("production_queue_id", productionQueueId)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transition history: ${error.message}`);
    }

    return (data || []).map((log) => ({
      id: log.id,
      productionQueueId: log.production_queue_id,
      fromStage: log.from_stage,
      toStage: log.to_stage,
      userId: log.user_id,
      userName: log.user_name,
      timestamp: log.timestamp,
      isOverride: log.is_override,
      justification: log.justification,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get transition history: ${error instanceof Error ? error.message : "Unknown error"}`
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
  const names: Record<string, string> = {
    awaiting_payment: "Aguardando Pagamento",
    payment_confirmed: "Pagamento Confirmado",
    awaiting_choice: "Aguardando Escolha",
    model_preparation: "Preparação do Modelo",
    printing: "Em Impressão 3D",
    post_processing: "Limpeza e Preparação",
    painting: "Pintura Artesanal",
    quality_check: "Controle de Qualidade",
    packaging: "Embalagem",
    ready_to_ship: "Pronto para Envio",
    shipped: "Enviado",
    delivered: "Entregue",
  };
  return names[stage] || stage;
}

/**
 * Gets the next stage in sequence
 */
export function getNextStage(currentStage: StageType): StageType | null {
  const order = STAGE_ORDER[currentStage];
  const nextStageEntry = Object.entries(STAGE_ORDER).find(([_, o]) => o === order + 1);
  return nextStageEntry ? (nextStageEntry[0] as StageType) : null;
}

/**
 * Gets the previous stage in sequence
 */
export function getPreviousStage(currentStage: StageType): StageType | null {
  const order = STAGE_ORDER[currentStage];
  const prevStageEntry = Object.entries(STAGE_ORDER).find(([_, o]) => o === order - 1);
  return prevStageEntry ? (prevStageEntry[0] as StageType) : null;
}
