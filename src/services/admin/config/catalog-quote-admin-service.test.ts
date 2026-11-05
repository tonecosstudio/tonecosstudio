import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerCatalogQuoteRequest, listAdminCatalogQuotes } from "./catalog-quote-admin-service";

const QUOTE = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.requireAuthenticatedUserId.mockResolvedValue("admin-1");
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "is_tonecos_admin"
      ? { data: true, error: null }
      : { data: QUOTE, error: null },
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("admin catalog quote response boundary", () => {
  it("checks the Tonecos-specific role before invoking the pricing RPC", async () => {
    await expect(answerCatalogQuoteRequest(QUOTE, 279.9)).resolves.toBe(QUOTE);
    expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "is_tonecos_admin");
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "answer_catalog_quote_request", {
      p_quote_id: QUOTE, p_amount: 279.9,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("never contacts Supabase for read-only preview or disabled feature", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(answerCatalogQuoteRequest(QUOTE, 279)).rejects.toThrow("catalog_quotes_not_enabled");
    await expect(listAdminCatalogQuotes()).rejects.toThrow("catalog_quotes_not_enabled");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    await expect(answerCatalogQuoteRequest(QUOTE, 279)).rejects.toThrow("catalog_quotes_not_enabled");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects invalid quote IDs and amounts before authentication", async () => {
    for (const amount of [0, -1, NaN, Infinity, 1.001, 100000000]) {
      await expect(answerCatalogQuoteRequest(QUOTE, amount))
        .rejects.toThrow("admin_catalog_quote_response_invalid");
    }
    await expect(answerCatalogQuoteRequest("../other", 100))
      .rejects.toThrow("admin_catalog_quote_response_invalid");
    expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed for unauthenticated user and for false admin role", async () => {
    mocks.requireAuthenticatedUserId.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toThrow("User not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toThrow("Admin access required");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("propagates role and pricing RPC failures without browser DML", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "not authorized" } });
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toMatchObject({ message: "not authorized" });
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "pricing denied" } });
    await expect(answerCatalogQuoteRequest(QUOTE, 200)).rejects.toMatchObject({ message: "pricing denied" });
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: "other", error: null });
    await expect(answerCatalogQuoteRequest(QUOTE, 200))
      .rejects.toThrow("admin_catalog_quote_result_invalid");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("lists only bounded catalog requests with a trusted role check", async () => {
    const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{
      id: QUOTE, user_id: "client-1", status: "pending", created_at: "2026-11-05T00:00:00Z",
      notes: "1/5", total_amount: null,
      requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
    }], error: null });
    const contacts = { select: vi.fn(), in: vi.fn() };
    contacts.select.mockReturnValue(contacts);
    contacts.in.mockResolvedValue({ data: [
      { id: "client-1", email: "client@example.test", full_name: "Cliente Exemplo" },
    ], error: null });
    mocks.from.mockImplementation((table: string) =>
      table === "quotes" ? query : contacts);
    const rows = await listAdminCatalogQuotes(10);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(contacts.in).toHaveBeenCalledWith("id", ["client-1"]);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("is_tonecos_admin");
    expect(query.not).toHaveBeenCalledWith("catalog_requested_at", "is", null);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(rows).toMatchObject([{
      id: QUOTE, status: "pending", quotedAmount: null,
      customerEmail: "client@example.test", customerName: "Cliente Exemplo",
      items: [{ slug: "naruto", quantity: 1 }],
    }]);
  });

  it("rejects malformed rows and oversized admin queries", async () => {
    await expect(listAdminCatalogQuotes(1000)).rejects.toThrow("admin_catalog_quote_limit_invalid");
    const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{
      id: QUOTE, user_id: "client-1", status: "pending", created_at: "2026-11-05T00:00:00Z",
      notes: null, total_amount: null,
      requested_catalog_models: [{ slug: "../admin", quantity: 1 }],
    }], error: null });
    mocks.from.mockReturnValue(query);
    await expect(listAdminCatalogQuotes()).rejects.toThrow("admin_catalog_quote_item_invalid");
  });
});
