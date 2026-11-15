import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TonecosAccountPage from "./TonecosAccountPage";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/config/supabase-environment", () => ({
  LOCAL_SUPABASE_FALLBACK: true,
  PREVIEW_READ_ONLY: true,
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "local-unconfigured-publishable-key",
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  changeTonecosPassword: vi.fn(),
  getTonecosCurrentUser: mocks.getCurrentUser,
  getMyTonecosProfile: vi.fn(),
  registerTonecosAccount: vi.fn(),
  resendTonecosSignupConfirmation: vi.fn(),
  signInTonecosAccount: vi.fn(),
  signOutTonecosAccount: vi.fn(),
  updateMyTonecosProfile: vi.fn(),
}));
vi.mock("@/pages/commercial/TonecosCustomerSections", () => ({
  TonecosCustomerWorkspace: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("TonecosAccountPage in an isolated local preview", () => {
  it("explains the unavailable backend and keeps credential fields out of the page", () => {
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <HelmetProvider>
          <Routes>
            <Route path="/perfil" element={<TonecosAccountPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Conta indisponível nesta prévia local",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar modelos" })).toHaveAttribute(
      "href",
      "/modelos",
    );
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });
});
