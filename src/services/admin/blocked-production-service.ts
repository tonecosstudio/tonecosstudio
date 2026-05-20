import { supabase } from "@/integrations/supabase/client";
import {
  fetchProductionQueue,
  type Priority,
  type ProductionStage,
} from "@/services/admin/production-service";

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
