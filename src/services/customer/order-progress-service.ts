import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  PRODUCTION_STAGE_ORDER,
  getProductionStageLabel,
} from "@/config/production-stages";
import type { ChoiceStatus, ProductionStage } from "@/types/production";

export type CustomerOrderType = "subscription_delivery" | "standalone_purchase";

export type CustomerOrderProgressStage = {
  name: ProductionStage;
  displayName: string;
  status: "completed" | "current" | "upcoming";
  completedAt: string | null;
  order: number;
};

export type CustomerOrderProgress = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderType: CustomerOrderType;
  collectionId: string;
  collectionName: string;
  collectionImageUrl: string | null;
  currentStage: ProductionStage;
  productionStatus: string;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceId: string | null;
  characterId: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  estimatedCompletionDate: string | null;
  estimatedShippingDate: string | null;
  estimatedDeliveryDate: string | null;
  trackingCode: string | null;
  trackingCarrier: string | null;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  stages: CustomerOrderProgressStage[];
};

type ProductionQueueProgressRow = {
  id: string;
  order_id: string;
  order_type: string;
  user_id: string;
  current_stage: string | null;
  production_status: string | null;
  choice_status: string | null;
  choice_deadline: string | null;
  character_id: string | null;
  character_name: string | null;
  estimated_completion_date: string | null;
  production_started_at: string | null;
  production_completed_at: string | null;
  collection_id: string | null;
  collection_name: string | null;
  tracking_code: string | null;
  tracking_carrier?: string | null;
};

type ProductionStageRow = {
  stage_name: string | null;
  completed_at: string | null;
};

type QuerySingleResult<T> = {
  data: T | null;
  error: Error | null;
};

type QueryListResult<T> = {
  data: T[] | null;
  error: Error | null;
};

function toProductionStage(stage: string | null): ProductionStage {
  return PRODUCTION_STAGE_ORDER.includes(stage as ProductionStage)
    ? (stage as ProductionStage)
    : "awaiting_payment";
}

function toChoiceStatus(status: string | null): ChoiceStatus {
  const allowed: ChoiceStatus[] = ["pending", "submitted", "approved", "rejected", "locked", "expired"];
  return allowed.includes(status as ChoiceStatus) ? (status as ChoiceStatus) : "pending";
}

function toOrderType(orderType: string): CustomerOrderType {
  return orderType === "standalone_purchase" ? "standalone_purchase" : "subscription_delivery";
}

function addDays(date: string | null, days: number) {
  if (!date) return null;
  return new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchCollectionImageUrl(collectionId: string | null) {
  if (!collectionId) return null;

  const { data } = (await supabase
    .from("collections")
    .select("cover_image_url")
    .eq("id", collectionId)
    .maybeSingle()) as unknown as QuerySingleResult<{ cover_image_url: string | null }>;

  return data?.cover_image_url ?? null;
}

async function fetchCharacterImageUrl(characterId: string | null) {
  if (!characterId) return null;

  const { data } = (await supabase
    .from("collection_characters")
    .select("image_url")
    .eq("id", characterId)
    .maybeSingle()) as unknown as QuerySingleResult<{ image_url: string | null }>;

  return data?.image_url ?? null;
}

async function fetchProductionStages(productionQueueId: string) {
  const { data, error } = (await supabase
    .from("production_stages")
    .select("stage_name, completed_at")
    .eq("production_queue_id", productionQueueId)
    .order("stage_order", { ascending: true })) as unknown as QueryListResult<ProductionStageRow>;

  if (error) throw error;
  return data ?? [];
}

async function fetchChoiceId(productionData: ProductionQueueProgressRow) {
  if (productionData.choice_status === "pending") return null;

  const { data, error } = (await supabase
    .from("character_choices")
    .select("id")
    .eq("order_id", productionData.order_id)
    .eq("order_type", productionData.order_type)
    .eq("user_id", productionData.user_id)
    .maybeSingle()) as unknown as QuerySingleResult<{ id: string }>;

  if (error) throw error;
  return data?.id ?? null;
}

function buildStages(
  currentStage: ProductionStage,
  stagesData: ProductionStageRow[]
): CustomerOrderProgressStage[] {
  const currentStageOrder = PRODUCTION_STAGE_ORDER.indexOf(currentStage);

  return PRODUCTION_STAGE_ORDER.map((stage, index) => {
    const stageData = stagesData.find((item) => item.stage_name === stage);
    const status =
      index < currentStageOrder ? "completed" : index === currentStageOrder ? "current" : "upcoming";

    return {
      name: stage,
      displayName: getProductionStageLabel(stage),
      status,
      completedAt: stageData?.completed_at ?? null,
      order: index + 1,
    };
  });
}

export async function fetchCustomerOrderProgress(
  orderId: string,
  orderType: string
): Promise<CustomerOrderProgress> {
  if (!orderId || !orderType) {
    throw new Error("ID do pedido ou tipo nao fornecido");
  }

  const userId = await requireAuthenticatedUserId();

  const { data: productionData, error: productionError } = (await supabase
    .from("production_queue")
    .select(
      `
        id,
        order_id,
        order_type,
        user_id,
        current_stage,
        production_status,
        choice_status,
        choice_deadline,
        character_id,
        character_name,
        estimated_completion_date,
        production_started_at,
        production_completed_at,
        collection_id,
        collection_name,
        tracking_code,
        tracking_carrier
      `
    )
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .eq("user_id", userId)
    .maybeSingle()) as unknown as QuerySingleResult<ProductionQueueProgressRow>;

  if (productionError) throw productionError;
  if (!productionData) throw new Error("Pedido nao encontrado na fila de producao");

  const currentStage = toProductionStage(productionData.current_stage);
  const [collectionImageUrl, characterImageUrl, stagesData, choiceId] = await Promise.all([
    fetchCollectionImageUrl(productionData.collection_id),
    fetchCharacterImageUrl(productionData.character_id),
    fetchProductionStages(productionData.id),
    fetchChoiceId(productionData),
  ]);

  const estimatedShippingDate = addDays(productionData.estimated_completion_date, 2);
  const estimatedDeliveryDate = addDays(estimatedShippingDate, 7);

  return {
    id: productionData.id,
    orderId: productionData.order_id,
    orderNumber: productionData.order_id.slice(0, 8),
    orderType: toOrderType(productionData.order_type),
    collectionId: productionData.collection_id ?? "",
    collectionName: productionData.collection_name ?? "Colecao nao definida",
    collectionImageUrl,
    currentStage,
    productionStatus: productionData.production_status ?? "awaiting_choice",
    choiceStatus: toChoiceStatus(productionData.choice_status),
    choiceDeadline: productionData.choice_deadline,
    choiceId,
    characterId: productionData.character_id,
    characterName: productionData.character_name,
    characterImageUrl,
    estimatedCompletionDate: productionData.estimated_completion_date,
    estimatedShippingDate,
    estimatedDeliveryDate,
    trackingCode: productionData.tracking_code,
    trackingCarrier: productionData.tracking_carrier ?? null,
    productionStartedAt: productionData.production_started_at,
    productionCompletedAt: productionData.production_completed_at,
    stages: buildStages(currentStage, stagesData),
  };
}
