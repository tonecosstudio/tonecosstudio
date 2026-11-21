import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";
import PublicCatalogContact from "./PublicCatalogContact";

vi.mock("@/config/constants", () => ({
  CONTACT: { CONTACT_EMAIL: "atendimento@example.com" },
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  ArcadeCard: ({ children }: { children: ReactNode }) => (
    <article>{children}</article>
  ),
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  ArcadeCTA: ({
    primaryAction,
  }: {
    primaryAction: { label: string; href: string };
  }) => <a href={primaryAction.href}>{primaryAction.label}</a>,
}));

function mount() {
  render(
    <MemoryRouter initialEntries={["/contato"]}>
      <PublicCatalogContact />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
});

afterEach(() => vi.unstubAllEnvs());

describe("TONART catalog contact commercial flag", () => {
  it("shows the quote path when PUBLIC_CATALOG_MVP is the literal string false", () => {
    mount();
    const actions = screen.getAllByRole("link", {
      name: "SOLICITAR ORÇAMENTO",
    });
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action).toHaveAttribute("href", PUBLIC_ROUTES.quoteRequest);
    }
    expect(
      screen.getByText(/Nenhum pagamento é realizado nesta etapa/),
    ).toBeInTheDocument();
  });

  it("keeps the quote CTA closed in a read-only preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mount();
    expect(
      screen.queryByRole("link", { name: "SOLICITAR ORÇAMENTO" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VER MODELOS" })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.catalogModels,
    );
  });

  it("keeps the quote CTA closed in public-catalog-only mode", () => {
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    mount();
    expect(
      screen.queryByRole("link", { name: "SOLICITAR ORÇAMENTO" }),
    ).not.toBeInTheDocument();
  });
});
