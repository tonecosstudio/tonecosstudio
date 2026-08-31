import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSalesOpen, getCurrentProductionLimit } from "./production-limit-service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("production-limit-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a coherent current production limit", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        prod_month: 8,
        prod_year: 2026,
        prod_global_limit: 100,
        prod_units_sold: 25,
        prod_available: 75,
        prod_is_closed: false,
        prod_percentage_sold: 25,
      },
      error: null,
    });
    vi.mocked(supabase.rpc).mockReturnValueOnce({ single } as never);

    await expect(getCurrentProductionLimit()).resolves.toEqual({
      prod_month: 8,
      prod_year: 2026,
      prod_global_limit: 100,
      prod_units_sold: 25,
      prod_available: 75,
      prod_is_closed: false,
      prod_percentage_sold: 25,
    });
  });

  it("rejects an empty production limit response", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.rpc).mockReturnValueOnce({ single } as never);

    await expect(getCurrentProductionLimit()).rejects.toThrow(
      "Configuração de produção indisponível.",
    );
  });

  it("rejects internally inconsistent capacity numbers", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        prod_month: 8,
        prod_year: 2026,
        prod_global_limit: 100,
        prod_units_sold: 25,
        prod_available: 80,
        prod_is_closed: false,
        prod_percentage_sold: 25,
      },
      error: null,
    });
    vi.mocked(supabase.rpc).mockReturnValueOnce({ single } as never);

    await expect(getCurrentProductionLimit()).rejects.toThrow(
      "Configuração de produção inválida.",
    );
  });

  it("returns true only for an explicit boolean true sales status", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never);
    await expect(checkSalesOpen()).resolves.toBe(true);
  });

  it("preserves an explicit closed sales status", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never);
    await expect(checkSalesOpen()).resolves.toBe(false);
  });

  it("rejects a missing or malformed sales status instead of opening by fallback", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);
    await expect(checkSalesOpen()).rejects.toThrow("Status de vendas indisponível.");
  });
});
