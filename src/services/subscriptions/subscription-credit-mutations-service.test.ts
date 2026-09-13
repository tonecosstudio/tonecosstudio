import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  adjustSubscriptionCreditCreditsRpc,
  closeSubscriptionCreditProductionCycleRpc,
  createSubscriptionCreditCharacterRpc,
  createSubscriptionCreditProductionCycleRpc,
  deactivateSubscriptionCreditCharacterRpc,
  updateSubscriptionCreditCharacterRpc,
} from "./subscription-credit-mutations-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const subscriptionId = "123e4567-e89b-42d3-a456-426614174001";
const characterId = "123e4567-e89b-42d3-a456-426614174002";
const otherCharacterId = "123e4567-e89b-42d3-a456-426614174003";
const cycleId = "123e4567-e89b-42d3-a456-426614174004";
const otherCycleId = "123e4567-e89b-42d3-a456-426614174005";

function character(overrides: Record<string, unknown> = {}) {
  return {
    id: characterId,
    name: "Heroi",
    description: null,
    price_cash: 250,
    price_credits: 10,
    is_exclusive_semestral: false,
    is_active: true,
    is_standard_collection: true,
    image_url: null,
    created_at: "2026-09-13T12:00:00Z",
    updated_at: "2026-09-13T12:00:00Z",
    ...overrides,
  };
}

function cycle(overrides: Record<string, unknown> = {}) {
  return {
    id: cycleId,
    name: "Ciclo Setembro",
    capacity_limit: 100,
    current_count: 12,
    status: "open",
    close_date: "2026-10-01T12:00:00Z",
    created_at: "2026-09-13T12:00:00Z",
    updated_at: "2026-09-13T12:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

describe("subscription-credit-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a matching confirmed credit adjustment", async () => {
    callAdminRpcMock.mockResolvedValue({
      subscription_id: subscriptionId,
      total_credits: 20,
      available_credits: 12,
    });

    await expect(
      adjustSubscriptionCreditCreditsRpc(subscriptionId, 5, "Ajuste manual"),
    ).resolves.toBeUndefined();
  });

  it.each([
    null,
    {},
    { subscription_id: otherCharacterId, total_credits: 20, available_credits: 12 },
    { subscription_id: subscriptionId, total_credits: -1, available_credits: 0 },
    { subscription_id: subscriptionId, total_credits: 20, available_credits: 1.5 },
  ])("rejects malformed credit adjustment data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      adjustSubscriptionCreditCreditsRpc(subscriptionId, 5, "Ajuste manual"),
    ).rejects.toThrow("Credit adjustment did not return confirmed data");
  });

  it("accepts a complete created character", async () => {
    callAdminRpcMock.mockResolvedValue(character());

    await expect(
      createSubscriptionCreditCharacterRpc({
        name: "Heroi",
        priceCash: 250,
        priceCredits: 10,
      }),
    ).resolves.toMatchObject({ id: characterId, name: "Heroi" });
  });

  it.each([
    null,
    {},
    { ...character(), id: "not-a-uuid" },
    { ...character(), price_cash: -1 },
    { ...character(), price_credits: 1.5 },
    { ...character(), is_active: "true" },
  ])("rejects malformed created characters %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      createSubscriptionCreditCharacterRpc({
        name: "Heroi",
        priceCash: 250,
        priceCredits: 10,
      }),
    ).rejects.toThrow("Character creation did not return valid data");
  });

  it("requires updated character identity to match the request", async () => {
    callAdminRpcMock.mockResolvedValue(character());

    await expect(
      updateSubscriptionCreditCharacterRpc(characterId, { name: "Heroi 2" }),
    ).resolves.toMatchObject({ id: characterId });

    callAdminRpcMock.mockResolvedValueOnce(character({ id: otherCharacterId }));
    await expect(
      updateSubscriptionCreditCharacterRpc(characterId, { name: "Heroi 2" }),
    ).rejects.toThrow("Character update did not return matching data");
  });

  it("requires deactivation to match the request and confirm inactive state", async () => {
    callAdminRpcMock.mockResolvedValue(character({ is_active: false }));

    await expect(deactivateSubscriptionCreditCharacterRpc(characterId)).resolves.toMatchObject({
      id: characterId,
      is_active: false,
    });

    callAdminRpcMock.mockResolvedValueOnce(character({ is_active: true }));
    await expect(deactivateSubscriptionCreditCharacterRpc(characterId)).rejects.toThrow(
      "Character deactivation was not confirmed",
    );

    callAdminRpcMock.mockResolvedValueOnce(
      character({ id: otherCharacterId, is_active: false }),
    );
    await expect(deactivateSubscriptionCreditCharacterRpc(characterId)).rejects.toThrow(
      "Character deactivation did not return matching data",
    );
  });

  it("accepts a coherent created production cycle", async () => {
    callAdminRpcMock.mockResolvedValue(cycle());

    await expect(
      createSubscriptionCreditProductionCycleRpc({
        name: "Ciclo Setembro",
        capacityLimit: 100,
        closeDate: "2026-10-01T12:00:00Z",
      }),
    ).resolves.toMatchObject({ id: cycleId, current_count: 12, capacity_limit: 100 });
  });

  it.each([
    null,
    {},
    { ...cycle(), capacity_limit: 0 },
    { ...cycle(), current_count: -1 },
    { ...cycle(), current_count: 101 },
    { ...cycle(), status: "unexpected" },
  ])("rejects malformed production cycles %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      createSubscriptionCreditProductionCycleRpc({
        name: "Ciclo Setembro",
        capacityLimit: 100,
        closeDate: "2026-10-01T12:00:00Z",
      }),
    ).rejects.toThrow("Production cycle creation did not return valid data");
  });

  it("requires the closed cycle result to match the requested cycle", async () => {
    callAdminRpcMock.mockResolvedValue({
      cycleId,
      confirmedOrders: 7,
      pendingOrders: 2,
      totalCreditsDebited: 70,
    });

    await expect(closeSubscriptionCreditProductionCycleRpc(cycleId)).resolves.toEqual({
      cycleId,
      confirmedOrders: 7,
      pendingOrders: 2,
      totalCreditsDebited: 70,
    });

    callAdminRpcMock.mockResolvedValueOnce({
      cycleId: otherCycleId,
      confirmedOrders: 7,
      pendingOrders: 2,
      totalCreditsDebited: 70,
    });
    await expect(closeSubscriptionCreditProductionCycleRpc(cycleId)).rejects.toThrow(
      "Production cycle closing did not return matching data",
    );
  });

  it.each([
    null,
    {},
    { cycleId, confirmedOrders: -1, pendingOrders: 2, totalCreditsDebited: 70 },
    { cycleId, confirmedOrders: 7.5, pendingOrders: 2, totalCreditsDebited: 70 },
    { cycleId, confirmedOrders: 7, pendingOrders: 2, totalCreditsDebited: -1 },
  ])("rejects malformed cycle closing data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(closeSubscriptionCreditProductionCycleRpc(cycleId)).rejects.toThrow(
      "Production cycle closing did not return matching data",
    );
  });
});
