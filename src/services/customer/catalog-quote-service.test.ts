import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listMyCatalogQuotes,
  loadMyCatalogQuotePage,
  quoteItemsFromSelection,
  submitCatalogQuoteRequest,
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
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.assertCurrentUserId.mockResolvedValue(USER);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated Tonecos catalog quote boundary", () => {
  it("converts only slugs into unpriced quote items, without mirroring catalog data", () => {
    const models = [
      {
        slug: "nier-2b",
        id: "model-1",
        name: "2B",
        code: "A1",
        coverStorageKey: "media/a.webp",
      },
      {
        slug: "naruto",
        id: "model-2",
        name: "Naruto",
        code: "A2",
        coverStorageKey: "media/b.webp",
      },
    ] as PublicCatalogModel[];
    expect(quoteItemsFromSelection(models)).toEqual([
      { slug: "nier-2b", quantity: 1 },
      { slug: "naruto", quantity: 1 },
    ]);
  });

  it("writes slug, quantity, notes and validated preferences through the canonical RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(
      submitCatalogQuoteRequest(
        USER,
        [
          { slug: "nier-2b", quantity: 2 },
          { slug: "naruto", quantity: 1 },
        ],
        "  Escala 1/5  ",
      ),
    ).resolves.toBe(QUOTE);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "submit_catalog_quote_request",
      {
        p_models: [
          { slug: "nier-2b", quantity: 2 },
          { slug: "naruto", quantity: 1 },
        ],
        p_notes: "Escala 1/5",
        p_whatsapp: undefined,
        p_postal_code: undefined,
        p_scale: "a definir",
        p_finishing: "a definir",
      },
    );
  });

  it("persists optional WhatsApp, CEP, scale and finishing in the same quote authority", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(
      submitCatalogQuoteRequest(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "Peça pintada",
        {
          whatsapp: "(71) 99999-9999",
          postalCode: "40000-000",
          scale: "1/6",
          finishing: "pintado",
        },
      ),
    ).resolves.toBe(QUOTE);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "submit_catalog_quote_request",
      {
        p_models: [{ slug: "naruto", quantity: 1 }],
        p_notes: "Peça pintada",
        p_whatsapp: "71999999999",
        p_postal_code: "40000000",
        p_scale: "1/6",
        p_finishing: "pintado",
      },
    );
  });

  it("rejects invalid quote contact and finishing before network or login I/O", async () => {
    for (const preferences of [
      { whatsapp: "not-a-phone" },
      { whatsapp: "123" },
      { postalCode: "123" },
      { scale: "unauthorized" as "1/10" },
      { finishing: "unrecognized" as "pintado" },
    ]) {
      await expect(
        submitCatalogQuoteRequest(
          USER,
          [{ slug: "naruto", quantity: 1 }],
          null,
          preferences,
        ),
      ).rejects.toThrow("catalog_quote_contact_invalid");
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
  });

  it("never submits in read-only previews or without explicit commercial release", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toThrow("catalog_quotes_not_enabled");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toThrow("catalog_quotes_not_enabled");
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
      [
        { slug: "naruto", quantity: 1 },
        { slug: "naruto", quantity: 1 },
      ],
      Array.from({ length: 51 }, (_, i) => ({
        slug: "model-" + i,
        quantity: 1,
      })),
    ];
    for (const items of invalid) {
      await expect(submitCatalogQuoteRequest(USER, items)).rejects.toThrow(
        /catalog_quote_/,
      );
    }
    await expect(
      submitCatalogQuoteRequest(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "x".repeat(2001),
      ),
    ).rejects.toThrow("catalog_quote_notes_invalid");
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("propagates authenticated/RPC errors and refuses malformed IDs", async () => {
    mocks.assertCurrentUserId.mockRejectedValueOnce(
      new Error("User not authenticated"),
    );
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toThrow("User not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toMatchObject({ message: "RLS denied" });
    mocks.rpc.mockResolvedValueOnce({ data: "invalid", error: null });
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toThrow("catalog_quote_response_invalid");
  });

  it("reads only bounded catalog requests for the current user without showing 0 as a price", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      data: [
        {
          id: QUOTE,
          status: "pending",
          created_at: "2026-11-05T00:00:00Z",
          deadline: null,
          notes: "Naruto",
          total_amount: 0,
          admin_response: null,
          catalog_requested_at: "2026-11-05T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
        },
        {
          id: USER,
          status: "answered",
          created_at: "2026-11-04T00:00:00Z",
          deadline: null,
          notes: null,
          total_amount: 129.9,
          admin_response: "Proposta válida por 7 dias.",
          catalog_requested_at: "2026-11-04T00:00:00Z",
          requested_catalog_models: [{ slug: "nier-2b", quantity: 2 }],
        },
      ],
      error: null,
      count: 2,
    });
    mocks.from.mockReturnValue(query);
    const quotes = await listMyCatalogQuotes(USER);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER);
    expect(query.not).toHaveBeenCalledExactlyOnceWith(
      "catalog_requested_at",
      "is",
      null,
    );
    expect(query.range).toHaveBeenCalledWith(0, 19);
    expect(quotes[0]).toMatchObject({
      id: QUOTE,
      status: "pending",
      quotedAmount: null,
      items: [{ slug: "naruto", quantity: 1 }],
    });
    expect(quotes[1]).toMatchObject({
      quotedAmount: 129.9,
      responseMessage: "Proposta válida por 7 dias.",
      items: [{ slug: "nier-2b", quantity: 2 }],
    });
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER);

    query.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 42,
    });
    await expect(
      loadMyCatalogQuotePage(USER, { limit: 20, offset: 20 }),
    ).resolves.toEqual({ total: 42, limit: 20, offset: 20, rows: [] });
    expect(query.range).toHaveBeenLastCalledWith(20, 39);
  });

  it("refuses legacy quotes and empty item sets if a query unexpectedly returns them", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    for (const method of ["select", "eq", "not", "order"] as const) {
      query[method].mockReturnValue(query);
    }
    mocks.from.mockReturnValue(query);
    const oldRow = {
      id: QUOTE,
      status: "answered",
      created_at: "2026-11-05T00:00:00Z",
      catalog_requested_at: null,
      requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
      total_amount: 249.9,
    };
    query.range.mockResolvedValueOnce({
      data: [oldRow],
      error: null,
      count: 1,
    });
    await expect(listMyCatalogQuotes(USER)).rejects.toThrow(
      "catalog_quote_row_invalid",
    );
    query.range.mockResolvedValueOnce({
      data: [
        {
          ...oldRow,
          catalog_requested_at: "2026-11-05T00:00:00Z",
          requested_catalog_models: [],
        },
      ],
      error: null,
      count: 1,
    });
    await expect(listMyCatalogQuotes(USER)).rejects.toThrow(
      "catalog_quote_selection_invalid",
    );
    expect(query.not).toHaveBeenCalledWith("catalog_requested_at", "is", null);
  });

  it("rejects invalid quote page bounds and read errors without fallback", async () => {
    await expect(loadMyCatalogQuotePage(USER, { limit: 200 })).rejects.toThrow(
      "catalog_quote_list_query_invalid",
    );
    await expect(loadMyCatalogQuotePage(USER, { offset: -1 })).rejects.toThrow(
      "catalog_quote_list_query_invalid",
    );
    expect(mocks.from).not.toHaveBeenCalled();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.not.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      data: null,
      error: { message: "offline" },
    });
    mocks.from.mockReturnValue(query);
    await expect(loadMyCatalogQuotePage(USER, { limit: 3, offset: 6 }))
      .rejects.toMatchObject({ message: "offline" });
    expect(query.range).toHaveBeenCalledWith(6, 8);
  });
});
