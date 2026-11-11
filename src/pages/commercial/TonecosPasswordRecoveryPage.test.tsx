import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Recovery from "./TonecosPasswordRecoveryPage";

const mocks = vi.hoisted(() => ({ user: vi.fn(), request: vi.fn(), complete: vi.fn() }));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.user,
  requestTonecosPasswordReset: mocks.request,
  completeTonecosPasswordRecovery: mocks.complete,
}));
function show(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/recuperar-senha" element={<Recovery />} />
    <Route path="/login" element={<div>Login Tonecos</div>} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Tonecos password recovery screen", () => {
  it("requests a link without leaking account existence", async () => {
    mocks.request.mockResolvedValue(undefined);
    show("/recuperar-senha");
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail da conta" }), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));
    expect(await screen.findByText(/Se o e-mail estiver cadastrado/)).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith("cliente@example.com");
  });
  it("does not show reset password form for expired or invalid sessions", async () => {
    mocks.user.mockResolvedValue(null);
    show("/recuperar-senha?action=update");
    expect(await screen.findByText(/link não possui uma sessão válida/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar nova senha" })).not.toBeInTheDocument();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("shows and hides the new password independently of confirmation", async () => {
    mocks.user.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "cliente@example.com" });
    show("/recuperar-senha?action=update");
    const newPassword = await screen.findByLabelText("Nova senha") as HTMLInputElement;
    const confirmPassword = screen.getByLabelText("Confirmar nova senha") as HTMLInputElement;
    fireEvent.change(newPassword, { target: { value: "SenhaNova123!" } });
    fireEvent.change(confirmPassword, { target: { value: "SenhaNova123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar nova senha" }));
    expect(newPassword.type).toBe("text");
    expect(confirmPassword.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar confirmação da senha" }));
    expect(confirmPassword.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar nova senha" }));
    expect(newPassword.type).toBe("password");
    expect(newPassword.value).toBe("SenhaNova123!");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("requires matching strong passwords with verified session before submitting", async () => {
    mocks.user.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "cliente@example.com" });
    mocks.complete.mockResolvedValue(undefined);
    show("/recuperar-senha?action=update");
    const field = await screen.findByLabelText("Nova senha");
    fireEvent.change(field, { target: { value: "StrongPass123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "AnotherPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(mocks.complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith("StrongPass123!"));
    expect(await screen.findByText("Login Tonecos")).toBeInTheDocument();
  });
});
