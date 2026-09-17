import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import type { ProductionStage } from "@/types/production";

function requireSnapshotField(
  record: Record<string, unknown>,
  field: string,
  operation: string,
): unknown {
  if (!(field in record)) {
    throw new Error(`${operation} returned incomplete production data`);
  }

  return record[field];
}

export async function updateProductionStageRpc(
  queueId: string,
  stage: ProductionStage
): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_update_production_stage", {
    p_queue_id: queueId,
    p_stage: stage,
  });
  const record = requireAdminRpcRecordMatchingId(data, queueId, "Production stage update");

  if (requireSnapshotField(record, "current_stage", "Production stage update") !== stage) {
    throw new Error("Production stage update returned an unexpected stage");
  }
}

export async function assignProductionRpc(input: {
  queueId: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_assign_production", {
    p_queue_id: input.queueId,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
  });
  const record = requireAdminRpcRecordMatchingId(data, input.queueId, "Production assignment");

  if (requireSnapshotField(record, "assigned_to", "Production assignment") !== input.userId) {
    throw new Error("Production assignment returned an unexpected assignee");
  }
}

export async function blockProductionRpc(queueId: string, reason: string): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_block_production", {
    p_queue_id: queueId,
    p_reason: reason,
  });
  const record = requireAdminRpcRecordMatchingId(data, queueId, "Production block");

  if (
    requireSnapshotField(record, "production_status", "Production block") !== "on_hold" ||
    requireSnapshotField(record, "production_notes", "Production block") !== reason.trim()
  ) {
    throw new Error("Production block returned an unexpected state");
  }
}

export async function unblockProductionRpc(queueId: string): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_unblock_production", {
    p_queue_id: queueId,
  });
  const record = requireAdminRpcRecordMatchingId(data, queueId, "Production unblock");

  if (requireSnapshotField(record, "production_status", "Production unblock") === "on_hold") {
    throw new Error("Production unblock returned a blocked state");
  }
}

export async function updateProductionScheduleRpc(
  queueId: string,
  scheduledDate: string
): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_update_production_schedule", {
    p_queue_id: queueId,
    p_scheduled_date: scheduledDate,
  });
  const record = requireAdminRpcRecordMatchingId(data, queueId, "Production schedule update");

  if (
    requireSnapshotField(record, "scheduled_production_date", "Production schedule update") !== scheduledDate
  ) {
    throw new Error("Production schedule update returned an unexpected date");
  }
}

export async function updateProductionNotesRpc(
  queueId: string,
  notes: string | null
): Promise<void> {
  const data = await callAdminRpc<unknown>("admin_update_production_notes", {
    p_queue_id: queueId,
    p_notes: notes,
  });
  const record = requireAdminRpcRecordMatchingId(data, queueId, "Production notes update");
  const expectedNotes = notes?.trim() || null;

  if (requireSnapshotField(record, "production_notes", "Production notes update") !== expectedNotes) {
    throw new Error("Production notes update returned unexpected notes");
  }
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
