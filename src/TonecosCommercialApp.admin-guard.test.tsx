import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Routes, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/orcamentos",
  getUser: vi.fn(),
  hasAdminAccess: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="current-location">
      {location.pathname + location.search}
    </output>
  );
}

vi.mock("@/CatalogMvpShell", () => ({
  CatalogMvpShell: ({ extraRoutes }: { extraRoutes: ReactNode }) => (
    <HelmetProvider>
      <MemoryRouter initialEntries={[mocks.pathname]}>
        <LocationProbe />
        <Routes>{extraRoutes}</Routes>
      </MemoryRouter>
    </HelmetProvider>
  ),
}));

vi.mock("@/pages/commercial/TonecosCommercialNav", () => ({
  default: () => null,
}));

vi.mock("@/pages/commercial/TonecosAccountPage", () => ({
  default: () => <p>Formulário público de entrada</p>,
}));

vi.mock("@/pages/commercial/TonecosAdminQuotesPage", () => ({
  default: () => <p>Área protegida de orçamentos</p>,
}));

vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
}));

vi.mock("@/services/auth/tonecos-admin-access", () => ({
  hasTonecosAdminAccess: mocks.hasAdminAccess,
}));

beforeEach(() => {
  mocks.pathname = "/admin/orcamentos";
  mocks.getUser.mockReset();
  mocks.hasAdminAccess.mockReset();
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderCommercialAdminRoute() {
  const { default: TonecosCommercialApp } =
    await import("@/TonecosCommercialApp");
  await act(async () => {
    render(<TonecosCommercialApp />);
  });
}

describe("commercial admin route authorization", () => {
  it("redirects guests to login with the original admin destination and never checks admin grants", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.pathname =
      "/admin/orcamentos?quote=11111111-1111-4111-8111-111111111111";
    await renderCommercialAdminRoute();

    await waitFor(() =>
      expect(screen.getByTestId("current-location")).toHaveTextContent(
        "/login?next=%2Fadmin%2Forcamentos%3Fquote%3D11111111-1111-4111-8111-111111111111",
      ),
    );
    expect(
      await screen.findByText("Formulário público de entrada"),
    ).toBeInTheDocument();
    expect(mocks.hasAdminAccess).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Área protegida de orçamentos"),
    ).not.toBeInTheDocument();
  });

  it("blocks signed-in customers without administrative grants", async () => {
    mocks.getUser.mockResolvedValue({ id: "customer-1" });
    mocks.hasAdminAccess.mockResolvedValue(false);
    await renderCommercialAdminRoute();

    expect(
      await screen.findByText(
        "Sua conta não possui autorização administrativa ativa.",
      ),
    ).toBeInTheDocument();
    expect(mocks.hasAdminAccess).toHaveBeenCalledOnce();
    expect(screen.getByTestId("current-location")).toHaveTextContent(
      "/admin/orcamentos",
    );
    expect(
      screen.queryByText("Área protegida de orçamentos"),
    ).not.toBeInTheDocument();
  });

  it("fails closed if the admin authority cannot be checked", async () => {
    mocks.getUser.mockResolvedValue({ id: "customer-1" });
    mocks.hasAdminAccess.mockRejectedValue(new Error("transport unavailable"));
    await renderCommercialAdminRoute();

    expect(
      await screen.findByText(
        "Não foi possível validar a autorização neste momento.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Área protegida de orçamentos"),
    ).not.toBeInTheDocument();
  });

  it("renders the existing admin workspace only after active grants are verified", async () => {
    mocks.getUser.mockResolvedValue({ id: "administrator-1" });
    mocks.hasAdminAccess.mockResolvedValue(true);
    await renderCommercialAdminRoute();

    expect(
      await screen.findByText("Área protegida de orçamentos"),
    ).toBeInTheDocument();
    expect(mocks.hasAdminAccess).toHaveBeenCalledOnce();
  });
});
