import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerCatalogQuoteRequest,
  changeCatalogQuoteStatus,
  listAdminCatalogQuotes,
  loadAdminCatalogQuotePage,
} from "./catalog-quote-admin-service";

const QUOTE = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/services/auth/tonecos-admin-access", () => ({
  requireTonecosAdminAccess: mocks.requireAdmin,
}));
vi.mock("@/config/supabase-environment", () => ({
  LOCAL_SUPABASE_FALLBACK: false,
  get PREVIEW_READ_ONLY() {
    return import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  },
  get SUPABASE_URL() {
    return import.meta.env.VITE_SUPABASE_URL ?? "";
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.requireAdmin.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

const row = {
  id: QUOTE,
  userId: USER,
  customerName: "Cliente",
  customerEmail: "cliente@example.test",
  status: "pending",
  createdAt: "2026-11-13T12:00:00Z",
  notes: null,
  quotedAmount: null,
  listAmount: null,
  discountPercent: 0,
  discountAmount: 0,
  responseMessage: null,
  items: [{ slug: "naruto", quantity: 1 }],
  whatsapp: null,
  postalCode: null,
  scale: "a definir",
  finishing: "a definir",
  isPreorder: false,
  depositAmount: null,
  remainingAmount: null,
};

describe("TONART admin quote directory", () => {
  it("loads a complete paginated queue through the protected RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: { total: 1, limit: 25, offset: 0, rows: [row] },
      error: null,
    });
    await expect(loadAdminCatalogQuotePage()).resolves.toEqual({
      total: 1,
      limit: 25,
      offset: 0,
      rows: [row],
    });
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "tonart_admin_quotes_directory",
      {
        p_quote_id: undefined,
        p_status: undefined,
        p_limit: 25,
        p_offset: 0,
      },
    );
  });

  it("retrieves an exact quote independently of queue position", async () => {
    mocks.rpc.mockResolvedValue({
      data: { total: 1, limit: 1, offset: 0, rows: [row] },
      error: null,
    });
    await expect(
      loadAdminCatalogQuotePage({ quoteId: QUOTE, limit: 1 }),
    ).resolves.toMatchObject({ total: 1, rows: [row] });
    expect(mocks.rpc).toHaveBeenCalledWith("tonart_admin_quotes_directory", {
      p_quote_id: QUOTE,
      p_status: undefined,
      p_limit: 1,
      p_offset: 0,
    });
  });

  it("keeps the bounded compatibility helper", async () => {
    mocks.rpc.mockResolvedValue({
      data: { total: 1, limit: 10, offset: 0, rows: [row] },
      error: null,
    });
    await expect(listAdminCatalogQuotes(10)).resolves.toEqual([row]);
  });

  it("rejects invalid query bounds before auth/network I/O", async () => {
    await expect(
      loadAdminCatalogQuotePage({ quoteId: "../admin" }),
    ).rejects.toThrow("admin_catalog_quote_query_invalid");
    await expect(loadAdminCatalogQuotePage({ limit: 101 })).rejects.toThrow(
      "admin_catalog_quote_query_invalid",
    );
    await expect(loadAdminCatalogQuotePage({ offset: -1 })).rejects.toThrow(
      "admin_catalog_quote_query_invalid",
    );
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("answers only after admin verification with base value, discount and message", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(
      answerCatalogQuoteRequest(QUOTE, 300, "Proposta válida por 7 dias.", 50),
    ).resolves.toBe(QUOTE);
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "answer_catalog_quote_request",
      {
        p_quote_id: QUOTE,
        p_amount: 300,
        p_message: "Proposta válida por 7 dias.",
        p_discount_percent: 50,
      },
    );
  });

  it("changes status only through the canonical admin RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: QUOTE, error: null });
    await expect(changeCatalogQuoteStatus(QUOTE, "reviewing")).resolves.toBe(
      QUOTE,
    );
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "admin_update_quote_status",
      { p_quote_id: QUOTE, p_status: "reviewing" },
    );
  });

  it("fails closed for invalid responses and malformed RPC rows", async () => {
    await expect(
      answerCatalogQuoteRequest(QUOTE, 0, "Proposta"),
    ).rejects.toThrow("admin_catalog_quote_response_invalid");
    await expect(answerCatalogQuoteRequest(QUOTE, 10, " ")).rejects.toThrow(
      "admin_catalog_quote_response_invalid",
    );
    await expect(
      answerCatalogQuoteRequest(QUOTE, 300, "Proposta", 51),
    ).rejects.toThrow("admin_catalog_quote_response_invalid");
    await expect(
      answerCatalogQuoteRequest(QUOTE, 0.01, "Proposta", 50),
    ).rejects.toThrow("admin_catalog_quote_response_invalid");
    expect(mocks.requireAdmin).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValue({
      data: {
        total: 1,
        limit: 25,
        offset: 0,
        rows: [{ ...row, customerEmail: "" }],
      },
      error: null,
    });
    await expect(loadAdminCatalogQuotePage()).rejects.toThrow(
      "admin_catalog_quote_row_invalid",
    );

    mocks.rpc.mockResolvedValueOnce({
      data: {
        total: 1,
        limit: 25,
        offset: 0,
        rows: [
          {
            ...row,
            status: "answered",
            quotedAmount: 150,
            listAmount: 300,
            discountPercent: 0,
            discountAmount: 150,
          },
        ],
      },
      error: null,
    });
    await expect(loadAdminCatalogQuotePage()).rejects.toThrow(
      "admin_catalog_quote_row_invalid",
    );
  });
});
