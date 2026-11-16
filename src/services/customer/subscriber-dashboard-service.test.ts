import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), assertUser: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertUser,
  requireAuthenticatedUserId: vi.fn(),
}));
vi.mock("@/services/subscriptions/subscription-details-service", () => ({
  fetchActiveSubscriptionDetails: vi.fn(),
}));

import { listMyTonartPlanHistory } from "./subscriber-dashboard-service";

const USER = "11111111-1111-4111-8111-111111111111";
const SUBSCRIPTION = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertUser.mockResolvedValue(undefined);
  const subscriptions = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
  };
  subscriptions.select.mockReturnValue(subscriptions);
  subscriptions.eq.mockReturnValue(subscriptions);
  subscriptions.order.mockReturnValue(subscriptions);
  subscriptions.limit.mockResolvedValue({
    data: [{
      id: SUBSCRIPTION,
      collection_id: null,
      plan_type: "semestral",
      status: "active",
      payment_status: "paid",
      total_paid: 1350,
      deliveries_total: 6,
      created_at: "2026-08-01T12:00:00Z",
      selected_model_slugs: [],
      collection_model_slugs_snapshot: [],
      plan_snapshot: null,
      collections: null,
      subscription_plans: { name: "Plano semestral antigo" },
    }],
    error: null,
  });
  const deliveries = { select: vi.fn(), in: vi.fn(), order: vi.fn() };
  deliveries.select.mockReturnValue(deliveries);
  deliveries.in.mockReturnValue(deliveries);
  deliveries.order
    .mockReturnValueOnce(deliveries)
    .mockResolvedValueOnce({
      data: [{
        id: "33333333-3333-4333-8333-333333333333",
        subscription_id: SUBSCRIPTION,
        status: "shipped",
        delivery_number: 1,
        delivery_order: 1,
        tracking_code: "BR123456789",
        catalog_model_slug: null,
        production_started_at: null,
        delivery_date: "2026-09-10",
        shipping_date: "2026-09-10",
        expected_delivery_date: null,
      }],
      error: null,
    });
  mocks.from.mockImplementation((table: string) =>
    table === "subscriptions" ? subscriptions : deliveries,
  );
});

describe("customer plan history", () => {
  it("keeps legacy contracts visible without fabricating new contract terms", async () => {
    const history = await listMyTonartPlanHistory(USER);
    expect(history).toMatchObject([{
      id: SUBSCRIPTION,
      planName: "Plano semestral antigo",
      pieceCount: 6,
      totalPaid: 1350,
      snapshot: null,
      collectionModelSlugs: [],
      deliveries: [{
        status: "shipped",
        deliveryNumber: 1,
        trackingCode: "BR123456789",
        modelSlug: null,
      }],
    }]);
    expect(mocks.assertUser).toHaveBeenCalledExactlyOnceWith(USER);
  });
});
