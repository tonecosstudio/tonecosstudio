/**
 * Bulk Operations Service
 * 
 * Handles bulk operations on production queue items.
 * Provides functions for bulk assignment, stage updates, and validation.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ProductionStage, ProductionQueueItem } from './production-service';

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
      const { error } = await supabase
        .from('production_queue')
        .update({
          assigned_to: userId,
          assigned_to_name: userName,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) {
        result.failed++;
        result.errors.push(`Item ${itemId}: ${error.message}`);
      } else {
        result.successful++;
      }
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

      // Determine new production status based on stage
      const newStatus = determineProductionStatus(newStage);

      // Update item
      const { error } = await supabase
        .from('production_queue')
        .update({
          current_stage: newStage,
          production_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) {
        result.failed++;
        result.errors.push(`${item.customer_name}: ${error.message}`);
      } else {
        result.successful++;
      }
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
function validateStageTransition(currentStage: string, newStage: string): boolean {
  const stageOrder: Record<string, number> = {
    awaiting_choice: 0,
    design: 1,
    production: 2,
    quality_check: 3,
    packaging: 4,
    shipped: 5,
  };

  const currentOrder = stageOrder[currentStage] ?? -1;
  const newOrder = stageOrder[newStage] ?? -1;

  // Can only move forward one stage at a time, or stay in same stage
  return newOrder >= 0 && newOrder <= currentOrder + 1;
}

/**
 * Determines production status based on stage
 */
function determineProductionStatus(stage: ProductionStage): string {
  switch (stage) {
    case 'awaiting_choice':
      return 'awaiting_choice';
    case 'design':
      return 'ready_for_production';
    case 'production':
    case 'quality_check':
    case 'packaging':
      return 'in_production';
    case 'shipped':
      return 'completed';
    default:
      return 'ready_for_production';
  }
}

/**
 * Translates stage to Portuguese for error messages
 */
function translateStage(stage: string): string {
  const translations: Record<string, string> = {
    awaiting_choice: 'Aguardando Escolha',
    design: 'Design',
    production: 'Produção',
    quality_check: 'Controle de Qualidade',
    packaging: 'Embalagem',
    shipped: 'Enviado',
  };
  return translations[stage] || stage;
}
