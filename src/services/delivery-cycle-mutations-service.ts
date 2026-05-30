import { supabase } from "@/integrations/supabase/client";

interface RpcError {
  message: string;
}

type RpcResult<T> = Promise<{ data: T | null; error: RpcError | null }>;

interface DeliveryCycleRpcClient {
  rpc(
    name: "admin_get_or_create_delivery_cycle",
    args: {
      p_cycle_number: number;
      p_month: number;
      p_year: number;
      p_capacity?: number;
    },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_transition_delivery_cycle_status",
    args: { p_cycle_id: string; p_status: string },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_schedule_subscription_deliveries",
    args: {
      p_subscription_id: string;
      p_plan_type: string;
      p_entry_cycle_id: string;
    },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_update_delivery_status_legacy",
    args: { p_delivery_id: string; p_status: string },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_assign_delivery_to_cycle",
    args: { p_delivery_id: string; p_cycle_id: string },
  ): RpcResult<unknown>;
  rpc(
    name: "change_delivery_character_for_current_user",
    args: { p_delivery_id: string; p_character_id: string },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_create_bonus_piece",
    args: { p_subscription_id: string; p_description?: string | null },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_link_bonus_piece_to_delivery",
    args: { p_bonus_id: string; p_delivery_id: string },
  ): RpcResult<unknown>;
  rpc(
    name: "admin_update_bonus_piece_status",
    args: { p_bonus_id: string; p_status: string },
  ): RpcResult<unknown>;
  rpc(
    name: "apply_automatic_delivery_maintenance",
    args: { p_delivery_id: string; p_subscription_id: string },
  ): RpcResult<unknown>;
  rpc(
    name: "activate_delivery_with_auto_maintenance",
    args: { p_delivery_id: string },
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

const deliveryCycleRpc = supabase as unknown as DeliveryCycleRpcClient;

function unwrapRpc<T>(
  errorPrefix: string,
  data: unknown,
  error: RpcError | null,
): T {
  if (error) {
    throw new Error(`${errorPrefix}: ${error.message}`);
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
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_get_or_create_delivery_cycle",
    {
      p_cycle_number: cycleNumber,
      p_month: month,
      p_year: year,
      ...(capacity === undefined ? {} : { p_capacity: capacity }),
    },
  );

  return unwrapRpc<TCycle>("Erro ao obter ou criar ciclo", data, error);
}

export async function transitionDeliveryCycleStatusRpc<TCycle>(
  cycleId: string,
  status: string,
): Promise<TCycle> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_transition_delivery_cycle_status",
    {
      p_cycle_id: cycleId,
      p_status: status,
    },
  );

  return unwrapRpc<TCycle>("Erro ao atualizar status do ciclo", data, error);
}

export async function scheduleSubscriptionDeliveriesRpc<TDelivery>(
  subscriptionId: string,
  planType: string,
  entryCycleId: string,
): Promise<TDelivery[]> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_schedule_subscription_deliveries",
    {
      p_subscription_id: subscriptionId,
      p_plan_type: planType,
      p_entry_cycle_id: entryCycleId,
    },
  );

  const result = unwrapRpc<ScheduleDeliveriesResponse<TDelivery>>(
    "Erro ao agendar entregas",
    data,
    error,
  );

  return Array.isArray(result.deliveries) ? result.deliveries : [];
}

export async function updateDeliveryStatusRpc<TDelivery>(
  deliveryId: string,
  status: string,
): Promise<TDelivery> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_update_delivery_status_legacy",
    {
      p_delivery_id: deliveryId,
      p_status: status,
    },
  );

  return unwrapRpc<TDelivery>(
    "Erro ao atualizar status da entrega",
    data,
    error,
  );
}

export async function assignDeliveryToCycleRpc<TDelivery>(
  deliveryId: string,
  cycleId: string,
): Promise<TDelivery> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_assign_delivery_to_cycle",
    {
      p_delivery_id: deliveryId,
      p_cycle_id: cycleId,
    },
  );

  return unwrapRpc<TDelivery>("Erro ao associar entrega ao ciclo", data, error);
}

export async function changeDeliveryCharacterRpc<TDelivery>(
  deliveryId: string,
  characterId: string,
): Promise<TDelivery> {
  const { data, error } = await deliveryCycleRpc.rpc(
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
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_create_bonus_piece",
    {
      p_subscription_id: subscriptionId,
      p_description: description ?? null,
    },
  );

  return unwrapRpc<TBonus>("Erro ao criar peça bônus", data, error);
}

export async function linkBonusPieceToDeliveryRpc<TBonus>(
  bonusId: string,
  deliveryId: string,
): Promise<TBonus> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_link_bonus_piece_to_delivery",
    {
      p_bonus_id: bonusId,
      p_delivery_id: deliveryId,
    },
  );

  return unwrapRpc<TBonus>(
    "Erro ao vincular peça bônus à entrega",
    data,
    error,
  );
}

export async function updateBonusPieceStatusRpc<TBonus>(
  bonusId: string,
  status: string,
): Promise<TBonus> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "admin_update_bonus_piece_status",
    {
      p_bonus_id: bonusId,
      p_status: status,
    },
  );

  return unwrapRpc<TBonus>(
    "Erro ao atualizar status da peça bônus",
    data,
    error,
  );
}

export async function applyAutomaticDeliveryMaintenanceRpc<TResult>(
  deliveryId: string,
  subscriptionId: string,
): Promise<TResult> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "apply_automatic_delivery_maintenance",
    {
      p_delivery_id: deliveryId,
      p_subscription_id: subscriptionId,
    },
  );

  return unwrapRpc<TResult>(
    "Erro ao aplicar manutenção automática",
    data,
    error,
  );
}

export async function activateDeliveryWithAutoMaintenanceRpc<TResult>(
  deliveryId: string,
): Promise<TResult> {
  const { data, error } = await deliveryCycleRpc.rpc(
    "activate_delivery_with_auto_maintenance",
    {
      p_delivery_id: deliveryId,
    },
  );

  return unwrapRpc<TResult>("Failed to activate delivery", data, error);
}

export async function changeCollectionChoiceForCurrentUserRpc<TResult>(
  deliveryId: string,
  newCollectionId: string,
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<TResult> {
  const { data, error } = await deliveryCycleRpc.rpc(
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
