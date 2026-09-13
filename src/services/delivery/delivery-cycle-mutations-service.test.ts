import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { supabase } from "@/integrations/supabase/client";
import {
  assignDeliveryToCycleRpc,
  changeCollectionChoiceForCurrentUserRpc,
  changeDeliveryCharacterRpc,
  createBonusPieceRpc,
  getOrCreateDeliveryCycleRpc,
  linkBonusPieceToDeliveryRpc,
  scheduleSubscriptionDeliveriesRpc,
  transitionDeliveryCycleStatusRpc,
  updateBonusPieceStatusRpc,
  updateDeliveryStatusRpc,
} from "./delivery-cycle-mutations-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const cycleId = "11111111-1111-4111-8111-111111111111";
const otherCycleId = "22222222-2222-4222-8222-222222222222";
const subscriptionId = "33333333-3333-4333-8333-333333333333";
const deliveryIds = [
  "44444444-4444-4444-8444-444444444441",
  "44444444-4444-4444-8444-444444444442",
  "44444444-4444-4444-8444-444444444443",
  "44444444-4444-4444-8444-444444444444",
  "44444444-4444-4444-8444-444444444445",
  "44444444-4444-4444-8444-444444444446",
];
const bonusId = "55555555-5555-4555-8555-555555555555";
const characterId = "66666666-6666-4666-8666-666666666666";
const collectionId = "77777777-7777-4777-8777-777777777777";
const userId = "88888888-8888-4888-8888-888888888888";
const historyId = "99999999-9999-4999-8999-999999999999";

function cycleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: cycleId,
    cycle_number: 1,
    month: 9,
    year: 2026,
    status: "open",
    ...overrides,
  };
}

function deliveryRow(index = 0, overrides: Record<string, unknown> = {}) {
  return {
    id: deliveryIds[index],
    subscription_id: subscriptionId,
    cycle_id: cycleId,
    delivery_number: index + 1,
    status: "scheduled",
    character_id: null,
    collection_id: null,
    ...overrides,
  };
}

function bonusRow(overrides: Record<string, unknown> = {}) {
  return {
    id: bonusId,
    subscription_id: subscriptionId,
    delivery_id: null,
    description: null,
    status: "pending",
    ...overrides,
  };
}

describe("delivery-cycle-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds get-or-create cycle to cycle number, month and year", async () => {
    callAdminRpcMock.mockResolvedValue(cycleRow());

    await expect(
      getOrCreateDeliveryCycleRpc<Record<string, unknown>>(1, 9, 2026),
    ).resolves.toMatchObject({ id: cycleId, cycle_number: 1, month: 9, year: 2026 });

    callAdminRpcMock.mockResolvedValue(cycleRow({ month: 10 }));
    await expect(getOrCreateDeliveryCycleRpc(1, 9, 2026)).rejects.toThrow(
      "Erro ao obter ou criar ciclo: Delivery cycle get/create returned an unexpected cycle",
    );
  });

  it("binds cycle transition to id and normalized status", async () => {
    callAdminRpcMock.mockResolvedValue(cycleRow({ status: "production" }));
    await expect(transitionDeliveryCycleStatusRpc(cycleId, " PRODUCTION ")).resolves.toMatchObject({
      id: cycleId,
      status: "production",
    });

    callAdminRpcMock.mockResolvedValue(cycleRow({ id: otherCycleId, status: "production" }));
    await expect(transitionDeliveryCycleStatusRpc(cycleId, "production")).rejects.toThrow(
      "Erro ao atualizar status do ciclo",
    );
  });

  it("requires exactly three scheduled deliveries and no bonus for trimestral", async () => {
    callAdminRpcMock.mockResolvedValue({
      deliveries: [deliveryRow(0), deliveryRow(1), deliveryRow(2)],
      bonusPiece: null,
    });

    await expect(
      scheduleSubscriptionDeliveriesRpc<Record<string, unknown>>(
        subscriptionId,
        "trimestral",
        cycleId,
      ),
    ).resolves.toHaveLength(3);

    callAdminRpcMock.mockResolvedValue({
      deliveries: [deliveryRow(0), deliveryRow(1)],
      bonusPiece: null,
    });
    await expect(
      scheduleSubscriptionDeliveriesRpc(subscriptionId, "trimestral", cycleId),
    ).rejects.toThrow("Resposta inválida ao agendar entregas da assinatura");
  });

  it("requires semestral bonus to point to the sixth delivery", async () => {
    callAdminRpcMock.mockResolvedValue({
      deliveries: deliveryIds.map((_, index) => deliveryRow(index)),
      bonusPiece: bonusRow({ delivery_id: deliveryIds[5] }),
    });

    await expect(
      scheduleSubscriptionDeliveriesRpc(subscriptionId, "semestral", cycleId),
    ).resolves.toHaveLength(6);

    callAdminRpcMock.mockResolvedValue({
      deliveries: deliveryIds.map((_, index) => deliveryRow(index)),
      bonusPiece: bonusRow({ delivery_id: deliveryIds[4] }),
    });
    await expect(
      scheduleSubscriptionDeliveriesRpc(subscriptionId, "semestral", cycleId),
    ).rejects.toThrow("Resposta inconsistente ao criar peca bonus semestral");
  });

  it("binds delivery status mutation to delivery id and status", async () => {
    callAdminRpcMock.mockResolvedValue(deliveryRow(0, { status: "shipped" }));
    await expect(updateDeliveryStatusRpc(deliveryIds[0], " SHIPPED ")).resolves.toMatchObject({
      id: deliveryIds[0],
      status: "shipped",
    });

    callAdminRpcMock.mockResolvedValue(deliveryRow(0, { status: "processing" }));
    await expect(updateDeliveryStatusRpc(deliveryIds[0], "shipped")).rejects.toThrow(
      "Delivery status update returned an unexpected status",
    );
  });

  it("binds cycle assignment to the requested delivery and cycle", async () => {
    callAdminRpcMock.mockResolvedValue(deliveryRow(0, { cycle_id: otherCycleId }));
    await expect(assignDeliveryToCycleRpc(deliveryIds[0], otherCycleId)).resolves.toMatchObject({
      id: deliveryIds[0],
      cycle_id: otherCycleId,
    });

    callAdminRpcMock.mockResolvedValue(deliveryRow(0, { cycle_id: cycleId }));
    await expect(assignDeliveryToCycleRpc(deliveryIds[0], otherCycleId)).rejects.toThrow(
      "Delivery cycle assignment returned an unexpected cycle",
    );
  });

  it("binds current-user character change to delivery and character", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: deliveryRow(0, { character_id: characterId }),
      error: null,
    } as never);

    await expect(changeDeliveryCharacterRpc(deliveryIds[0], characterId)).resolves.toMatchObject({
      id: deliveryIds[0],
      character_id: characterId,
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: deliveryRow(0, { character_id: null }),
      error: null,
    } as never);
    await expect(changeDeliveryCharacterRpc(deliveryIds[0], characterId)).rejects.toThrow(
      "Erro ao trocar personagem: resposta inconsistente",
    );
  });

  it("binds bonus creation, delivery link and status transitions", async () => {
    callAdminRpcMock
      .mockResolvedValueOnce(bonusRow({ description: "Brinde especial" }))
      .mockResolvedValueOnce(bonusRow({ delivery_id: deliveryIds[5] }))
      .mockResolvedValueOnce(bonusRow({ delivery_id: deliveryIds[5], status: "prepared" }));

    await expect(createBonusPieceRpc(subscriptionId, "  Brinde especial  ")).resolves.toMatchObject({
      id: bonusId,
      subscription_id: subscriptionId,
      status: "pending",
    });
    await expect(linkBonusPieceToDeliveryRpc(bonusId, deliveryIds[5])).resolves.toMatchObject({
      id: bonusId,
      delivery_id: deliveryIds[5],
    });
    await expect(updateBonusPieceStatusRpc(bonusId, " PREPARED ")).resolves.toMatchObject({
      id: bonusId,
      status: "prepared",
    });
  });

  it("binds collection choice response to delivery, user, collection and history", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        delivery: deliveryRow(0, { collection_id: collectionId, status: "confirmed" }),
        history: {
          id: historyId,
          delivery_id: deliveryIds[0],
          user_id: userId,
          new_collection_id: collectionId,
          change_reason: "manual",
          changed_by_admin: false,
        },
      },
      error: null,
    } as never);

    await expect(
      changeCollectionChoiceForCurrentUserRpc(deliveryIds[0], collectionId, userId),
    ).resolves.toMatchObject({
      delivery: { id: deliveryIds[0], collection_id: collectionId },
      history: { id: historyId, user_id: userId },
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        delivery: deliveryRow(0, { collection_id: collectionId, status: "confirmed" }),
        history: {
          id: historyId,
          delivery_id: deliveryIds[0],
          user_id: userId,
          new_collection_id: otherCycleId,
          change_reason: "manual",
          changed_by_admin: false,
        },
      },
      error: null,
    } as never);

    await expect(
      changeCollectionChoiceForCurrentUserRpc(deliveryIds[0], collectionId, userId),
    ).rejects.toThrow("Failed to change collection choice: inconsistent response");
  });
});
