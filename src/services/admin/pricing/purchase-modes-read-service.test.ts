import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAdminPurchaseModes } from "./purchase-modes-read-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

const modeId = "11111111-1111-4111-8111-111111111111";

function snapshot() {
  return {
    tiers: [],
    plans: [],
    purchase_modes: [
      {
        id: modeId,
        mode_key: "semestral",
        name: "Semestral",
        description: "Assinatura semestral",
        price_multiplier: 0.95,
        collections_count: 6,
        deliveries_total: 6,
        includes_bonus: true,
        is_active: true,
        display_order: 3,
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      },
    ],
    assignment_counts: [],
    active_subscription_counts: [],
  };
}

describe("admin purchase mode snapshot reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("le modalidades pelo snapshot administrativo canonico", async () => {
    mocks.callAdminRpc.mockResolvedValue(snapshot());

    await expect(listAdminPurchaseModes()).resolves.toEqual([
      {
        id: modeId,
        mode_key: "semestral",
        name: "Semestral",
        description: "Assinatura semestral",
        price_multiplier: 0.95,
        collections_count: 6,
        deliveries_total: 6,
        includes_bonus: true,
        is_active: true,
        display_order: 3,
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      },
    ]);

    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_get_pricing_tiers_snapshot", {
      p_tier_id: null,
    });
  });

  it.each([
    null,
    {},
    { purchase_modes: null },
    { purchase_modes: [{ ...snapshot().purchase_modes[0], mode_key: "invalido" }] },
    { purchase_modes: [{ ...snapshot().purchase_modes[0], collections_count: 0 }] },
    { purchase_modes: [{ ...snapshot().purchase_modes[0], is_active: "true" }] },
  ])("falha fechado para payload de modalidade invalido %#", async (value) => {
    mocks.callAdminRpc.mockResolvedValue(value);

    await expect(listAdminPurchaseModes()).rejects.toThrow();
  });
});
