/**
 * Bulk Operations Service
 * 
 * Handles bulk operations on production queue items.
 * Provides functions for bulk assignment, stage updates, and validation.
 */

import { supabase } from '@/integrations/supabase/client';
import { getProductionStageLabel, isForwardProductionStageTransition } from '@/config/production-stages';
import {
  assignProductionRpc,
  updateProductionStageRpc,
} from "@/services/admin/production/admin-production-mutations-service";
import type { ProductionStage } from "@/services/admin/production/production-service";

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

  // Fetch user name
  const { data: user } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  const userName = user?.full_name || user?.email || 'Usuário';

  // Process each item
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
      result.errors.push(`Item ${itemId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  return result;
}

/**
 * Bulk update production stage with validation
 * 
 * Validates stage transitions and only updates items that can progress.
 * 
 * @param itemIds - Array of production queue item IDs
 * @param newStage - New stage to set
 * @returns Result with success/failure counts
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

  // Fetch all items to validate transitions
  const { data: items, error: fetchError } = await supabase
    .from('production_queue')
    .select('id, current_stage, customer_name')
    .in('id', itemIds);

  if (fetchError) {
    result.failed = itemIds.length;
    result.errors.push(`Erro ao buscar itens: ${fetchError.message}`);
    return result;
  }

  // Process each item
  for (const item of items || []) {
    try {
      // Validate stage transition
      const canTransition = validateStageTransition(item.current_stage, newStage);

      if (!canTransition) {
        result.failed++;
        result.errors.push(
          `${item.customer_name}: Não é possível avançar de "${translateStage(item.current_stage)}" para "${translateStage(newStage)}"`
        );
        continue;
      }

      await updateProductionStageRpc(item.id, newStage);
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `${item.customer_name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  return result;
}

/**
 * Validates if a stage transition is allowed
 * 
 * Stages must be completed in order:
 * awaiting_choice → design → production → quality_check → packaging → shipped
 */
function validateStageTransition(currentStage: string | null, newStage: string): boolean {
  return isForwardProductionStageTransition(currentStage, newStage);
}

/**
 * Translates stage to Portuguese for error messages
 */
function translateStage(stage: string | null): string {
  if (!stage) return "Sem etapa";
  return getProductionStageLabel(stage);
}
