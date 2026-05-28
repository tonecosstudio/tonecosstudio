import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ProductionStage } from "@/types/production";

type ProductionQueueRow = Tables<"production_queue">;

interface AdminProductionRpcError {
  message: string;
}

interface AdminProductionRpcClient {
  rpc(
    name: "admin_update_production_stage",
    args: { p_queue_id: string; p_stage: string }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_assign_production",
    args: { p_queue_id: string; p_user_id: string; p_reason?: string | null }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_block_production",
    args: { p_queue_id: string; p_reason: string }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_unblock_production",
    args: { p_queue_id: string }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_update_production_schedule",
    args: { p_queue_id: string; p_scheduled_date: string }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_update_production_notes",
    args: { p_queue_id: string; p_notes: string | null }
  ): Promise<{ data: ProductionQueueRow | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_update_production_estimated_completion",
    args: { p_queue_id: string; p_estimated_completion: string }
  ): Promise<{ data: string | null; error: AdminProductionRpcError | null }>;
  rpc(
    name: "admin_update_production_stage_notes",
    args: { p_queue_id: string; p_stage: string; p_notes: string | null }
  ): Promise<{ data: string | null; error: AdminProductionRpcError | null }>;
}

const adminProductionRpc = supabase as unknown as AdminProductionRpcClient;

function requireProductionRow(data: ProductionQueueRow | null, fallbackMessage: string): ProductionQueueRow {
  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
}

function throwRpcError(error: AdminProductionRpcError | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProductionStageRpc(
  queueId: string,
  stage: ProductionStage
): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_update_production_stage", {
    p_queue_id: queueId,
    p_stage: stage,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function assignProductionRpc(input: {
  queueId: string;
  userId: string;
  reason?: string;
}): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_assign_production", {
    p_queue_id: input.queueId,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function blockProductionRpc(queueId: string, reason: string): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_block_production", {
    p_queue_id: queueId,
    p_reason: reason,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function unblockProductionRpc(queueId: string): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_unblock_production", {
    p_queue_id: queueId,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionScheduleRpc(
  queueId: string,
  scheduledDate: string
): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_update_production_schedule", {
    p_queue_id: queueId,
    p_scheduled_date: scheduledDate,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionNotesRpc(
  queueId: string,
  notes: string | null
): Promise<ProductionQueueRow> {
  const { data, error } = await adminProductionRpc.rpc("admin_update_production_notes", {
    p_queue_id: queueId,
    p_notes: notes,
  });

  throwRpcError(error);
  return requireProductionRow(data, "Item de producao nao encontrado");
}

export async function updateProductionEstimatedCompletionRpc(
  queueId: string,
  estimatedCompletion: string
): Promise<void> {
  const { error } = await adminProductionRpc.rpc("admin_update_production_estimated_completion", {
    p_queue_id: queueId,
    p_estimated_completion: estimatedCompletion,
  });

  throwRpcError(error);
}

export async function updateProductionStageNotesRpc(input: {
  queueId: string;
  stage: ProductionStage;
  notes: string | null;
}): Promise<void> {
  const { error } = await adminProductionRpc.rpc("admin_update_production_stage_notes", {
    p_queue_id: input.queueId,
    p_stage: input.stage,
    p_notes: input.notes,
  });

  throwRpcError(error);
}
