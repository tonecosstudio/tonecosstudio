import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listMyCatalogQuotes, quoteItemsFromSelection, submitCatalogQuoteRequest,
} from "./catalog-quote-service";
import type { PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";

const USER = "11111111-1111-4111-8111-111111111111";
const QUOTE = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  assertCurrentUserId: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertCurrentUserId,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.assertCurrentUserId.mockResolvedValue(USER);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated Tonecos catalog quote boundary", () => {
  it("converts only slugs into unpriced quote items, without mirroring catalog data", () => {
    const models = [
      { slug: "nier-2b", id: "model-1", name: "2B", code: "A1", coverStorageKey: "media/a.webp" },
      { slug: "naruto", id: "model-2", name: "Naruto", code: "A2", coverStorageKey: "media/b.webp" },
    ] as PublicCatalogModel[];
    expect(quoteItemsFromSelection(models)).toEqual([
      { slug: "nier-2b", quantity: 1 },
      { slug: "naruto", quantity: 1 },
    ]);
  });

  it("writes only slug/quantity/notes through authenticated canonical RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(submitCatalogQuoteRequest(USER, [
      { slug: "nier-2b", quantity: 2 },
      { slug: "naruto", quantity: 1 },
    ], "  Escala 1/5  ")).resolves.toBe(QUOTE);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("submit_catalog_quote_request", {
      p_models: [
        { slug: "nier-2b", quantity: 2 },
        { slug: "naruto", quantity: 1 },
      ],
      p_notes: "Escala 1/5",
    });
  });

  it("never submits in read-only previews or without explicit commercial release", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]))
      .rejects.toThrow("catalog_quotes_not_enabled");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]))
      .rejects.toThrow("catalog_quotes_not_enabled");
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed, duplicated and oversized submissions before I/O", async () => {
    const invalid = [
      [],
      [{ slug: "../admin", quantity: 1 }],
      [{ slug: "naruto", quantity: 0 }],
      [{ slug: "naruto", quantity: 11 }],
      [{ slug: "naruto", quantity: 1.5 }],
      [{ slug: "naruto", quantity: 1 }, { slug: "naruto", quantity: 1 }],
      Array.from({ length: 51 }, (_, i) => ({ slug: "model-" + i, quantity: 1 })),
    ];
    for (const items of invalid) {
      await expect(submitCatalogQuoteRequest(USER, items)).rejects.toThrow(/catalog_quote_/);
    }
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }], "x".repeat(2001)))
      .rejects.toThrow("catalog_quote_notes_invalid");
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("propagates authenticated/RPC errors and refuses malformed IDs", async () => {
    mocks.assertCurrentUserId.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]))
      .rejects.toThrow("User not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "RLS denied" } });
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]))
      .rejects.toMatchObject({ message: "RLS denied" });
    mocks.rpc.mockResolvedValueOnce({ data: "invalid", error: null });
    await expect(submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]))
      .rejects.toThrow("catalog_quote_response_invalid");
  });

  it("reads bounded quotes for the current user without showing 0 as a price", async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [
        { id: QUOTE, status: "pending", created_at: "2026-11-05T00:00:00Z", deadline: null,
          notes: "Naruto", total_amount: 0, catalog_requested_at: "2026-11-05T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }] },
        { id: USER, status: "answered", created_at: "2026-11-04T00:00:00Z", deadline: null,
          notes: null, total_amount: 129.9, catalog_requested_at: null,
          requested_catalog_models: [] },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);
    const quotes = await listMyCatalogQuotes(USER);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(quotes[0]).toMatchObject({
      id: QUOTE, status: "pending", quotedAmount: null,
      items: [{ slug: "naruto", quantity: 1 }],
    });
    expect(quotes[1]).toMatchObject({ quotedAmount: 129.9, items: [] });
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER);
  });

  it("rejects invalid quote list limits and read errors without fallback", async () => {
    await expect(listMyCatalogQuotes(USER, 200)).rejects.toThrow("catalog_quote_list_limit_invalid");
    expect(mocks.from).not.toHaveBeenCalled();
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: null, error: { message: "offline" } });
    mocks.from.mockReturnValue(query);
    await expect(listMyCatalogQuotes(USER, 3)).rejects.toMatchObject({ message: "offline" });
  });
});
