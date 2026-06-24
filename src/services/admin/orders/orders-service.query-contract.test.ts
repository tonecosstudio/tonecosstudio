import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderFilters } from "@/types/admin/orders";

type SupabaseError = { message: string };
type SupabaseResult = {
  data: unknown[] | null;
  error: SupabaseError | null;
  count: number | null;
};

const supabaseMock = vi.hoisted(() => {
  const results = new Map<string, SupabaseResult>();
  const builders = new Map<string, Record<string, ReturnType<typeof vi.fn> | string>>();
  const defaultResult: SupabaseResult = { data: [], error: null, count: 0 };

  const createBuilder = (table: string) => {
    const builder: Record<string, ReturnType<typeof vi.fn> | string> = { table };
    const chain = () => builder;

    builder.select = vi.fn(chain);
    builder.in = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.gte = vi.fn(chain);
    builder.lte = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.then = vi.fn((resolve: (value: SupabaseResult) => unknown) =>
      Promise.resolve(resolve(results.get(table) || defaultResult))
    );

    return builder;
  };

  const from = vi.fn((table: string) => {
    const builder = createBuilder(table);
    builders.set(table, builder);
    return builder;
  });

  return {
    builders,
    from,
    results,
    rpc: vi.fn(),
  };
});

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: supabaseMock.from,
    rpc: supabaseMock.rpc,
  },
}));

vi.mock("@/lib/logger", () => ({
  default: loggerMock,
}));

vi.mock("@/services/payments/standalone-purchase-service", () => ({
  transitionStandalonePurchaseStatus: vi.fn(),
}));

vi.mock("./admin-order-status-service", () => ({
  approveManualPaymentWithNotification: vi.fn(),
  recordOrderStatusHistory: vi.fn(),
  rejectManualPaymentWithNotification: vi.fn(),
  requestManualPaymentInfoRpc: vi.fn(),
  updateManualPaymentStatus: vi.fn(),
  updateQuoteStatusRpc: vi.fn(),
}));

vi.mock("./delivery-detail-service", () => ({
  updateDeliveryStatus: vi.fn(),
}));

const baseFilters: OrderFilters = {
  type: "subscription_delivery",
  status: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: "",
};

const pagination = { page: 1, pageSize: 20 };

describe("orders-service query contract", () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseMock.builders.clear();
    supabaseMock.results.clear();
    supabaseMock.from.mockClear();
    supabaseMock.rpc.mockReset();
    loggerMock.error.mockClear();
    loggerMock.warn.mockClear();
  });

  it("loads subscription delivery profile and collection summaries in batched lookups", async () => {
    supabaseMock.results.set("subscription_deliveries", {
      count: 2,
      error: null,
      data: [
        {
          id: "delivery-a",
          status: "scheduled",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          tracking_code: null,
          actual_delivery_date: null,
          delivered_date: null,
          subscription_id: "subscription-a",
          delivery_number: 1,
          delivery_order: null,
          cycle_id: null,
          character_id: null,
          reveal_date: null,
          subscriptions: {
            id: "subscription-a",
            user_id: "user-a",
            collection_id: "collection-a",
            plan_type: "monthly",
            deliveries_completed: 0,
            deliveries_total: 3,
            status: "active",
          },
          collection_characters: null,
        },
        {
          id: "delivery-b",
          status: "confirmed",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          tracking_code: null,
          actual_delivery_date: null,
          delivered_date: null,
          subscription_id: "subscription-b",
          delivery_number: 1,
          delivery_order: null,
          cycle_id: null,
          character_id: null,
          reveal_date: null,
          subscriptions: {
            id: "subscription-b",
            user_id: "user-b",
            collection_id: "collection-b",
            plan_type: "monthly",
            deliveries_completed: 0,
            deliveries_total: 3,
            status: "active",
          },
          collection_characters: null,
        },
      ],
    });
    supabaseMock.results.set("profiles", {
      count: 2,
      error: null,
      data: [
        { id: "user-a", full_name: "Alice Silva", email: "alice@example.com" },
        { id: "user-b", full_name: "Bruno Costa", email: "bruno@example.com" },
      ],
    });
    supabaseMock.results.set("collections", {
      count: 2,
      error: null,
      data: [
        { id: "collection-a", name: "Collection Alpha", slug: "alpha" },
        { id: "collection-b", name: "Collection Beta", slug: "beta" },
      ],
    });

    const { fetchUnifiedOrders } = await import("./orders-service");

    const result = await fetchUnifiedOrders(baseFilters, pagination);

    expect(supabaseMock.from.mock.calls.map(([table]) => table)).toEqual([
      "subscription_deliveries",
      "profiles",
      "collections",
    ]);
    expect(supabaseMock.builders.get("profiles")?.in).toHaveBeenCalledWith("id", [
      "user-a",
      "user-b",
    ]);
    expect(supabaseMock.builders.get("profiles")?.eq).not.toHaveBeenCalled();
    expect(supabaseMock.builders.get("collections")?.in).toHaveBeenCalledWith("id", [
      "collection-a",
      "collection-b",
    ]);

    expect(
      result.data.map((order) => ({
        collection: order.collection?.name,
        customer: order.customer.name,
        id: order.id,
      }))
    ).toEqual([
      { collection: "Collection Beta", customer: "Bruno Costa", id: "delivery-b" },
      { collection: "Collection Alpha", customer: "Alice Silva", id: "delivery-a" },
    ]);
  });

  it("hydrates standalone purchase customers without relying on embedded profile joins", async () => {
    supabaseMock.results.set("standalone_purchases", {
      count: 1,
      error: null,
      data: [
        {
          id: "purchase-a",
          status: "awaiting_deposit",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          user_id: "user-a",
          character_id: null,
          amount: 120,
          paid_amount: 0,
          balance_amount: 120,
          tracking_code: null,
          collections: { id: "collection-a", name: "Collection Alpha", slug: "alpha" },
          collection_characters: null,
        },
      ],
    });
    supabaseMock.results.set("profiles", {
      count: 1,
      error: null,
      data: [{ id: "user-a", full_name: "Alice Silva", email: "alice@example.com" }],
    });

    const { fetchUnifiedOrders } = await import("./orders-service");

    const result = await fetchUnifiedOrders(
      { ...baseFilters, type: "standalone_purchase" },
      pagination
    );

    expect(supabaseMock.from.mock.calls.map(([table]) => table)).toEqual([
      "standalone_purchases",
      "profiles",
    ]);
    expect(result.data[0]?.customer).toEqual({
      email: "alice@example.com",
      id: "user-a",
      name: "Alice Silva",
    });
  });

  it("falls back to local filtering when full-text search RPC is unavailable", async () => {
    supabaseMock.results.set("subscription_deliveries", {
      count: 1,
      error: null,
      data: [
        {
          id: "delivery-a",
          status: "scheduled",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          tracking_code: "ORD-001",
          actual_delivery_date: null,
          delivered_date: null,
          subscription_id: "subscription-a",
          delivery_number: 1,
          delivery_order: null,
          cycle_id: null,
          character_id: null,
          reveal_date: null,
          subscriptions: {
            id: "subscription-a",
            user_id: "user-a",
            collection_id: "collection-a",
            plan_type: "monthly",
            deliveries_completed: 0,
            deliveries_total: 3,
            status: "active",
          },
          collection_characters: null,
        },
      ],
    });
    supabaseMock.results.set("profiles", {
      count: 1,
      error: null,
      data: [{ id: "user-a", full_name: "Alice Silva", email: "alice@example.com" }],
    });
    supabaseMock.results.set("collections", {
      count: 1,
      error: null,
      data: [{ id: "collection-a", name: "Collection Alpha", slug: "alpha" }],
    });
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: "function search_unified_orders does not exist" },
    });

    const { fetchUnifiedOrders } = await import("./orders-service");

    const result = await fetchUnifiedOrders(
      { ...baseFilters, searchQuery: "alice" },
      pagination
    );

    expect(supabaseMock.rpc).toHaveBeenCalledWith("search_unified_orders", {
      order_type_filter: "subscription_delivery",
      search_query: "alice",
    });
    expect(loggerMock.warn).toHaveBeenCalledWith(
      "Full-text search failed, falling back to client-side search",
      expect.objectContaining({ error: expect.anything() })
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("delivery-a");
  });
});
