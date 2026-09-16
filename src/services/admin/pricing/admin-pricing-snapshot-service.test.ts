import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminPricingSnapshot,
  parseAdminPricingSnapshot,
} from "./admin-pricing-snapshot-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

const tierId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";
const modeId = "33333333-3333-4333-8333-333333333333";
const collectionId = "44444444-4444-4444-8444-444444444444";
const assignmentId = "55555555-5555-4555-8555-555555555555";

function validSnapshot() {
  return {
    tiers: [
      {
        id: tierId,
        name: "Premium",
        description: null,
        price_brl: 300,
        price_full: 320,
        price_pix: 300,
        deposit_amount: 100,
        is_active: true,
        is_default: false,
        display_order: 2,
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      },
    ],
    plans: [
      {
        id: planId,
        pricing_tier_id: tierId,
        name: "Premium Semestral",
        description: null,
        price: 320,
        price_full: 320,
        price_pix: 300,
        plan_type: "semestral",
        billing_interval: "semestral",
        collections_count: 6,
        deliveries_total: 6,
        deliveries_per_cycle: 1,
        coins_included: 6,
        total_credits: 6,
        slug: "premium-semestral",
        is_active: true,
        display_order: 1,
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      },
    ],
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
    collections: [
      {
        id: collectionId,
        name: "Colecao Premium",
        slug: "colecao-premium",
        is_active: true,
        is_price_custom: false,
      },
    ],
    collection_assignments: [
      {
        id: assignmentId,
        collection_id: collectionId,
        tier_id: tierId,
        created_at: "2026-09-16T00:00:00.000Z",
      },
    ],
    assignment_counts: [{ tier_id: tierId, count: 1 }],
    active_subscription_counts: [{ plan_id: planId, count: 2 }],
  };
}

describe("admin pricing snapshot SSOT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valida o contrato completo antes de expor o snapshot", () => {
    expect(parseAdminPricingSnapshot(validSnapshot())).toEqual(validSnapshot());
  });

  it("chama apenas o RPC canonico pelo gateway administrativo", async () => {
    mocks.callAdminRpc.mockResolvedValue(validSnapshot());

    await expect(fetchAdminPricingSnapshot(tierId)).resolves.toEqual(validSnapshot());
    expect(mocks.callAdminRpc).toHaveBeenCalledTimes(1);
    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_get_pricing_tiers_snapshot", {
      p_tier_id: tierId,
    });
  });

  it.each([
    null,
    {},
    { ...validSnapshot(), tiers: null },
    { ...validSnapshot(), collections: null },
    {
      ...validSnapshot(),
      plans: [{ ...validSnapshot().plans[0], collections_count: -1 }],
    },
    {
      ...validSnapshot(),
      purchase_modes: [{ ...validSnapshot().purchase_modes[0], mode_key: "invalido" }],
    },
    {
      ...validSnapshot(),
      collections: [{ ...validSnapshot().collections[0], is_active: "true" }],
    },
    {
      ...validSnapshot(),
      active_subscription_counts: [{ plan_id: planId, count: -1 }],
    },
  ])("falha fechado para contrato invalido %#", (value) => {
    expect(() => parseAdminPricingSnapshot(value)).toThrow();
  });
});
