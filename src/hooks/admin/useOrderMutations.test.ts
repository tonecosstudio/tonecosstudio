import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useOrderMutations } from "./useOrderMutations";

const serviceMocks = vi.hoisted(() => ({
  updateDeliveryStatus: vi.fn(),
  transitionStandalonePurchaseStatus: vi.fn(),
  updateStandaloneTrackingCode: vi.fn(),
}));

vi.mock("@/services/admin/delivery/delivery-detail-service", () => ({
  updateDeliveryStatus: serviceMocks.updateDeliveryStatus,
}));

vi.mock("@/services/payments/standalone-purchase-service", () => ({
  transitionStandalonePurchaseStatus: serviceMocks.transitionStandalonePurchaseStatus,
  updateStandaloneTrackingCode: serviceMocks.updateStandaloneTrackingCode,
}));

describe("useOrderMutations", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    serviceMocks.updateDeliveryStatus.mockResolvedValue({
      delivery: {
        id: "test-id",
        status: "confirmed",
        updated_at: "2026-09-17T12:00:00.000Z",
      },
    });
    serviceMocks.transitionStandalonePurchaseStatus.mockResolvedValue(undefined);
    serviceMocks.updateStandaloneTrackingCode.mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe("updateStatus", () => {
    it("updates a subscription delivery through the delivery service boundary", async () => {
      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "subscription_delivery",
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(serviceMocks.updateDeliveryStatus).toHaveBeenCalledWith({
        deliveryId: "test-id",
        newStatus: "confirmed",
      });
    });

    it("updates a standalone purchase through the standalone service boundary", async () => {
      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "standalone_purchase",
        newStatus: "deposit_paid",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(serviceMocks.transitionStandalonePurchaseStatus).toHaveBeenCalledWith(
        "test-id",
        "deposit_paid",
      );
    });

    it("surfaces delivery service errors", async () => {
      serviceMocks.updateDeliveryStatus.mockRejectedValueOnce(new Error("Database error"));

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "subscription_delivery",
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isError).toBe(true);
      });

      expect(result.current.updateStatus.error).toEqual(
        expect.objectContaining({ message: "Database error" }),
      );
    });
  });

  describe("bulkUpdateStatus", () => {
    it("updates multiple valid subscription deliveries", async () => {
      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.bulkUpdateStatus.mutate({
        orders: [
          { id: "id-1", type: "subscription_delivery", status: "scheduled" },
          { id: "id-2", type: "subscription_delivery", status: "scheduled" },
          { id: "id-3", type: "subscription_delivery", status: "scheduled" },
        ],
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.bulkUpdateStatus.isSuccess).toBe(true);
      });

      const resultData = result.current.bulkUpdateStatus.data;
      expect(resultData?.successful).toEqual(["id-1", "id-2", "id-3"]);
      expect(resultData?.failed).toHaveLength(0);
      expect(serviceMocks.updateDeliveryStatus).toHaveBeenCalledTimes(3);
    });

    it("tracks partial failures without stopping the batch", async () => {
      serviceMocks.updateDeliveryStatus
        .mockResolvedValueOnce({ delivery: { id: "id-1", status: "confirmed" } })
        .mockRejectedValueOnce(new Error("Update failed"))
        .mockResolvedValueOnce({ delivery: { id: "id-3", status: "confirmed" } });

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.bulkUpdateStatus.mutate({
        orders: [
          { id: "id-1", type: "subscription_delivery", status: "pending_choice" },
          { id: "id-2", type: "subscription_delivery", status: "pending_choice" },
          { id: "id-3", type: "subscription_delivery", status: "pending_choice" },
        ],
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.bulkUpdateStatus.isSuccess).toBe(true);
      });

      const resultData = result.current.bulkUpdateStatus.data;
      expect(resultData?.successful).toEqual(["id-1", "id-3"]);
      expect(resultData?.failed).toEqual([{ id: "id-2", error: "Update failed" }]);
    });
  });

  describe("cache invalidation", () => {
    it("invalidates admin orders after a successful status update", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "subscription_delivery",
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["admin-orders"],
        }),
      );
    });
  });
});
