import { supabase } from "@/integrations/supabase/client";
import { PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import { log } from "@/lib/logger";
import type { ChoiceStatus, ProductionStage } from "@/types/production";

export type ProductionOrderType = "subscription_delivery" | "standalone_purchase";

const CHOICE_STATUSES = new Set<ChoiceStatus>([
  "pending",
  "submitted",
  "approved",
  "rejected",
  "locked",
  "expired",
]);

function parseProductionStage(value: unknown, context: string): ProductionStage {
  if (
    typeof value === "string" &&
    PRODUCTION_STAGE_ORDER.includes(value as ProductionStage)
  ) {
    return value as ProductionStage;
  }

  throw new Error(`${context}: estágio de produção inválido`);
}

function parseChoiceStatus(value: unknown, context: string): ChoiceStatus {
  if (typeof value === "string" && CHOICE_STATUSES.has(value as ChoiceStatus)) {
    return value as ChoiceStatus;
  }

  throw new Error(`${context}: status de escolha inválido`);
}

function parseOptionalChoiceStatus(
  value: unknown,
  context: string,
): ChoiceStatus | null {
  if (value === null || value === undefined || value === "") return null;
  return parseChoiceStatus(value, context);
}

export interface ProductionInfo {
  id: string;
  orderId: string;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus | null;
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
    throw new Error(`Erro ao buscar informações de produção: ${error.message}`);
  }

  if (!data) return null;
  if (!data.id || !data.order_id) {
    throw new Error("Informações de produção inválidas: identificadores ausentes");
  }

  return {
    id: data.id,
    orderId: data.order_id,
    currentStage: parseProductionStage(data.current_stage, "Informações de produção inválidas"),
    choiceStatus: parseOptionalChoiceStatus(
      data.choice_status,
      "Informações de produção inválidas",
    ),
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
    throw new Error(`Erro ao buscar escolha de personagem: ${error.message}`);
  }

  if (!data) return null;
  if (!data.id) {
    throw new Error("Escolha de personagem inválida: identificador ausente");
  }

  return {
    id: data.id,
    status: parseChoiceStatus(data.status, "Escolha de personagem inválida"),
    deadline: data.deadline,
    characterId: data.character_id,
    characterName: data.character_name || null,
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at,
  };
}
