import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), answer: vi.fn(), status: vi.fn(),
}));
vi.mock("@/services/admin/config/catalog-quote-admin-service", () => ({
  listAdminCatalogQuotes: mocks.list,
  answerCatalogQuoteRequest: mocks.answer,
  changeCatalogQuoteStatus: mocks.status,
}));

import TonecosAdminQuotesPage from "./TonecosAdminQuotesPage";

const quoteA = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
  customerName: "Cliente A", customerEmail: "clientea@example.com",
  status: "pending", createdAt: "2026-11-11T18:00:00Z",
  notes: null, items: [{ slug: "modelo-a", quantity: 1 }],
  quotedAmount: null, whatsapp: null, postalCode: null,
  scale: "1/10", finishing: "pintado",
};
const quoteB = {
  ...quoteA,
  id: "44444444-4444-4444-8444-444444444444",
  customerName: "Cliente B", customerEmail: "clienteb@example.com",
  items: [{ slug: "modelo-b", quantity: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([quoteA, quoteB]);
});
afterEach(cleanup);

function show(url = "/admin/orcamentos") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TonecosAdminQuotesPage />
    </MemoryRouter>,
  );
}

describe("TONART administrative quote deep links", () => {
  it("opens a selected quote using the canonical queue without creating a separate inbox", async () => {
    show("/admin/orcamentos?quote=" + quoteB.id);
    expect(await screen.findByText("Solicitação #44444444")).toBeInTheDocument();
    expect(screen.queryByText("Solicitação #33333333")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos os orçamentos" }))
      .toHaveAttribute("href", "/admin/orcamentos");
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("does not return unrelated quote details when reference is invalid", async () => {
    show("/admin/orcamentos?quote=not-a-uuid");
    expect(await screen.findByRole("alert")).toHaveTextContent("Referência de orçamento inválida");
    expect(screen.queryByText("Solicitação #33333333")).not.toBeInTheDocument();
    expect(screen.queryByText("Solicitação #44444444")).not.toBeInTheDocument();
  });

  it("explains bounded queue limitations when a valid quote is outside the recent list", async () => {
    show("/admin/orcamentos?quote=55555555-5555-4555-8555-555555555555");
    expect(await screen.findByText(/não está entre as 50 mais recentes carregadas/)).toBeInTheDocument();
    expect(screen.queryByText("Solicitação #33333333")).not.toBeInTheDocument();
  });

  it("preserves the unfiltered operational quote queue", async () => {
    show();
    expect(await screen.findByText("Solicitação #33333333")).toBeInTheDocument();
    expect(screen.getByText("Solicitação #44444444")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver todos os orçamentos" })).not.toBeInTheDocument();
  });
});
