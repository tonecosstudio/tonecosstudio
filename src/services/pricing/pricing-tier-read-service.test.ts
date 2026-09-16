import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTierWithPlans,
  listAllTiersWithPlans,
} from "./pricing-tier-read-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

const tierId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";

function pricingSnapshot() {
  return {
    tiers: [
      {
        id: tierId,
        name: "Premium",
        description: "Nivel premium",
        price_brl: 300,
        price_full: 320,
        price_pix: 300,
        deposit_amount: 100,
        is_active: true,
        is_default: false,
        display_order: 2,
      },
    ],
    plans: [
      {
        id: planId,
        pricing_tier_id: tierId,
        name: "Premium Semestral",
        description: null,
        price: 320,
        price_full: null,
        price_pix: 300,
        plan_type: "semestral",
        billing_interval: null,
        collections_count: 6,
        deliveries_total: 6,
        deliveries_per_cycle: null,
        is_active: true,
        display_order: 1,
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      },
    ],
    purchase_modes: [
      {
        mode_key: "semestral",
        price_multiplier: 0.95,
        collections_count: 6,
        deliveries_total: 6,
        includes_bonus: true,
      },
    ],
    assignment_counts: [{ tier_id: tierId, count: 4 }],
    active_subscription_counts: [{ plan_id: planId, count: 7 }],
  };
}

describe("pricing-tier-read-service canonical admin snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta a lista administrativa a partir de um unico snapshot canonico", async () => {
    mocks.callAdminRpc.mockResolvedValue(pricingSnapshot());

    await expect(listAllTiersWithPlans()).resolves.toEqual([
      {
        tier_id: tierId,
        tier_name: "Premium",
        tier_description: "Nivel premium",
        tier_price_base: 320,
        tier_price_pix_base: 300,
        tier_deposit: 100,
        tier_is_active: true,
        tier_is_default: false,
        plans: [
          {
            id: planId,
            tier_id: tierId,
            plan_mode: "semestral",
            plan_type: "semestral",
            name: "Premium Semestral",
            description: null,
            price_full: 320,
            price_pix: 300,
            price_multiplier: 0.95,
            collections_count: 6,
            deliveries_total: 6,
            includes_bonus: true,
            is_active: true,
            display_order: 1,
            created_at: "2026-09-16T00:00:00.000Z",
            updated_at: "2026-09-16T00:00:00.000Z",
          },
        ],
        assigned_collections_count: 4,
        total_active_subscriptions: 7,
      },
    ]);

    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_get_pricing_tiers_snapshot", {
      p_tier_id: null,
    });
  });

  it("busca um unico tier pelo id e preserva o contrato do snapshot", async () => {
    mocks.callAdminRpc.mockResolvedValue(pricingSnapshot());

    const result = await getTierWithPlans(tierId);

    expect(result?.tier_id).toBe(tierId);
    expect(result?.plans).toHaveLength(1);
    expect(result?.assigned_collections_count).toBe(4);
    expect(result?.total_active_subscriptions).toBe(7);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_get_pricing_tiers_snapshot", {
      p_tier_id: tierId,
    });
  });

  it("retorna null quando o backend confirma que o tier nao existe", async () => {
    const snapshot = pricingSnapshot();
    snapshot.tiers = [];
    snapshot.plans = [];
    snapshot.assignment_counts = [];
    snapshot.active_subscription_counts = [];
    mocks.callAdminRpc.mockResolvedValue(snapshot);

    await expect(getTierWithPlans(tierId)).resolves.toBeNull();
  });

  it.each([
    null,
    {},
    { ...pricingSnapshot(), tiers: null },
    { ...pricingSnapshot(), purchase_modes: [{ mode_key: "invalido" }] },
    {
      ...pricingSnapshot(),
      active_subscription_counts: [{ plan_id: planId, count: -1 }],
    },
  ])("falha fechado para snapshot administrativo invalido %#", async (value) => {
    mocks.callAdminRpc.mockResolvedValue(value);

    await expect(listAllTiersWithPlans()).rejects.toThrow();
  });
});
