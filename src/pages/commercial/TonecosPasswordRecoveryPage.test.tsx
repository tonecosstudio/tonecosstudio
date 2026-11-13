import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Recovery from "./TonecosPasswordRecoveryPage";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  request: vi.fn(),
  complete: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.user,
  requestTonecosPasswordReset: mocks.request,
  completeTonecosPasswordRecovery: mocks.complete,
  verifyTonecosPasswordRecoveryToken: mocks.verify,
}));
function show(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <HelmetProvider>
        <Routes>
          <Route path="/recuperar-senha" element={<Recovery />} />
          <Route path="/login" element={<div>Login Tonecos</div>} />
        </Routes>
      </HelmetProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Tonecos password recovery screen", () => {
  it("requests a link without leaking account existence", async () => {
    mocks.request.mockResolvedValue(undefined);
    show("/recuperar-senha?next=%2Fsolicitar-orcamento");
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail da conta" }), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));
    expect(
      await screen.findByText(/Se o e-mail estiver cadastrado/),
    ).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith(
      "cliente@example.com",
      "/solicitar-orcamento",
    );
  });
  it("does not show reset password form for expired or invalid sessions", async () => {
    mocks.user.mockResolvedValue(null);
    show("/recuperar-senha?action=update");
    expect(
      await screen.findByText(/link não possui uma sessão válida/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar nova senha" }),
    ).not.toBeInTheDocument();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("refuses password reset through a normal signed-in session without email proof", async () => {
    mocks.user.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "cliente@example.com",
    });
    show("/recuperar-senha?action=update");
    expect(
      await screen.findByText(/link não possui uma sessão válida/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar nova senha" }),
    ).not.toBeInTheDocument();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("validates recovery links across browsers using the token hash, then shows a new password form", async () => {
    const tokenHash = "a".repeat(64);
    mocks.verify.mockResolvedValue(undefined);
    mocks.user.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "cliente@example.com",
    });
    show(
      `/recuperar-senha?action=update&next=%2Fsolicitar-orcamento&token_hash=${tokenHash}&type=recovery`,
    );
    expect(
      await screen.findByRole("button", { name: "Salvar nova senha" }),
    ).toBeInTheDocument();
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith(tokenHash);
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: "Voltar ao login" }),
    ).toHaveAttribute("href", "/login?next=%2Fsolicitar-orcamento");
  });

  it("blocks password changes when recovery token verification fails", async () => {
    mocks.verify.mockRejectedValue(new Error("tonecos_recovery_link_invalid"));
    show(
      `/recuperar-senha?action=update&token_hash=${"b".repeat(64)}&type=recovery`,
    );
    expect(
      await screen.findByText(/link não possui uma sessão válida/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar nova senha" }),
    ).not.toBeInTheDocument();
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível validar o link",
    );
  });

  it("shows and hides the new password independently of confirmation", async () => {
    mocks.verify.mockResolvedValue(undefined);
    mocks.user.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "cliente@example.com",
    });
    show(
      `/recuperar-senha?action=update&token_hash=${"c".repeat(64)}&type=recovery`,
    );
    const newPassword = (await screen.findByLabelText(
      "Nova senha",
    )) as HTMLInputElement;
    const confirmPassword = screen.getByLabelText(
      "Confirmar nova senha",
    ) as HTMLInputElement;
    fireEvent.change(newPassword, { target: { value: "SenhaNova123!" } });
    fireEvent.change(confirmPassword, { target: { value: "SenhaNova123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar nova senha" }));
    expect(newPassword.type).toBe("text");
    expect(confirmPassword.type).toBe("password");
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar confirmação da senha" }),
    );
    expect(confirmPassword.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar nova senha" }));
    expect(newPassword.type).toBe("password");
    expect(newPassword.value).toBe("SenhaNova123!");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("requires matching strong passwords with verified session before submitting", async () => {
    mocks.verify.mockResolvedValue(undefined);
    mocks.user.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "cliente@example.com",
    });
    mocks.complete.mockResolvedValue(undefined);
    show(
      `/recuperar-senha?action=update&next=%2Fsolicitar-orcamento&token_hash=${"d".repeat(64)}&type=recovery`,
    );
    const field = await screen.findByLabelText("Nova senha");
    fireEvent.change(field, { target: { value: "StrongPass123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "AnotherPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "As senhas não coincidem.",
    );
    expect(mocks.complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() =>
      expect(mocks.complete).toHaveBeenCalledWith("StrongPass123!"),
    );
    expect(await screen.findByText("Login Tonecos")).toBeInTheDocument();
  });
});
