import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { ChoiceStatus, ProductionStage } from "@/types/production";

export type ProductionOrderType = "subscription_delivery" | "standalone_purchase";

export interface ProductionInfo {
  id: string;
  orderId: string;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  characterName: string | null;
  estimatedCompletionDate: string | null;
}

export interface CharacterChoiceInfo {
  id: string;
  status: ChoiceStatus;
  deadline: string | null;
  characterId: string | null;
  characterName: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

export async function fetchProductionInfo(
  orderId: string | null,
  orderType: ProductionOrderType | null,
): Promise<ProductionInfo | null> {
  if (!orderId || !orderType) return null;

  const { data, error } = await supabase
    .from("production_queue")
    .select(
      "id, order_id, current_stage, choice_status, choice_deadline, character_name, estimated_completion_date",
    )
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .maybeSingle();

  if (error) {
    log.error("Failed to fetch production info", { error, orderId, orderType });
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    orderId: data.order_id,
    currentStage: data.current_stage as ProductionStage,
    choiceStatus: data.choice_status as ChoiceStatus,
    choiceDeadline: data.choice_deadline,
    characterName: data.character_name,
    estimatedCompletionDate: data.estimated_completion_date,
  };
}

export async function fetchCharacterChoiceInfo(
  orderId: string | null,
  orderType: ProductionOrderType | null,
): Promise<CharacterChoiceInfo | null> {
  if (!orderId || !orderType) return null;

  const { data, error } = await supabase
    .from("character_choices")
    .select("id, status, deadline, character_id, character_name, submitted_at, approved_at")
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .maybeSingle();

  if (error) {
    log.error("Failed to fetch character choice info", { error, orderId, orderType });
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    status: data.status as ChoiceStatus,
    deadline: data.deadline,
    characterId: data.character_id,
    characterName: data.character_name || null,
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at,
  };
}
