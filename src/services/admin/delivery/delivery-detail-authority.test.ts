import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchDeliveryChangeHistory,
  fetchDeliveryDetail,
  fetchSubscriberAddress,
  updateDeliveryStatus,
} from "./delivery-detail-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  normalizeAddressBR: vi.fn(),
  callEdge: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/lib/profile", () => ({
  normalizeAddressBR: mocks.normalizeAddressBR,
}));
vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.callEdge,
}));

type ReadResult = { data: unknown; error: { message: string } | null };

function queryReturning(result: ReadResult) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  [q.select, q.eq, q.order, q.single].forEach((fn) => fn.mockReturnValue(q));
  mocks.from.mockReturnValue(q);
  return q;
}

const delivery = {
  id: "delivery-1",
  subscription_id: "subscription-1",
  cycle_id: "cycle-1",
  collection_id: "collection-1",
  status: "shipped",
  tracking_code: "BR123",
  created_at: "2026-11-01",
};

const updated = {
  success: true,
  message: "updated",
  delivery: {
    id: "delivery-1",
    status: "shipped",
    tracking_code: "BR123",
    updated_at: "2026-11-02T12:00:00Z",
  },
};

const input = { deliveryId: "delivery-1", newStatus: "shipped" };

describe("delivery details — RLS reads, private address and authenticated updates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.callEdge.mockResolvedValue(updated);
  });

  it("reads one delivery by ID without fabricating a shipping carrier", async () => {
    const q = queryReturning({ data: delivery, error: null });
    const result = await fetchDeliveryDetail("delivery-1");
    expect(result).toMatchObject({ id: "delivery-1", status: "shipped",
      shipping_carrier: null, tracking_code: "BR123" });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("subscription_deliveries");
    expect(q.eq).toHaveBeenCalledWith("id", "delivery-1");
    expect(q.single).toHaveBeenCalledOnce();
  });

  it("returns null if a delivery has no matching row", async () => {
    queryReturning({ data: null, error: null });
    await expect(fetchDeliveryDetail("missing")).resolves.toBeNull();
  });

  it("preserves a database authorization error for delivery reads", async () => {
    queryReturning({ data: null, error: { message: "access denied" } });
    await expect(fetchDeliveryDetail("delivery-1")).rejects.toMatchObject({
      message: "access denied",
    });
  });

  it("formats a normalized Brazilian address without exposing other profile columns", async () => {
    const q = queryReturning({
      data: { delivery_address: { rua: "Rua Teste", numero: "100" } },
      error: null,
    });
    mocks.normalizeAddressBR.mockReturnValue({
      rua: "Rua Teste",
      numero: "100",
      complemento: "Apto 2",
      bairro: "Centro",
      cidade: "Salvador",
      uf: "BA",
      cep: "40000-000",
    });
    await expect(fetchSubscriberAddress("user-1")).resolves.toEqual({
      address: "Rua Teste, 100\nApto 2\nCentro\nSalvador - BA\nCEP: 40000-000",
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("profiles");
    expect(q.select).toHaveBeenCalledExactlyOnceWith("delivery_address");
    expect(q.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("does not invent an address if the saved value is not an object", async () => {
    queryReturning({ data: { delivery_address: "invalid" }, error: null });
    mocks.normalizeAddressBR.mockReturnValue(null);
    await expect(fetchSubscriberAddress("user-1")).resolves.toEqual({
      address: null,
    });
    expect(mocks.normalizeAddressBR).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("returns an explicit read failure instead of a fabricated address", async () => {
    queryReturning({ data: null, error: { message: "read denied" } });
    await expect(fetchSubscriberAddress("user-1")).rejects.toMatchObject({
      message: "read denied",
    });
    expect(mocks.normalizeAddressBR).not.toHaveBeenCalled();
  });

  it("maps real status history without claiming a collection change", async () => {
    const q = queryReturning({ data: [{
      id: "event-1", order_type: "subscription_delivery",
      changed_by: "admin-1", created_at: "2026-11-02",
      old_status: "pending", new_status: "shipped",
    }], error: null });
    await expect(fetchDeliveryChangeHistory("delivery-1")).resolves.toEqual([{
      id: "event-1",
      previous_collection_id: null,
      new_collection_id: "",
      change_reason: "subscription_delivery",
      changed_by_admin: true,
      created_at: "2026-11-02",
      previous_collection: { name: "pending" },
      new_collection: { name: "shipped" },
    }]);
    expect(mocks.from).toHaveBeenCalledWith("order_status_history");
    expect(q.eq).toHaveBeenCalledWith("order_id", "delivery-1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("handles an empty delivery history without a placeholder event", async () => {
    queryReturning({ data: null, error: null });
    await expect(fetchDeliveryChangeHistory("delivery-1")).resolves.toEqual([]);
  });

  it("propagates authorization errors while reading status history", async () => {
    queryReturning({ data: null, error: { message: "history denied" } });
    await expect(fetchDeliveryChangeHistory("delivery-1"))
      .rejects.toMatchObject({ message: "history denied" });
  });

  it("updates status only through the authenticated Edge Function", async () => {
    await expect(updateDeliveryStatus(input)).resolves.toEqual(updated);
    expect(mocks.callEdge).toHaveBeenCalledExactlyOnceWith(
      "update-delivery-status", input, "Erro ao atualizar status",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("preserves optional confirmed response fields without inventing tracking", async () => {
    mocks.callEdge.mockResolvedValueOnce({
      success: true, delivery: { id: "delivery-1", status: "shipped" },
    });
    await expect(updateDeliveryStatus(input)).resolves.toEqual({
      success: true,
      message: undefined,
      delivery: {
        id: "delivery-1",
        status: "shipped",
        tracking_code: undefined,
        updated_at: undefined,
      },
    });
  });

  it.each([
    null,
    { success: false },
    { success: true },
    { success: true, delivery: null },
    { success: true, delivery: { id: "other", status: "shipped" } },
    { success: true, delivery: { id: "delivery-1", status: "pending" } },
    { success: true, delivery: { id: "delivery-1", status: "shipped", tracking_code: 5 } },
    { success: true, delivery: { id: "delivery-1", status: "shipped", updated_at: null } },
    { success: true, message: 12, delivery: { id: "delivery-1", status: "shipped" } },
  ])("rejects malformed or inconsistent delivery confirmations %#", async (result) => {
    mocks.callEdge.mockResolvedValueOnce(result);
    await expect(updateDeliveryStatus(input)).rejects.toThrow(
      "Erro ao atualizar status",
    );
  });

  it("propagates the authenticated delivery function's authorization failure", async () => {
    mocks.callEdge.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(updateDeliveryStatus(input)).rejects.toThrow(
      "Admin access required",
    );
  });
});
