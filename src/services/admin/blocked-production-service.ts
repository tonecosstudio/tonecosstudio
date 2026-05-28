import { supabase } from "@/integrations/supabase/client";
import {
  fetchProductionQueue,
  type Priority,
  type ProductionStage,
  unblockProduction,
} from "@/services/admin/production-service";
import { calculateEstimatedCompletion } from "@/services/admin/stage-service";
import { updateProductionStageNotesRpc } from "@/services/admin/admin-production-mutations-service";

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

export async function fetchBlockedProductionItems(): Promise<BlockedProductionItem[]> {
  const queueResponse = await fetchProductionQueue(
    { statuses: ["on_hold"] },
    { page: 1, pageSize: 1000 }
  );

  const blockedItems = await Promise.all(
    queueResponse.data.map(async (item): Promise<BlockedProductionItem> => {
      const { data: stageData } = await supabase
        .from("production_stages")
        .select("block_reason, blocked_at")
        .eq("production_queue_id", item.id)
        .eq("stage_name", item.currentStage)
        .eq("is_blocked", true)
        .maybeSingle();

      const blockedAt = stageData?.blocked_at || new Date().toISOString();
      const blockedDurationMs = Date.now() - new Date(blockedAt).getTime();
      const blockedDurationHours = blockedDurationMs / (1000 * 60 * 60);

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
    })
  );

  return blockedItems.sort((a, b) => b.blockedDurationHours - a.blockedDurationHours);
}

export async function fetchProductionBlockInfo(
  productionQueueId: string
): Promise<ProductionBlockInfo> {
  const { data: queueItem, error: queueError } = await supabase
    .from("production_queue")
    .select("current_stage, production_notes")
    .eq("id", productionQueueId)
    .single();

  if (queueError || !queueItem) {
    throw new Error("Erro ao buscar informacoes do item");
  }

  const currentStage = queueItem.current_stage as ProductionStage;
  const { data: stageData } = await supabase
    .from("production_stages")
    .select("block_reason, blocked_at")
    .eq("production_queue_id", productionQueueId)
    .eq("stage_name", currentStage)
    .eq("is_blocked", true)
    .maybeSingle();

  return {
    blockReason: stageData?.block_reason || queueItem.production_notes || "Motivo nao especificado",
    blockedAt: stageData?.blocked_at || new Date().toISOString(),
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
