import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TonecosAccountPage from "./TonecosAccountPage";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getMyProfile: vi.fn(),
  signIn: vi.fn(),
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
  getMyTonecosProfile: mocks.getMyProfile,
  registerTonecosAccount: vi.fn(),
  resendTonecosSignupConfirmation: vi.fn(),
  signInTonecosAccount: mocks.signIn,
  signOutTonecosAccount: vi.fn(),
  updateMyTonecosProfile: vi.fn(),
}));
vi.mock("@/pages/commercial/TonecosCustomerSections", () => ({
  TonecosCustomerWorkspace: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("TonecosAccountPage with local customer data", () => {
  it("renders customer data in the normal account screen", async () => {
    const profile = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "marina.oliveira@tonart.local",
      full_name: "Marina Oliveira",
      phone: "+55 (11) 90000-0000",
    };
    mocks.getCurrentUser.mockResolvedValue({
      id: profile.id,
      email: profile.email,
    });
    mocks.getMyProfile.mockResolvedValue(profile);
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <HelmetProvider>
          <Routes>
            <Route path="/perfil" element={<TonecosAccountPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("Conectado como marina.oliveira@tonart.local"),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Nome completo")).toHaveValue(
        "Marina Oliveira",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Minha conta" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/demonstração|prévia local/i),
    ).not.toBeInTheDocument();
    expect(mocks.getMyProfile).toHaveBeenCalledOnce();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
