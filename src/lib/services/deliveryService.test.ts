import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliveryService, type Delivery } from "./deliveryService";
import { supabase } from "@/integrations/supabase/client";
import { cycleService } from "@/services/delivery/cycle-service";
import {
  assignDeliveryToCycleRpc,
  changeDeliveryCharacterRpc,
  scheduleSubscriptionDeliveriesRpc,
  updateDeliveryStatusRpc,
} from "@/services/delivery/delivery-cycle-mutations-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/delivery/cycle-service", () => ({
  cycleService: {
    getCycleById: vi.fn(),
  },
}));

vi.mock("@/services/delivery/delivery-cycle-mutations-service", () => ({
  assignDeliveryToCycleRpc: vi.fn(),
  changeDeliveryCharacterRpc: vi.fn(),
  scheduleSubscriptionDeliveriesRpc: vi.fn(),
  updateDeliveryStatusRpc: vi.fn(),
}));

const SUBSCRIPTION_ID = "10000000-0000-4000-8000-000000000001";
const DELIVERY_ID = "20000000-0000-4000-8000-000000000001";
const CYCLE_ID = "30000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "40000000-0000-4000-8000-000000000001";

const mockDelivery: Delivery = {
  id: DELIVERY_ID,
  created_at: "2026-03-01T00:00:00-03:00",
  updated_at: "2026-03-01T00:00:00-03:00",
  subscription_id: SUBSCRIPTION_ID,
  cycle_id: CYCLE_ID,
  character_id: null,
  delivery_number: 1,
  status: "scheduled",
  status_changed_at: null,
  scheduled_date: "2026-04-07",
  shipped_at: null,
  delivered_at: null,
  tracking_code: null,
};

const mockedSupabase = vi.mocked(supabase);
const mockedCycleService = vi.mocked(cycleService);
const mockedSchedule = vi.mocked(scheduleSubscriptionDeliveriesRpc);
const mockedUpdateStatus = vi.mocked(updateDeliveryStatusRpc);
const mockedAssignCycle = vi.mocked(assignDeliveryToCycleRpc);
const mockedChangeCharacter = vi.mocked(changeDeliveryCharacterRpc);

function orderedQueryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data, error }),
      })),
    })),
  };
}

function currentDeliveryQueryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data, error }),
            })),
          })),
        })),
      })),
    })),
  };
}

function cycleLookupQueryResult(cycleId: string | null, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { cycle_id: cycleId }, error }),
      })),
    })),
  };
}

describe("DeliveryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates consecutive scheduling to the canonical mutation service", async () => {
    const deliveries = [mockDelivery, { ...mockDelivery, id: "20000000-0000-4000-8000-000000000002", delivery_number: 2 }];
    mockedSchedule.mockResolvedValue(deliveries);

    await expect(
      deliveryService.scheduleConsecutiveDeliveries(SUBSCRIPTION_ID, "trimestral", CYCLE_ID),
    ).resolves.toEqual(deliveries);

    expect(mockedSchedule).toHaveBeenCalledWith(SUBSCRIPTION_ID, "trimestral", CYCLE_ID);
  });

  it("propagates scheduling failures", async () => {
    mockedSchedule.mockRejectedValue(new Error("Database error"));

    await expect(
      deliveryService.scheduleConsecutiveDeliveries(SUBSCRIPTION_ID, "trimestral", CYCLE_ID),
    ).rejects.toThrow("Database error");
  });

  it("delegates status updates", async () => {
    mockedUpdateStatus.mockResolvedValue(undefined);

    await deliveryService.updateDeliveryStatus(DELIVERY_ID, "shipped");

    expect(mockedUpdateStatus).toHaveBeenCalledWith(DELIVERY_ID, "shipped");
  });

  it("delegates cycle assignment", async () => {
    mockedAssignCycle.mockResolvedValue(undefined);

    await deliveryService.assignDeliveryToCycle(DELIVERY_ID, CYCLE_ID);

    expect(mockedAssignCycle).toHaveBeenCalledWith(DELIVERY_ID, CYCLE_ID);
  });

  it("reads subscription deliveries and preserves their order", async () => {
    const rows = [
      { ...mockDelivery, delivery_number: 1 },
      { ...mockDelivery, id: "20000000-0000-4000-8000-000000000002", delivery_number: 2 },
    ];
    mockedSupabase.from.mockReturnValue(orderedQueryResult(rows) as never);

    const deliveries = await deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID);

    expect(deliveries.map((delivery) => delivery.delivery_number)).toEqual([1, 2]);
  });

  it("returns an empty subscription delivery list when no rows exist", async () => {
    mockedSupabase.from.mockReturnValue(orderedQueryResult(null) as never);

    await expect(deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID)).resolves.toEqual([]);
  });

  it("fails closed when subscription delivery reading fails", async () => {
    mockedSupabase.from.mockReturnValue(
      orderedQueryResult(null, { message: "Query failed" }) as never,
    );

    await expect(deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID)).rejects.toThrow(
      "Erro ao buscar entregas: Query failed",
    );
  });

  it("reads deliveries for a cycle", async () => {
    mockedSupabase.from.mockReturnValue(orderedQueryResult([mockDelivery]) as never);

    await expect(deliveryService.getDeliveriesByCycle(CYCLE_ID)).resolves.toEqual([mockDelivery]);
  });

  it("returns the current active delivery", async () => {
    mockedSupabase.from.mockReturnValue(currentDeliveryQueryResult(mockDelivery) as never);

    await expect(deliveryService.getCurrentDelivery(SUBSCRIPTION_ID)).resolves.toEqual(mockDelivery);
  });

  it("returns null when there is no current delivery", async () => {
    mockedSupabase.from.mockReturnValue(
      currentDeliveryQueryResult(null, { code: "PGRST116" }) as never,
    );

    await expect(deliveryService.getCurrentDelivery(SUBSCRIPTION_ID)).resolves.toBeNull();
  });

  it("allows character changes while the canonical cycle is open", async () => {
    mockedSupabase.from.mockReturnValue(cycleLookupQueryResult(CYCLE_ID) as never);
    mockedCycleService.getCycleById.mockResolvedValue({ status: "open" } as never);

    await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(true);
    expect(mockedCycleService.getCycleById).toHaveBeenCalledWith(CYCLE_ID);
  });

  it("rejects character changes after the canonical cycle enters production", async () => {
    mockedSupabase.from.mockReturnValue(cycleLookupQueryResult(CYCLE_ID) as never);
    mockedCycleService.getCycleById.mockResolvedValue({ status: "production" } as never);

    await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(false);
  });

  it("rejects character changes when the delivery has no cycle", async () => {
    mockedSupabase.from.mockReturnValue(cycleLookupQueryResult(null) as never);

    await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(false);
    expect(mockedCycleService.getCycleById).not.toHaveBeenCalled();
  });

  it("delegates user-owned character changes", async () => {
    mockedChangeCharacter.mockResolvedValue(undefined);

    await deliveryService.changeCharacter(DELIVERY_ID, CHARACTER_ID);

    expect(mockedChangeCharacter).toHaveBeenCalledWith(DELIVERY_ID, CHARACTER_ID);
  });

  it("returns a friendly error when the cycle no longer permits character changes", async () => {
    mockedChangeCharacter.mockRejectedValue(
      new Error("Character changes are not allowed after the cycle enters production"),
    );

    await expect(deliveryService.changeCharacter(DELIVERY_ID, CHARACTER_ID)).rejects.toThrow(
      "Nao e possivel trocar o personagem",
    );
  });
});
