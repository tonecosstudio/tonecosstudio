import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAvailability,
  checkSubscriptionCapacity,
  getCapacityUsage,
  releaseCapacity,
  reserveCapacity,
} from "./capacity-service";
import { supabase } from "@/integrations/supabase/client";
import log from "@/lib/logger";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

type QueryResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

function createQuery<T>(result: QueryResult<T>) {
  const query: Record<string, unknown> = {};
  const resolve = vi.fn().mockResolvedValue(result);

  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.single = resolve;
  query.maybeSingle = resolve;

  return query;
}

function mockCycleQueries(results: QueryResult[]) {
  let index = 0;
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table !== "cycles") {
      throw new Error(`Unexpected table query: ${table}`);
    }

    const result = results[index] ?? { data: null, error: null };
    index += 1;
    return createQuery(result) as never;
  });
}

describe("capacity-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkAvailability", () => {
    it("returns true only when the capacity RPC confirms availability", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never);

      await expect(checkAvailability("cycle-1", 2)).resolves.toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("check_capacity_available", {
        p_cycle_id: "cycle-1",
        p_quantity: 2,
      });
    });

    it("fails closed when the RPC does not return true", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);

      await expect(checkAvailability("cycle-1", 1)).resolves.toBe(false);
    });

    it("propagates capacity RPC errors", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "database unavailable" },
      } as never);

      await expect(checkAvailability("cycle-1", 1)).rejects.toThrow(
        "Failed to check capacity availability: database unavailable",
      );
    });
  });

  describe("reservation mutations", () => {
    it("reserves capacity through the canonical RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);

      await reserveCapacity("cycle-1", 1, "subscription-1");

      expect(supabase.rpc).toHaveBeenCalledWith("reserve_capacity", {
        p_cycle_id: "cycle-1",
        p_quantity: 1,
      });
      expect(log.info).toHaveBeenCalledWith("Capacity reserved", {
        quantity: 1,
        cycleId: "cycle-1",
        referenceId: "subscription-1",
      });
    });

    it("does not hide reservation errors", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "CAPACITY_EXCEEDED" },
      } as never);

      await expect(reserveCapacity("cycle-1", 1, "subscription-1")).rejects.toThrow(
        "Failed to reserve capacity: CAPACITY_EXCEEDED",
      );
    });

    it("releases capacity through the canonical RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);

      await releaseCapacity("cycle-1", 1, "subscription-1");

      expect(supabase.rpc).toHaveBeenCalledWith("release_capacity", {
        p_cycle_id: "cycle-1",
        p_quantity: 1,
      });
      expect(log.info).toHaveBeenCalledWith("Capacity released", {
        quantity: 1,
        cycleId: "cycle-1",
        referenceId: "subscription-1",
      });
    });
  });

  describe("getCapacityUsage", () => {
    it("uses canonical capacity fields", async () => {
      mockCycleQueries([
        { data: { capacity: 150, used_capacity: 50 }, error: null },
      ]);

      await expect(getCapacityUsage("cycle-1")).resolves.toEqual({
        max: 150,
        current: 50,
        available: 100,
        percentage: 33,
        reserved: 0,
      });
    });

    it("rejects a missing cycle", async () => {
      mockCycleQueries([{ data: null, error: null }]);

      await expect(getCapacityUsage("missing")).rejects.toThrow("Cycle not found: missing");
    });
  });

  describe("checkSubscriptionCapacity", () => {
    it("rejects invalid delivery counts", async () => {
      await expect(checkSubscriptionCapacity(0)).rejects.toThrow(
        "Invalid subscription delivery count",
      );
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("returns unavailable when there is no configured open cycle", async () => {
      mockCycleQueries([{ data: null, error: null }]);

      await expect(checkSubscriptionCapacity(3)).resolves.toEqual({ available: false });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rejects a failed delivery-cycle lookup", async () => {
      mockCycleQueries([
        { data: { cycle_number: 1, month: 8, year: 2026 }, error: null },
        { data: null, error: { message: "cycle query failed" } },
      ]);

      await expect(checkSubscriptionCapacity(1)).rejects.toThrow(
        "Failed to get delivery cycle: cycle query failed",
      );
    });

    it("returns unavailable when a required future cycle does not exist", async () => {
      mockCycleQueries([
        { data: { cycle_number: 1, month: 8, year: 2026 }, error: null },
        { data: null, error: null },
      ]);

      await expect(checkSubscriptionCapacity(1)).resolves.toEqual({
        available: false,
        firstUnavailableCycle: {
          cycleNumber: 2,
          month: 8,
          year: 2026,
          deliveryNumber: 1,
        },
      });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("returns unavailable when any required cycle has no confirmed capacity", async () => {
      mockCycleQueries([
        { data: { cycle_number: 1, month: 8, year: 2026 }, error: null },
        { data: { id: "cycle-2" }, error: null },
      ]);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never);

      await expect(checkSubscriptionCapacity(1)).resolves.toEqual({
        available: false,
        firstUnavailableCycle: {
          cycleNumber: 2,
          month: 8,
          year: 2026,
          deliveryNumber: 1,
        },
      });
    });

    it("returns available only when every required cycle exists and is confirmed", async () => {
      mockCycleQueries([
        { data: { cycle_number: 1, month: 8, year: 2026 }, error: null },
        { data: { id: "cycle-2" }, error: null },
        { data: { id: "cycle-3" }, error: null },
      ]);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null } as never)
        .mockResolvedValueOnce({ data: true, error: null } as never);

      await expect(checkSubscriptionCapacity(2)).resolves.toEqual({ available: true });
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });
});
