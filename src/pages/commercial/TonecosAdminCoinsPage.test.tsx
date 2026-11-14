import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AdminCoins from "./TonecosAdminCoinsPage";

const USER = "11111111-1111-4111-8111-111111111111";
const REF = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), credit: vi.fn() }));
vi.mock("@/services/coins/tonecos-coins-service", () => ({
  findTonecosCoinRecipient: mocks.lookup,
  creditTonecosCoins: mocks.credit,
}));
function renderPage() {
  return render(
    <MemoryRouter>
      <HelmetProvider>
        <AdminCoins />
      </HelmetProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID: () => REF });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Tonecos controlled coin credit page", () => {
  it("does not expose a customer directory when admin authorization is denied", async () => {
    mocks.lookup.mockRejectedValue(new Error("Admin access required"));
    renderPage();
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail exato" }), {
      target: { value: "client@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Localizar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acesso administrativo não autorizado.",
    );
    expect(
      screen.queryByRole("button", { name: "Confirmar crédito" }),
    ).not.toBeInTheDocument();
    expect(mocks.credit).not.toHaveBeenCalled();
  });

  it("looks up a single customer and credits via an idempotent server-side RPC", async () => {
    mocks.lookup.mockResolvedValue({
      id: USER,
      email: "client@example.test",
      fullName: "Cliente",
    });
    mocks.credit.mockResolvedValue({
      userId: USER,
      credited: 23,
      balance: 23,
      transactionId: REF,
      idempotent: false,
    });
    renderPage();
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail exato" }), {
      target: { value: "client@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Localizar" }));
    expect(
      await screen.findByText(/Cliente · client@example.test/),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Quantidade de moedas" }),
      {
        target: { value: "23" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Justificativa do crédito" }),
      {
        target: { value: "Crédito manual autorizado" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar crédito" }));
    await waitFor(() =>
      expect(mocks.credit).toHaveBeenCalledWith({
        userId: USER,
        amount: 23,
        referenceKey: REF,
        reason: "Crédito manual autorizado",
      }),
    );
    expect(
      await screen.findByText(/23 moedas registradas/),
    ).toBeInTheDocument();
  });
});
