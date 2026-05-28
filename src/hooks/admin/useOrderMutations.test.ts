import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useOrderMutations } from "./useOrderMutations";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

type SupabaseRpcResult = ReturnType<typeof supabase.rpc>;
type SupabaseSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

function mockRpcResult(value: unknown): SupabaseRpcResult {
  return value as SupabaseRpcResult;
}

function mockFetchResponse(ok: boolean, payload: unknown): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("useOrderMutations", () => {
  let queryClient: QueryClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
      error: null,
    } as SupabaseSessionResult);
    vi.mocked(supabase.rpc).mockResolvedValue(mockRpcResult({ data: null, error: null }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe("updateStatus", () => {
    it("updates a subscription delivery through the authenticated Edge Function", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(true, {
          delivery: {
            id: "test-id",
            status: "confirmed",
            updated_at: new Date().toISOString(),
          },
        }),
      );

      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "subscription_delivery",
        newStatus: "confirmed",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/update-delivery-status"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
          }),
          body: JSON.stringify({
            deliveryId: "test-id",
            newStatus: "confirmed",
          }),
        }),
      );
      expect(supabase.from).not.toHaveBeenCalledWith("subscription_deliveries");
    });

    it("updates a standalone purchase through the server-side payment voucher RPC", async () => {
      const { result } = renderHook(() => useOrderMutations(), { wrapper });

      result.current.updateStatus.mutate({
        orderId: "test-id",
        orderType: "standalone_purchase",
        newStatus: "deposit_paid",
      });

      await waitFor(() => {
        expect(result.current.updateStatus.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_approve_standalone_payment_voucher", {
        p_purchase_id: "test-id",
        p_voucher_type: "deposit",
      });
    });

    it("surfaces Edge Function errors", async () => {
      fetchMock.mockResolvedValue(mockFetchResponse(false, { error: "Database error" }));

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
      fetchMock.mockResolvedValue(
        mockFetchResponse(true, {
          delivery: {
            status: "confirmed",
          },
        }),
      );

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
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("tracks partial failures without stopping the batch", async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockFetchResponse(true, {
            delivery: {
              id: "id-1",
              status: "confirmed",
            },
          }),
        )
        .mockResolvedValueOnce(mockFetchResponse(false, { error: "Update failed" }))
        .mockResolvedValueOnce(
          mockFetchResponse(true, {
            delivery: {
              id: "id-3",
              status: "confirmed",
            },
          }),
        );

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
      fetchMock.mockResolvedValue(
        mockFetchResponse(true, {
          delivery: {
            id: "test-id",
            status: "confirmed",
          },
        }),
      );

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
