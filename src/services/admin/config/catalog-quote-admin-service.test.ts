import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerCatalogQuoteRequest, listAdminCatalogQuotes } from "./catalog-quote-admin-service";

const QUOTE = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  requireCurrentUserAdminAccess: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.requireCurrentUserAdminAccess,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.requireCurrentUserAdminAccess.mockResolvedValue("admin-1");
});
afterEach(() => vi.unstubAllEnvs());

describe("admin catalog quote response boundary", () => {
  it("prices a quote only through the privileged RPC, after checking admin access", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(answerCatalogQuoteRequest(QUOTE, 279.9)).resolves.toBe(QUOTE);
    expect(mocks.requireCurrentUserAdminAccess).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("answer_catalog_quote_request", {
      p_quote_id: QUOTE,
      p_amount: 279.9,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("never sends price or lists customers when read-only or feature disabled", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(answerCatalogQuoteRequest(QUOTE, 279)).rejects.toThrow("catalog_quotes_not_enabled");
    await expect(listAdminCatalogQuotes()).rejects.toThrow("catalog_quotes_not_enabled");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    await expect(answerCatalogQuoteRequest(QUOTE, 279)).rejects.toThrow("catalog_quotes_not_enabled");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects untrusted quote IDs and amounts before any request", async () => {
    for (const amount of [0, -1, NaN, Infinity, 1.001, 100000000]) {
      await expect(answerCatalogQuoteRequest(QUOTE, amount))
        .rejects.toThrow("admin_catalog_quote_response_invalid");
    }
    await expect(answerCatalogQuoteRequest("../other", 100))
      .rejects.toThrow("admin_catalog_quote_response_invalid");
    expect(mocks.requireCurrentUserAdminAccess).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when role verification or privileged RPC fails", async () => {
    mocks.requireCurrentUserAdminAccess.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toThrow("Admin access required");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toMatchObject({ message: "denied" });
    mocks.rpc.mockResolvedValueOnce({ data: "other", error: null });
    await expect(answerCatalogQuoteRequest(QUOTE, 200))
      .rejects.toThrow("admin_catalog_quote_result_invalid");
  });

  it("lists only bounded catalog requests, not arbitrary account records", async () => {
    const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{
      id: QUOTE, user_id: "client-1", status: "pending", created_at: "2026-11-05T00:00:00Z",
      notes: "1/5", total_amount: 0, requested_catalog_models: [
        { slug: "naruto", quantity: 1 },
      ],
    }], error: null });
    mocks.from.mockReturnValue(query);
    const rows = await listAdminCatalogQuotes(10);
    expect(query.not).toHaveBeenCalledWith("catalog_requested_at", "is", null);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(rows).toMatchObject([{
      id: QUOTE, status: "pending", quotedAmount: null,
      items: [{ slug: "naruto", quantity: 1 }],
    }]);
  });

  it("rejects malformed rows and disallows oversized admin queries", async () => {
    await expect(listAdminCatalogQuotes(1000)).rejects.toThrow("admin_catalog_quote_limit_invalid");
    const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{
      id: QUOTE, user_id: "client-1", status: "pending", created_at: "2026-11-05T00:00:00Z",
      notes: null, total_amount: 0, requested_catalog_models: [{ slug: "../admin", quantity: 1 }],
    }], error: null });
    mocks.from.mockReturnValue(query);
    await expect(listAdminCatalogQuotes()).rejects.toThrow("admin_catalog_quote_item_invalid");
  });
});
