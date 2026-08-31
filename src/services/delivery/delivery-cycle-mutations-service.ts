import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

interface RpcError {
  message: string;
}

type RpcResult<T> = Promise<{ data: T | null; error: RpcError | null }>;

interface DeliveryChoiceRpcClient {
  rpc(
    name: "change_delivery_character_for_current_user",
    args: { p_delivery_id: string; p_character_id: string },
  ): RpcResult<unknown>;
  rpc(
    name: "change_delivery_collection_choice_for_current_user",
    args: {
      p_delivery_id: string;
      p_new_collection_id: string;
      p_user_id: string;
      p_ip_address?: string | null;
      p_user_agent?: string | null;
    },
  ): RpcResult<unknown>;
}

const deliveryChoiceRpc = supabase as unknown as DeliveryChoiceRpcClient;

function unwrapRpc<T>(
  errorPrefix: string,
  data: unknown,
  error: RpcError | null,
): T {
  if (error) {
    throw new Error(`${errorPrefix}: ${error.message}`);
  }

  if (data === null || data === undefined) {
    throw new Error(`${errorPrefix}: resposta vazia`);
  }

  return data as T;
}

interface ScheduleDeliveriesResponse<TDelivery> {
  deliveries?: TDelivery[];
  bonusPiece?: unknown;
}

export async function getOrCreateDeliveryCycleRpc<TCycle>(
  cycleNumber: number,
  month: number,
  year: number,
  capacity?: number,
): Promise<TCycle> {
  try {
    return await callAdminRpc<TCycle>("admin_get_or_create_delivery_cycle", {
      p_cycle_number: cycleNumber,
      p_month: month,
      p_year: year,
      ...(capacity === undefined ? {} : { p_capacity: capacity }),
    });
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
    return await callAdminRpc<TCycle>("admin_transition_delivery_cycle_status", {
      p_cycle_id: cycleId,
      p_status: status,
    });
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
  const result = await callAdminRpc<ScheduleDeliveriesResponse<TDelivery>>(
    "admin_schedule_subscription_deliveries",
    {
      p_subscription_id: subscriptionId,
      p_plan_type: planType,
      p_entry_cycle_id: entryCycleId,
    },
  );

  if (!result || !Array.isArray(result.deliveries)) {
    throw new Error("Resposta inválida ao agendar entregas da assinatura");
  }

  return result.deliveries;
}

export async function updateDeliveryStatusRpc<TDelivery>(
  deliveryId: string,
  status: string,
): Promise<TDelivery> {
  try {
    return await callAdminRpc<TDelivery>("admin_update_delivery_status_legacy", {
      p_delivery_id: deliveryId,
      p_status: status,
    });
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
    return await callAdminRpc<TDelivery>("admin_assign_delivery_to_cycle", {
      p_delivery_id: deliveryId,
      p_cycle_id: cycleId,
    });
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
  const { data, error } = await deliveryChoiceRpc.rpc(
    "change_delivery_character_for_current_user",
    {
      p_delivery_id: deliveryId,
      p_character_id: characterId,
    },
  );

  return unwrapRpc<TDelivery>("Erro ao trocar personagem", data, error);
}

export async function createBonusPieceRpc<TBonus>(
  subscriptionId: string,
  description?: string | null,
): Promise<TBonus> {
  try {
    return await callAdminRpc<TBonus>("admin_create_bonus_piece", {
      p_subscription_id: subscriptionId,
      p_description: description ?? null,
    });
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
    return await callAdminRpc<TBonus>("admin_link_bonus_piece_to_delivery", {
      p_bonus_id: bonusId,
      p_delivery_id: deliveryId,
    });
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
    return await callAdminRpc<TBonus>("admin_update_bonus_piece_status", {
      p_bonus_id: bonusId,
      p_status: status,
    });
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
  const { data, error } = await deliveryChoiceRpc.rpc(
    "change_delivery_collection_choice_for_current_user",
    {
      p_delivery_id: deliveryId,
      p_new_collection_id: newCollectionId,
      p_user_id: userId,
      p_ip_address: ipAddress ?? null,
      p_user_agent: userAgent ?? null,
    },
  );

  return unwrapRpc<TResult>("Failed to change collection choice", data, error);
}
