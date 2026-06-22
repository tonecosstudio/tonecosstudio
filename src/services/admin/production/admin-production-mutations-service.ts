import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type { Tables } from "@/integrations/supabase/types";
import type { ProductionStage } from "@/types/production";

type ProductionQueueRow = Tables<"production_queue">;

function requireProductionRow(data: ProductionQueueRow | null, fallbackMessage: string): ProductionQueueRow {
  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
}

export async function updateProductionStageRpc(
  queueId: string,
  stage: ProductionStage
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_update_production_stage", {
    p_queue_id: queueId,
    p_stage: stage,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function assignProductionRpc(input: {
  queueId: string;
  userId: string;
  reason?: string;
}): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_assign_production", {
    p_queue_id: input.queueId,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function blockProductionRpc(queueId: string, reason: string): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_block_production", {
    p_queue_id: queueId,
    p_reason: reason,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function unblockProductionRpc(queueId: string): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_unblock_production", {
    p_queue_id: queueId,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionScheduleRpc(
  queueId: string,
  scheduledDate: string
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_update_production_schedule", {
    p_queue_id: queueId,
    p_scheduled_date: scheduledDate,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionNotesRpc(
  queueId: string,
  notes: string | null
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<ProductionQueueRow>("admin_update_production_notes", {
    p_queue_id: queueId,
    p_notes: notes,
  });

  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionEstimatedCompletionRpc(
  queueId: string,
  estimatedCompletion: string
): Promise<void> {
  await callAdminRpc("admin_update_production_estimated_completion", {
    p_queue_id: queueId,
    p_estimated_completion: estimatedCompletion,
  });
}

export async function updateProductionStageNotesRpc(input: {
  queueId: string;
  stage: ProductionStage;
  notes: string | null;
}): Promise<void> {
  await callAdminRpc("admin_update_production_stage_notes", {
    p_queue_id: input.queueId,
    p_stage: input.stage,
    p_notes: input.notes,
  });
}
