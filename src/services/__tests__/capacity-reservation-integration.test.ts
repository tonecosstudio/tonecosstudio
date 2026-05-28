import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { checkAvailability, getCapacityUsage } from "../capacity-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

function mockCycleCapacity(capacity: number | null, usedCapacity: number | null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { capacity, used_capacity: usedCapacity },
          error: null,
        }),
      }),
    }),
  } as any);
}

describe("Capacity Reservation Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCapacityUsage", () => {
    it("calculates usage from canonical capacity columns", async () => {
      mockCycleCapacity(100, 30);

      const usage = await getCapacityUsage("cycle-123");

      expect(usage).toEqual({
        max: 100,
        current: 30,
        available: 70,
        percentage: 30,
        reserved: 0,
      });
    });

    it("falls back to safe defaults when nullable capacity fields are absent", async () => {
      mockCycleCapacity(null, null);

      const usage = await getCapacityUsage("cycle-123");

      expect(usage.max).toBe(100);
      expect(usage.current).toBe(0);
      expect(usage.available).toBe(100);
      expect(usage.percentage).toBe(0);
    });

    it("does not expose negative available capacity", async () => {
      mockCycleCapacity(100, 120);

      const usage = await getCapacityUsage("cycle-123");

      expect(usage.available).toBe(0);
      expect(usage.percentage).toBe(120);
    });
  });

  describe("checkAvailability", () => {
    it("delegates availability checks to the database RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);

      const available = await checkAvailability("cycle-123", 5);

      expect(available).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("check_capacity_available", {
        p_cycle_id: "cycle-123",
        p_quantity: 5,
      });
    });

    it("returns false when the database rejects the requested quantity", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any);

      await expect(checkAvailability("cycle-123", 60)).resolves.toBe(false);
    });
  });
});
