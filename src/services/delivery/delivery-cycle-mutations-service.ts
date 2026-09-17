import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

interface RpcError {
  message: string;
}

function unwrapRpc(
  errorPrefix: string,
  data: unknown,
  error: RpcError | null,
): unknown {
  if (error) {
    throw new Error(`${errorPrefix}: ${error.message}`);
  }

  if (data === null || data === undefined) {
    throw new Error(`${errorPrefix}: resposta vazia`);
  }

  return data;
}

function requireCycleRecord(
  value: unknown,
  operation: string,
): Record<string, unknown> {
  const record = requireAdminRpcRecord(value, operation);
  requireAdminRpcUuid(record.id, operation);

  if (
    !Number.isInteger(record.cycle_number) ||
    !Number.isInteger(record.month) ||
    !Number.isInteger(record.year) ||
    typeof record.status !== "string" ||
    !record.status.trim()
  ) {
    throw new Error(`${operation} returned invalid cycle data`);
  }

  return record;
}

function requireDeliveryRecord(
  value: unknown,
  operation: string,
  expectedId?: string,
): Record<string, unknown> {
  const record = expectedId
    ? requireAdminRpcRecordMatchingId(value, expectedId, operation)
    : requireAdminRpcRecord(value, operation);

  if (!expectedId) {
    requireAdminRpcUuid(record.id, operation);
  }

  requireAdminRpcUuid(record.subscription_id, operation);
  if (record.cycle_id !== null && record.cycle_id !== undefined) {
    requireAdminRpcUuid(record.cycle_id, operation);
  }

  if (typeof record.status !== "string" || !record.status.trim()) {
    throw new Error(`${operation} returned invalid delivery data`);
  }

  return record;
}

function requireBonusRecord(
  value: unknown,
  operation: string,
  expectedId?: string,
): Record<string, unknown> {
  const record = expectedId
    ? requireAdminRpcRecordMatchingId(value, expectedId, operation)
    : requireAdminRpcRecord(value, operation);

  if (!expectedId) {
    requireAdminRpcUuid(record.id, operation);
  }

  requireAdminRpcUuid(record.subscription_id, operation);
  if (record.delivery_id !== null && record.delivery_id !== undefined) {
    requireAdminRpcUuid(record.delivery_id, operation);
  }

  if (typeof record.status !== "string" || !record.status.trim()) {
    throw new Error(`${operation} returned invalid bonus data`);
  }

  return record;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getOrCreateDeliveryCycleRpc<TCycle>(
  cycleNumber: number,
  month: number,
  year: number,
  capacity?: number,
): Promise<TCycle> {
  try {
    const data = await callAdminRpc<unknown>("admin_get_or_create_delivery_cycle", {
      p_cycle_number: cycleNumber,
      p_month: month,
      p_year: year,
      ...(capacity === undefined ? {} : { p_capacity: capacity }),
    });
    const cycle = requireCycleRecord(data, "Delivery cycle get/create");

    if (
      cycle.cycle_number !== cycleNumber ||
      cycle.month !== month ||
      cycle.year !== year
    ) {
      throw new Error("Delivery cycle get/create returned an unexpected cycle");
    }

    return cycle as unknown as TCycle;
  } catch (error) {
    throw new Error(
      `Erro ao obter ou criar ciclo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function transitionDeliveryCycleStatusRpc<TCycle>(
  cycleId: string,
  status: string,
): Promise<TCycle> {
  try {
    const data = await callAdminRpc<unknown>("admin_transition_delivery_cycle_status", {
      p_cycle_id: cycleId,
      p_status: status,
    });
    const cycle = requireCycleRecord(data, "Delivery cycle status transition");

    if (cycle.id !== cycleId || cycle.status !== status.trim().toLowerCase()) {
      throw new Error("Delivery cycle status transition returned an unexpected state");
    }

    return cycle as unknown as TCycle;
  } catch (error) {
    throw new Error(
      `Erro ao atualizar status do ciclo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function scheduleSubscriptionDeliveriesRpc<TDelivery>(
  subscriptionId: string,
  planType: string,
  entryCycleId: string,
): Promise<TDelivery[]> {
  const normalizedPlanType = planType.trim().toLowerCase();
  const expectedCount = normalizedPlanType === "trimestral" ? 3 : normalizedPlanType === "semestral" ? 6 : 0;

  if (expectedCount === 0) {
    throw new Error("Tipo de plano invalido ao agendar entregas");
  }

  const result = await callAdminRpc<unknown>("admin_schedule_subscription_deliveries", {
    p_subscription_id: subscriptionId,
    p_plan_type: planType,
    p_entry_cycle_id: entryCycleId,
  });
  const envelope = requireAdminRpcRecord(result, "Subscription delivery scheduling");

  if (!Array.isArray(envelope.deliveries) || envelope.deliveries.length !== expectedCount) {
    throw new Error("Resposta inválida ao agendar entregas da assinatura");
  }

  const deliveries = envelope.deliveries.map((value, index) => {
    const delivery = requireDeliveryRecord(value, "Subscription delivery scheduling");
    const deliveryNumber = delivery.delivery_number ?? delivery.delivery_order;

    if (
      delivery.subscription_id !== subscriptionId ||
      delivery.status !== "scheduled" ||
      deliveryNumber !== index + 1 ||
      typeof delivery.cycle_id !== "string"
    ) {
      throw new Error("Resposta inconsistente ao agendar entregas da assinatura");
    }

    return delivery;
  });

  if (normalizedPlanType === "trimestral") {
    if (envelope.bonusPiece !== null) {
      throw new Error("Resposta inconsistente ao agendar entregas da assinatura");
    }
  } else {
    const bonus = requireBonusRecord(envelope.bonusPiece, "Semestral bonus creation");
    const sixthDeliveryId = deliveries[5].id;

    if (
      bonus.subscription_id !== subscriptionId ||
      bonus.delivery_id !== sixthDeliveryId ||
      bonus.status !== "pending"
    ) {
      throw new Error("Resposta inconsistente ao criar peca bonus semestral");
    }
  }

  return deliveries as unknown as TDelivery[];
}

export async function updateDeliveryStatusRpc<TDelivery>(
  deliveryId: string,
  status: string,
): Promise<TDelivery> {
  try {
    const data = await callAdminRpc<unknown>("admin_update_delivery_status_legacy", {
      p_delivery_id: deliveryId,
      p_status: status,
    });
    const delivery = requireDeliveryRecord(data, "Delivery status update", deliveryId);

    if (delivery.status !== status.trim().toLowerCase()) {
      throw new Error("Delivery status update returned an unexpected status");
    }

    return delivery as unknown as TDelivery;
  } catch (error) {
    throw new Error(
      `Erro ao atualizar status da entrega: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function assignDeliveryToCycleRpc<TDelivery>(
  deliveryId: string,
  cycleId: string,
): Promise<TDelivery> {
  try {
    const data = await callAdminRpc<unknown>("admin_assign_delivery_to_cycle", {
      p_delivery_id: deliveryId,
      p_cycle_id: cycleId,
    });
    const delivery = requireDeliveryRecord(data, "Delivery cycle assignment", deliveryId);

    if (delivery.cycle_id !== cycleId) {
      throw new Error("Delivery cycle assignment returned an unexpected cycle");
    }

    return delivery as unknown as TDelivery;
  } catch (error) {
    throw new Error(
      `Erro ao associar entrega ao ciclo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function changeDeliveryCharacterRpc<TDelivery>(
  deliveryId: string,
  characterId: string,
): Promise<TDelivery> {
  const { data, error } = await supabase.rpc(
    "change_delivery_character_for_current_user",
    {
      p_delivery_id: deliveryId,
      p_character_id: characterId,
    },
  );
  const value = unwrapRpc("Erro ao trocar personagem", data, error);
  const delivery = requireDeliveryRecord(value, "Delivery character change", deliveryId);

  if (delivery.character_id !== characterId) {
    throw new Error("Erro ao trocar personagem: resposta inconsistente");
  }

  return delivery as unknown as TDelivery;
}

export async function createBonusPieceRpc<TBonus>(
  subscriptionId: string,
  description?: string | null,
): Promise<TBonus> {
  try {
    const data = await callAdminRpc<unknown>("admin_create_bonus_piece", {
      p_subscription_id: subscriptionId,
      p_description: description ?? null,
    });
    const bonus = requireBonusRecord(data, "Bonus piece creation");

    if (
      bonus.subscription_id !== subscriptionId ||
      bonus.status !== "pending" ||
      bonus.description !== normalizeOptionalText(description)
    ) {
      throw new Error("Bonus piece creation returned inconsistent data");
    }

    return bonus as unknown as TBonus;
  } catch (error) {
    throw new Error(
      `Erro ao criar peca bonus: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function linkBonusPieceToDeliveryRpc<TBonus>(
  bonusId: string,
  deliveryId: string,
): Promise<TBonus> {
  try {
    const data = await callAdminRpc<unknown>("admin_link_bonus_piece_to_delivery", {
      p_bonus_id: bonusId,
      p_delivery_id: deliveryId,
    });
    const bonus = requireBonusRecord(data, "Bonus piece delivery link", bonusId);

    if (bonus.delivery_id !== deliveryId) {
      throw new Error("Bonus piece delivery link returned an unexpected delivery");
    }

    return bonus as unknown as TBonus;
  } catch (error) {
    throw new Error(
      `Erro ao vincular peca bonus a entrega: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function updateBonusPieceStatusRpc<TBonus>(
  bonusId: string,
  status: string,
): Promise<TBonus> {
  try {
    const data = await callAdminRpc<unknown>("admin_update_bonus_piece_status", {
      p_bonus_id: bonusId,
      p_status: status,
    });
    const bonus = requireBonusRecord(data, "Bonus piece status update", bonusId);

    if (bonus.status !== status.trim().toLowerCase()) {
      throw new Error("Bonus piece status update returned an unexpected status");
    }

    return bonus as unknown as TBonus;
  } catch (error) {
    throw new Error(
      `Erro ao atualizar status da peca bonus: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

export async function changeCollectionChoiceForCurrentUserRpc<TResult>(
  deliveryId: string,
  newCollectionId: string,
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<TResult> {
  const { data, error } = await supabase.rpc(
    "change_delivery_collection_choice_for_current_user",
    {
      p_delivery_id: deliveryId,
      p_new_collection_id: newCollectionId,
      p_user_id: userId,
      p_ip_address: ipAddress ?? undefined,
      p_user_agent: userAgent ?? undefined,
    },
  );
  const value = unwrapRpc("Failed to change collection choice", data, error);
  const result = requireAdminRpcRecord(value, "Delivery collection choice change");
  const delivery = requireDeliveryRecord(
    result.delivery,
    "Delivery collection choice change",
    deliveryId,
  );
  const history = requireAdminRpcRecord(result.history, "Delivery collection choice history");

  requireAdminRpcUuid(history.id, "Delivery collection choice history");
  if (
    delivery.collection_id !== newCollectionId ||
    history.delivery_id !== deliveryId ||
    history.user_id !== userId ||
    history.new_collection_id !== newCollectionId ||
    history.change_reason !== "manual" ||
    history.changed_by_admin !== false
  ) {
    throw new Error("Failed to change collection choice: inconsistent response");
  }

  return result as unknown as TResult;
}
