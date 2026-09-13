import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import type { Tables } from "@/integrations/supabase/types";
import type { ProductionStage } from "@/types/production";

type ProductionQueueRow = Tables<"production_queue">;

function requireProductionRow(
  value: unknown,
  queueId: string,
  operation: string,
): ProductionQueueRow {
  const record = requireAdminRpcRecordMatchingId(value, queueId, operation);

  if (
    typeof record.current_stage !== "string" ||
    !record.current_stage ||
    typeof record.production_status !== "string" ||
    !record.production_status
  ) {
    throw new Error(`${operation} returned invalid production data`);
  }

  return record as unknown as ProductionQueueRow;
}

export async function updateProductionStageRpc(
  queueId: string,
  stage: ProductionStage
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_update_production_stage", {
    p_queue_id: queueId,
    p_stage: stage,
  });
  const row = requireProductionRow(data, queueId, "Production stage update");

  if (row.current_stage !== stage) {
    throw new Error("Production stage update returned an unexpected stage");
  }

  return row;
}

export async function assignProductionRpc(input: {
  queueId: string;
  userId: string;
  reason?: string;
}): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_assign_production", {
    p_queue_id: input.queueId,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
  });
  const row = requireProductionRow(data, input.queueId, "Production assignment");

  if (row.assigned_to !== input.userId) {
    throw new Error("Production assignment returned an unexpected assignee");
  }

  return row;
}

export async function blockProductionRpc(queueId: string, reason: string): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_block_production", {
    p_queue_id: queueId,
    p_reason: reason,
  });
  const row = requireProductionRow(data, queueId, "Production block");

  if (row.production_status !== "on_hold" || row.production_notes !== reason.trim()) {
    throw new Error("Production block returned an unexpected state");
  }

  return row;
}

export async function unblockProductionRpc(queueId: string): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_unblock_production", {
    p_queue_id: queueId,
  });
  const row = requireProductionRow(data, queueId, "Production unblock");

  if (row.production_status === "on_hold") {
    throw new Error("Production unblock returned a blocked state");
  }

  return row;
}

export async function updateProductionScheduleRpc(
  queueId: string,
  scheduledDate: string
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_update_production_schedule", {
    p_queue_id: queueId,
    p_scheduled_date: scheduledDate,
  });
  const row = requireProductionRow(data, queueId, "Production schedule update");

  if (row.scheduled_production_date !== scheduledDate) {
    throw new Error("Production schedule update returned an unexpected date");
  }

  return row;
}

export async function updateProductionNotesRpc(
  queueId: string,
  notes: string | null
): Promise<ProductionQueueRow> {
  const data = await callAdminRpc<unknown>("admin_update_production_notes", {
    p_queue_id: queueId,
    p_notes: notes,
  });
  const row = requireProductionRow(data, queueId, "Production notes update");
  const expectedNotes = notes?.trim() || null;

  if (row.production_notes !== expectedNotes) {
    throw new Error("Production notes update returned unexpected notes");
  }

  return row;
}

export async function updateProductionEstimatedCompletionRpc(
  queueId: string,
  estimatedCompletion: string
): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_update_production_estimated_completion", {
    p_queue_id: queueId,
    p_estimated_completion: estimatedCompletion,
  });

  requireAdminRpcMatchingId(result, queueId, "Production estimated completion update");
}

export async function updateProductionStageNotesRpc(input: {
  queueId: string;
  stage: ProductionStage;
  notes: string | null;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_update_production_stage_notes", {
    p_queue_id: input.queueId,
    p_stage: input.stage,
    p_notes: input.notes,
  });

  requireAdminRpcUuid(result, "Production stage notes update");
}
