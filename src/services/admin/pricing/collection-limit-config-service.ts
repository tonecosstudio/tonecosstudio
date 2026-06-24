import { updateSubscriptionPlanCollectionLimitRpc } from "@/services/admin/config/admin-config-mutations-service";

export async function updateSubscriptionPlanCollectionLimit(planId: string, newLimit: number) {
  try {
    return await updateSubscriptionPlanCollectionLimitRpc(planId, newLimit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    throw new Error(`Erro ao atualizar limite: ${message}`);
  }
}
