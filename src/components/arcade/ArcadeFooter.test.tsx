import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArcadeFooter } from "./ArcadeFooter";

const mock = vi.hoisted(() => ({
  useSystemSettings: vi.fn(() => ({ data: undefined })),
}));
vi.mock("@/hooks/useSystemSettings", () => ({
  useSystemSettings: mock.useSystemSettings,
}));

function mount() {
  return render(
    <MemoryRouter>
      <ArcadeFooter />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  mock.useSystemSettings.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tonecos MVP footer", () => {
  it("never advertises account or payment features in read-only preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mount();
    expect(
      screen.getByText("Atendimento em preparação. Esta prévia não recebe solicitações."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Minha Conta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pagamentos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wishlist" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contato" })).toHaveAttribute("href", "/contato");
    expect(mock.useSystemSettings).toHaveBeenCalledWith({ enabled: false });
  });

  it("keeps the single canonical account entry in the commercial environment", () => {
    mount();
    expect(screen.getByRole("link", { name: "Minha Conta" })).toHaveAttribute("href", "/perfil");
    expect(screen.queryByRole("link", { name: "Pagamentos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wishlist" })).not.toBeInTheDocument();
    expect(mock.useSystemSettings).toHaveBeenCalledWith({ enabled: true });
  });
});
