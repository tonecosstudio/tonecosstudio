import { supabase } from "@/integrations/supabase/client";
import { PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import {
  fetchProductionQueue,
  type Priority,
  type ProductionStage,
  unblockProduction,
} from "@/services/admin/production/production-service";
import { calculateEstimatedCompletion } from "@/services/admin/production/stage-service";
import { updateProductionStageNotesRpc } from "@/services/admin/production/admin-production-mutations-service";

export interface BlockedProductionItem {
  id: string;
  customerName: string;
  customerEmail: string;
  collectionName: string;
  characterName: string | null;
  currentStage: ProductionStage;
  blockReason: string;
  blockedAt: string;
  blockedDurationHours: number;
  assignedToName: string | null;
  priority: Priority;
}

export interface ProductionBlockInfo {
  blockReason: string;
  blockedAt: string;
  currentStage: ProductionStage;
}

export interface UnblockBlockedProductionItemInput {
  productionQueueId: string;
  resolutionNotes?: string;
}

function parseProductionStage(value: unknown, queueId: string): ProductionStage {
  if (
    typeof value === "string" &&
    PRODUCTION_STAGE_ORDER.includes(value as ProductionStage)
  ) {
    return value as ProductionStage;
  }

  throw new Error(`Fila de producao ${queueId} possui estagio bloqueado invalido`);
}

export async function fetchBlockedProductionItems(): Promise<BlockedProductionItem[]> {
  const queueResponse = await fetchProductionQueue(
    { statuses: ["on_hold"] },
    { page: 1, pageSize: Number.MAX_SAFE_INTEGER },
  );

  const blockedItems = await Promise.all(
    queueResponse.data.map(async (item): Promise<BlockedProductionItem> => {
      const { data: stageData, error: stageError } = await supabase
        .from("production_stages")
        .select("block_reason, blocked_at")
        .eq("production_queue_id", item.id)
        .eq("stage_name", item.currentStage)
        .eq("is_blocked", true)
        .maybeSingle();

      if (stageError) {
        throw new Error(`Erro ao buscar bloqueio da fila ${item.id}: ${stageError.message}`);
      }

      const blockedAt = stageData?.blocked_at ?? item.updatedAt;
      const blockedDurationMs = Date.now() - new Date(blockedAt).getTime();
      const blockedDurationHours = Math.max(0, blockedDurationMs / (1000 * 60 * 60));

      return {
        id: item.id,
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        collectionName: item.collectionName,
        characterName: item.characterName,
        currentStage: item.currentStage,
        blockReason: stageData?.block_reason || item.productionNotes || "Motivo nao especificado",
        blockedAt,
        blockedDurationHours,
        assignedToName: item.assignedToName,
        priority: item.priority,
      };
    }),
  );

  return blockedItems.sort((a, b) => b.blockedDurationHours - a.blockedDurationHours);
}

export async function fetchProductionBlockInfo(
  productionQueueId: string,
): Promise<ProductionBlockInfo> {
  const { data: queueItem, error: queueError } = await supabase
    .from("production_queue")
    .select("id, admin_notes")
    .eq("id", productionQueueId)
    .single();

  if (queueError || !queueItem) {
    throw new Error("Erro ao buscar informacoes do item");
  }

  const { data: stageData, error: stageError } = await supabase
    .from("production_stages")
    .select("stage_name, block_reason, blocked_at")
    .eq("production_queue_id", productionQueueId)
    .eq("is_blocked", true)
    .order("stage_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (stageError) {
    throw new Error(`Erro ao buscar estagio bloqueado: ${stageError.message}`);
  }
  if (!stageData) {
    throw new Error("Item de producao nao possui estagio bloqueado");
  }

  const currentStage = parseProductionStage(stageData.stage_name, productionQueueId);

  return {
    blockReason: stageData.block_reason || queueItem.admin_notes || "Motivo nao especificado",
    blockedAt: stageData.blocked_at || queueItem.updated_at,
    currentStage,
  };
}

export async function fetchEstimatedProductionCompletion(productionQueueId: string): Promise<Date> {
  return calculateEstimatedCompletion(productionQueueId);
}

export async function unblockBlockedProductionItem({
  productionQueueId,
  resolutionNotes,
}: UnblockBlockedProductionItemInput) {
  const blockInfo = await fetchProductionBlockInfo(productionQueueId);
  const notes = resolutionNotes?.trim();

  if (notes) {
    await updateProductionStageNotesRpc({
      queueId: productionQueueId,
      stage: blockInfo.currentStage,
      notes,
    });
  }

  return unblockProduction(productionQueueId);
}
