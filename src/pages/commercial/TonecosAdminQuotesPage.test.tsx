import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mocks = vi.hoisted(() => ({
  page: vi.fn(),
  answer: vi.fn(),
  status: vi.fn(),
  history: vi.fn(),
}));
vi.mock("@/services/quotes/catalog-quote-history-service", () => ({
  loadCatalogQuoteHistory: mocks.history,
}));
vi.mock("@/services/admin/config/catalog-quote-admin-service", () => ({
  loadAdminCatalogQuotePage: mocks.page,
  answerCatalogQuoteRequest: mocks.answer,
  changeCatalogQuoteStatus: mocks.status,
}));

import TonecosAdminQuotesPage from "./TonecosAdminQuotesPage";

const quoteA = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
  customerName: "Cliente A",
  customerEmail: "clientea@example.com",
  status: "pending",
  createdAt: "2026-11-11T18:00:00Z",
  notes: null,
  items: [{ slug: "modelo-a", quantity: 1 }],
  quotedAmount: null,
  responseMessage: null,
  whatsapp: null,
  postalCode: null,
  scale: "1/10",
  finishing: "pintado",
};
const quoteB = {
  ...quoteA,
  id: "44444444-4444-4444-8444-444444444444",
  customerName: "Cliente B",
  customerEmail: "clienteb@example.com",
  items: [{ slug: "modelo-b", quantity: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.page.mockResolvedValue({
    total: 2,
    limit: 25,
    offset: 0,
    rows: [quoteA, quoteB],
  });
  mocks.history.mockResolvedValue({});
});
afterEach(cleanup);

function show(url = "/admin/orcamentos") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <HelmetProvider>
        <TonecosAdminQuotesPage />
      </HelmetProvider>
    </MemoryRouter>,
  );
}

describe("TONART administrative quote directory", () => {
  it("opens an exact deep link instead of depending on the newest 50 rows", async () => {
    mocks.page.mockResolvedValueOnce({
      total: 1,
      limit: 1,
      offset: 0,
      rows: [quoteB],
    });
    show("/admin/orcamentos?quote=" + quoteB.id);
    expect(
      await screen.findByText("Solicitação #44444444"),
    ).toBeInTheDocument();
    expect(mocks.page).toHaveBeenCalledWith({
      quoteId: quoteB.id,
      limit: 1,
      offset: 0,
    });
    expect(mocks.history).toHaveBeenCalledWith([quoteB.id]);
  });

  it("does not query the service for a malformed quote reference", async () => {
    show("/admin/orcamentos?quote=not-a-uuid");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Referência de orçamento inválida",
    );
    expect(mocks.page).not.toHaveBeenCalled();
  });

  it("reports an exact quote as missing without showing unrelated records", async () => {
    mocks.page.mockResolvedValueOnce({
      total: 0,
      limit: 1,
      offset: 0,
      rows: [],
    });
    show("/admin/orcamentos?quote=55555555-5555-4555-8555-555555555555");
    expect(
      await screen.findByText("Solicitação não encontrada."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Solicitação #33333333")).not.toBeInTheDocument();
  });

  it("sends grouped Brazilian prices at their full value, never a truncated amount", async () => {
    mocks.answer.mockResolvedValue(quoteA.id);
    show();
    await screen.findByText("Solicitação #33333333");
    fireEvent.change(
      screen.getByRole("textbox", { name: "Valor do orçamento 33333333" }),
      { target: { value: "1.249,90" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Mensagem ao cliente 33333333" }),
      { target: { value: "Proposta válida por sete dias." } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Enviar resposta" })[0],
    );
    await waitFor(() =>
      expect(mocks.answer).toHaveBeenCalledWith(
        quoteA.id,
        1249.9,
        "Proposta válida por sete dias.",
      ),
    );
  });

  it("rejects malformed currency input before calling the privileged quote service", async () => {
    show();
    await screen.findByText("Solicitação #33333333");
    fireEvent.change(
      screen.getByRole("textbox", { name: "Valor do orçamento 33333333" }),
      { target: { value: "1.249,999" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Mensagem ao cliente 33333333" }),
      { target: { value: "Confirmação de preço" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Enviar resposta" })[0],
    );
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("refreshes the administrator queue to show newly submitted requests", async () => {
    show();
    await screen.findByText("Solicitação #33333333");
    await waitFor(() => expect(mocks.page).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar solicitações" }),
    );
    await waitFor(() => expect(mocks.page).toHaveBeenCalledTimes(2));
  });

  it("filters the complete protected queue by status", async () => {
    show();
    await screen.findByText("Solicitação #33333333");
    fireEvent.change(screen.getByLabelText("Filtrar orçamentos por situação"), {
      target: { value: "reviewing" },
    });
    await waitFor(() =>
      expect(mocks.page).toHaveBeenLastCalledWith({
        status: "reviewing",
        limit: 25,
        offset: 0,
      }),
    );
  });

  it("paginates without loading the complete queue in the browser", async () => {
    mocks.page.mockResolvedValueOnce({
      total: 30,
      limit: 25,
      offset: 0,
      rows: [quoteA, quoteB],
    });
    show();
    expect(
      await screen.findByRole("button", { name: "Próxima" }),
    ).toBeEnabled();

    mocks.page.mockResolvedValueOnce({
      total: 30,
      limit: 25,
      offset: 25,
      rows: [quoteB],
    });
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() =>
      expect(mocks.page).toHaveBeenLastCalledWith({
        status: null,
        limit: 25,
        offset: 25,
      }),
    );
  });
});
