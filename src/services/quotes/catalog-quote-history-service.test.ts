import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCatalogQuoteHistory } from "./catalog-quote-history-service";

const QUOTE = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  isLocalPreviewActive: vi.fn(() => false),
  assertQuotesEnabled: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosQuotesEnabled: mocks.assertQuotesEnabled,
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  isTonecosLocalPreviewEnabled: mocks.isLocalPreviewActive,
  TONECOS_LOCAL_PREVIEW_QUOTE_ID: "a0000000-0000-4000-8000-000000000001",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isLocalPreviewActive.mockReturnValue(false);
  mocks.assertQuotesEnabled.mockImplementation(() => undefined);
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("canonical quote history boundary", () => {
  it("serves the user's local request without inventing team updates", async () => {
    mocks.isLocalPreviewActive.mockReturnValue(true);
    await expect(
      loadCatalogQuoteHistory(["a0000000-0000-4000-8000-000000000001"]),
    ).resolves.toMatchObject({
      "a0000000-0000-4000-8000-000000000001": [
        { type: "submitted", toStatus: "pending" },
      ],
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reads a bounded immutable timeline through quote_events RLS", async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            quote_id: QUOTE,
            actor_user_id: null,
            event_type: "submitted",
            from_status: null,
            to_status: "pending",
            amount: null,
            response_text: null,
            created_at: "2026-11-13T09:00:00Z",
          },
          {
            id: 2,
            quote_id: QUOTE,
            actor_user_id: null,
            event_type: "answered",
            from_status: "reviewing",
            to_status: "answered",
            amount: 249.9,
            response_text: "Proposta válida por 7 dias.",
            created_at: "2026-11-13T10:00:00Z",
          },
        ],
        error: null,
      });
    mocks.from.mockReturnValue(query);

    await expect(loadCatalogQuoteHistory([QUOTE])).resolves.toEqual({
      [QUOTE]: [
        {
          id: 1,
          quoteId: QUOTE,
          type: "submitted",
          fromStatus: null,
          toStatus: "pending",
          amount: null,
          responseText: null,
          createdAt: "2026-11-13T09:00:00Z",
        },
        {
          id: 2,
          quoteId: QUOTE,
          type: "answered",
          fromStatus: "reviewing",
          toStatus: "answered",
          amount: 249.9,
          responseText: "Proposta válida por 7 dias.",
          createdAt: "2026-11-13T10:00:00Z",
        },
      ],
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("quote_events");
    expect(query.in).toHaveBeenCalledWith("quote_id", [QUOTE]);
  });

  it("rejects malformed IDs and malformed event rows without fallback", async () => {
    await expect(loadCatalogQuoteHistory(["../admin"])).rejects.toThrow(
      "catalog_quote_history_ids_invalid",
    );
    expect(mocks.from).not.toHaveBeenCalled();

    const query = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            quote_id: QUOTE,
            event_type: "answered",
            from_status: "pending",
            to_status: "answered",
            amount: null,
            response_text: null,
            created_at: "2026-11-13T10:00:00Z",
          },
        ],
        error: null,
      });
    mocks.from.mockReturnValue(query);
    await expect(loadCatalogQuoteHistory([QUOTE])).rejects.toThrow(
      "catalog_quote_history_row_invalid",
    );
  });
});
