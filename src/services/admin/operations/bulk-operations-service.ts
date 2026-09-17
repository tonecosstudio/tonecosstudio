/**
 * Bulk Operations Service
 *
 * Handles bulk operations on production queue items.
 * Provides functions for bulk assignment, stage updates, and validation.
 */

import { supabase } from "@/integrations/supabase/client";
import { getProductionStageLabel, isForwardProductionStageTransition } from "@/config/production-stages";
import {
  assignProductionRpc,
  updateProductionStageRpc,
} from "@/services/admin/production/admin-production-mutations-service";
import {
  fetchProductionQueue,
  type ProductionStage,
} from "@/services/admin/production/production-service";

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Bulk assign production items to a team member
 *
 * @param itemIds - Array of production queue item IDs
 * @param userId - ID of the user to assign to
 * @returns Result with success/failure counts
 */
export async function bulkAssignProduction(
  itemIds: string[],
  userId: string
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  const { data: user } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  const userName = user?.full_name || user?.email || "Usuário";

  for (const itemId of itemIds) {
    try {
      await assignProductionRpc({
        queueId: itemId,
        userId,
        reason: `Atribuicao em massa para ${userName}`,
      });
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Item ${itemId}: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  return result;
}

/**
 * Bulk update production stage with validation.
 */
export async function bulkUpdateStage(
  itemIds: string[],
  newStage: ProductionStage
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  const requestedIds = new Set(itemIds);
  const queue = await fetchProductionQueue({}, { page: 1, pageSize: Number.MAX_SAFE_INTEGER });
  const itemsById = new Map(
    queue.data
      .filter((item) => requestedIds.has(item.id))
      .map((item) => [item.id, item] as const),
  );

  for (const itemId of itemIds) {
    const item = itemsById.get(itemId);
    if (!item) {
      result.failed++;
      result.errors.push(`Item ${itemId}: item de producao nao encontrado`);
      continue;
    }

    try {
      const canTransition = validateStageTransition(item.currentStage, newStage);

      if (!canTransition) {
        result.failed++;
        result.errors.push(
          `${item.customerName}: Não é possível avançar de "${translateStage(item.currentStage)}" para "${translateStage(newStage)}"`,
        );
        continue;
      }

      await updateProductionStageRpc(item.id, newStage);
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `${item.customerName}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    }
  }

  return result;
}

function validateStageTransition(currentStage: string | null, newStage: string): boolean {
  return isForwardProductionStageTransition(currentStage, newStage);
}

function translateStage(stage: string | null): string {
  if (!stage) return "Sem etapa";
  return getProductionStageLabel(stage);
}
