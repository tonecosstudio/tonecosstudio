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
  isLocalPreviewActive: vi.fn(() => false),
  assertQuotesEnabled: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosQuotesEnabled: mocks.assertQuotesEnabled,
}));
vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertCurrentUserId,
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  isTonecosLocalPreviewEnabled: mocks.isLocalPreviewActive,
  TONECOS_LOCAL_PREVIEW_QUOTE_ID: "a0000000-0000-4000-8000-000000000001",
  TONECOS_LOCAL_PREVIEW_USER_ID: "00000000-0000-4000-8000-000000000001",
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.assertCurrentUserId.mockResolvedValue(USER);
  mocks.isLocalPreviewActive.mockReturnValue(false);
  mocks.assertQuotesEnabled.mockReset();
  mocks.assertQuotesEnabled.mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated Tonecos catalog quote boundary", () => {
  it("serves the customer's local pending request without Supabase access", async () => {
    mocks.isLocalPreviewActive.mockReturnValue(true);
    const page = await loadMyCatalogQuotePage(
      "00000000-0000-4000-8000-000000000001",
    );

    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({
      id: "a0000000-0000-4000-8000-000000000001",
      status: "pending",
      quotedAmount: null,
      responseMessage: null,
      isPreorder: false,
      depositAmount: null,
      remainingAmount: null,
    });
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

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

  it("starts a R$50 pre-sale request inside the canonical quote relation", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(
      submitCatalogQuoteRequest(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "Preferência por acabamento pintado",
        { scale: "1/10", finishing: "pintado" },
        "preorder",
      ),
    ).resolves.toBe(QUOTE);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "submit_catalog_preorder_request",
      {
        p_models: [{ slug: "naruto", quantity: 1 }],
        p_notes: "Preferência por acabamento pintado",
        p_whatsapp: undefined,
        p_postal_code: undefined,
        p_scale: "1/10",
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

  it("blocks read-only previews and ignores the retired quote feature switch", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mocks.assertQuotesEnabled.mockImplementationOnce(() => {
      throw new Error("catalog_quotes_not_enabled");
    });
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).rejects.toThrow("catalog_quotes_not_enabled");
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();

    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    mocks.rpc.mockResolvedValueOnce({ data: QUOTE, error: null });
    await expect(
      submitCatalogQuoteRequest(USER, [{ slug: "naruto", quantity: 1 }]),
    ).resolves.toBe(QUOTE);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledExactlyOnceWith(USER);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "submit_catalog_quote_request",
      {
        p_models: [{ slug: "naruto", quantity: 1 }],
        p_notes: undefined,
        p_whatsapp: undefined,
        p_postal_code: undefined,
        p_scale: "a definir",
        p_finishing: "a definir",
      },
    );
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
          list_amount: null,
          discount_percent: 0,
          discount_amount: 0,
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
          list_amount: 129.9,
          discount_percent: 0,
          discount_amount: 0,
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

  it("loads an exact authorized quote without scanning paginated history", async () => {
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
    query.range.mockResolvedValue({
      data: [
        {
          id: QUOTE,
          status: "reviewing",
          created_at: "2026-11-14T00:00:00Z",
          catalog_requested_at: "2026-11-14T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          deadline: null,
          notes: null,
          total_amount: null,
          list_amount: null,
          discount_percent: 0,
          discount_amount: 0,
          admin_response: null,
          customer_whatsapp: null,
          postal_code: null,
          desired_scale: "a definir",
          finishing: "a definir",
        },
      ],
      error: null,
      count: 1,
    });
    mocks.from.mockReturnValue(query);
    const page = await loadMyCatalogQuotePage(USER, {
      quoteId: QUOTE.toUpperCase(),
      limit: 1,
      offset: 0,
    });
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].id).toBe(QUOTE);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER);
    expect(query.eq).toHaveBeenCalledWith("id", QUOTE);
    expect(query.range).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER);
  });

  it("reads applied Coins from the existing payment ledger for the quote owner", async () => {
    const quoteQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    for (const method of ["select", "eq", "not", "order"] as const) {
      quoteQuery[method].mockReturnValue(quoteQuery);
    }
    quoteQuery.range.mockResolvedValue({
      data: [
        {
          id: QUOTE,
          status: "answered",
          created_at: "2026-11-14T00:00:00Z",
          deadline: null,
          notes: null,
          total_amount: 150,
          list_amount: 300,
          discount_percent: 50,
          discount_amount: 150,
          admin_response: "Desconto aplicado.",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          catalog_requested_at: "2026-11-14T00:00:00Z",
          customer_whatsapp: null,
          postal_code: null,
          desired_scale: "a definir",
          finishing: "a definir",
          is_preorder: false,
          deposit_amount: null,
          remaining_amount: 125,
          payment_status: "pending",
          payment_link: null,
          pix_key: null,
          payment_instructions: null,
          payment_link_sent_at: null,
          final_payment_notified_at: null,
          ready_for_final_payment: false,
          payment_voucher_path: null,
          payment_voucher_type: null,
          payment_voucher_rejection_reason: null,
        },
      ],
      error: null,
      count: 1,
    });
    const coinPaymentsQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    coinPaymentsQuery.select.mockReturnValue(coinPaymentsQuery);
    coinPaymentsQuery.eq.mockReturnValue(coinPaymentsQuery);
    coinPaymentsQuery.in.mockResolvedValue({
      data: [{ quote_id: QUOTE, amount: 25 }],
      error: null,
    });
    mocks.from.mockImplementation((table: string) =>
      table === "quotes" ? quoteQuery : coinPaymentsQuery,
    );

    const page = await loadMyCatalogQuotePage(USER);

    expect(page.rows[0].coinAmountApplied).toBe(25);
    expect(coinPaymentsQuery.eq).toHaveBeenCalledWith("user_id", USER);
    expect(coinPaymentsQuery.eq).toHaveBeenCalledWith("payment_type", "coins");
    expect(coinPaymentsQuery.in).toHaveBeenCalledWith("quote_id", [QUOTE]);
  });

  it("preserves ordinary quote history while preorder payment columns await migration", async () => {
    const makeQuery = (response: {
      data: unknown;
      error: unknown;
      count?: number | null;
    }) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        not: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn().mockResolvedValue(response),
      };
      return query;
    };
    const unavailable = makeQuery({
      data: null,
      error: {
        code: "42703",
        message: "column quotes.is_preorder does not exist",
      },
    });
    const compatible = makeQuery({
      data: [
        {
          id: QUOTE,
          status: "answered",
          created_at: "2026-11-14T00:00:00Z",
          deadline: null,
          notes: null,
          total_amount: 300,
          list_amount: 300,
          discount_percent: 0,
          discount_amount: 0,
          admin_response: "Orçamento aprovado.",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          catalog_requested_at: "2026-11-14T00:00:00Z",
          customer_whatsapp: null,
          postal_code: null,
          desired_scale: "a definir",
          finishing: "a definir",
        },
      ],
      error: null,
      count: 1,
    });
    mocks.from.mockReturnValueOnce(unavailable).mockReturnValueOnce(compatible);

    const page = await loadMyCatalogQuotePage(USER);
    expect(page).toMatchObject({
      total: 1,
      rows: [
        {
          id: QUOTE,
          quotedAmount: 300,
          isPreorder: false,
          paymentStatus: null,
          paymentVoucherPath: null,
        },
      ],
    });
    expect(unavailable.select).toHaveBeenCalledWith(
      expect.stringContaining("is_preorder"),
      { count: "exact" },
    );
    expect(compatible.select).toHaveBeenCalledWith(
      expect.not.stringContaining("is_preorder"),
      { count: "exact" },
    );
    expect(compatible.eq).toHaveBeenCalledWith("user_id", USER);
  });

  it("shows the Black Friday base, percentage, reduction and final amount in customer history", async () => {
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
    query.range.mockResolvedValue({
      data: [
        {
          id: QUOTE,
          status: "answered",
          created_at: "2026-11-14T00:00:00Z",
          catalog_requested_at: "2026-11-14T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          deadline: null,
          notes: null,
          total_amount: 150,
          list_amount: 300,
          discount_percent: 50,
          discount_amount: 150,
          admin_response: "Oferta Black Friday aplicada.",
        },
      ],
      error: null,
      count: 1,
    });
    mocks.from.mockReturnValue(query);

    const page = await loadMyCatalogQuotePage(USER);

    expect(page.rows[0]).toMatchObject({
      quotedAmount: 150,
      listAmount: 300,
      discountPercent: 50,
      discountAmount: 150,
    });
  });

  it("rejects a customer quote whose discount percentage does not match its reduction", async () => {
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
    query.range.mockResolvedValue({
      data: [
        {
          id: QUOTE,
          status: "answered",
          created_at: "2026-11-14T00:00:00Z",
          catalog_requested_at: "2026-11-14T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          deadline: null,
          notes: null,
          total_amount: 150,
          list_amount: 300,
          discount_percent: 0,
          discount_amount: 150,
          admin_response: "Resposta inconsistente.",
        },
      ],
      error: null,
      count: 1,
    });
    mocks.from.mockReturnValue(query);

    await expect(loadMyCatalogQuotePage(USER)).rejects.toThrow(
      "catalog_quote_promotion_invalid",
    );
  });

  it("falls back to ordinary quote history while promotion columns await migration", async () => {
    const makeQuery = (response: {
      data: unknown;
      error: unknown;
      count?: number | null;
    }) => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        not: vi.fn(),
        order: vi.fn(),
        range: vi.fn().mockResolvedValue(response),
      };
      for (const method of ["select", "eq", "not", "order"] as const) {
        query[method].mockReturnValue(query);
      }
      return query;
    };
    const unavailable = makeQuery({
      data: null,
      error: {
        code: "42703",
        message: "column quotes.discount_percent does not exist",
      },
    });
    const compatible = makeQuery({
      data: [
        {
          id: QUOTE,
          status: "answered",
          created_at: "2026-11-14T00:00:00Z",
          catalog_requested_at: "2026-11-14T00:00:00Z",
          requested_catalog_models: [{ slug: "naruto", quantity: 1 }],
          deadline: null,
          notes: null,
          total_amount: 300,
          admin_response: "Orçamento aprovado.",
        },
      ],
      error: null,
      count: 1,
    });
    mocks.from.mockReturnValueOnce(unavailable).mockReturnValueOnce(compatible);

    const page = await loadMyCatalogQuotePage(USER);

    expect(page.rows[0]).toMatchObject({
      quotedAmount: 300,
      listAmount: 300,
      discountPercent: 0,
      discountAmount: 0,
    });
    expect(unavailable.select).toHaveBeenCalledWith(
      expect.stringContaining("discount_percent"),
      { count: "exact" },
    );
    expect(compatible.select).toHaveBeenCalledWith(
      expect.not.stringContaining("discount_percent"),
      { count: "exact" },
    );
    expect(compatible.select).toHaveBeenCalledWith(
      expect.stringContaining("is_preorder"),
      { count: "exact" },
    );
  });

  it("rejects invalid exact quote identifiers before any authentication or network I/O", async () => {
    for (const quoteId of ["../admin", "123", QUOTE + "&other=1"]) {
      await expect(
        loadMyCatalogQuotePage(USER, { quoteId, limit: 1, offset: 0 }),
      ).rejects.toThrow("catalog_quote_list_query_invalid");
    }
    await expect(
      loadMyCatalogQuotePage(USER, { quoteId: QUOTE, limit: 20 }),
    ).rejects.toThrow("catalog_quote_list_query_invalid");
    expect(mocks.assertCurrentUserId).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
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
    await expect(
      loadMyCatalogQuotePage(USER, { limit: 3, offset: 6 }),
    ).rejects.toMatchObject({ message: "offline" });
    expect(query.range).toHaveBeenCalledWith(6, 8);
  });
});
