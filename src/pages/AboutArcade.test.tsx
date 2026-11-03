import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
    <main data-page-title={title} data-page-description={description}>{children}</main>
  ),
}));

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeHero: ({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) => (
    <header><strong>{badge}</strong><h1>{title}</h1><p>{subtitle}</p></header>
  ),
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  FloatingParticles: () => null,
  ArcadeCTA: ({
    title,
    description,
    primaryAction,
    secondaryAction,
  }: {
    title: string;
    description: string;
    primaryAction: { label: string; href: string };
    secondaryAction?: { label: string; href: string };
  }) => (
    <aside>
      <h2>{title}</h2>
      <p>{description}</p>
      <a href={primaryAction.href}>{primaryAction.label}</a>
      {secondaryAction && <a href={secondaryAction.href}>{secondaryAction.label}</a>}
    </aside>
  ),
}));

import AboutArcade from "./AboutArcade";

describe("public Tonecos Studio about page", () => {
  it("uses the canonical brand and avoids legacy OrdaX and unsupported fixed deadlines", () => {
    const view = render(<AboutArcade />);
    expect(view.container.querySelector("[data-page-title]")).toHaveAttribute("data-page-title", "Sobre");
    expect(screen.getByText("TONECOS STUDIO")).toBeInTheDocument();
    expect(screen.getByText("EXPERIÊNCIA TONECOS")).toBeInTheDocument();
    expect(screen.getByText(/Prazos de produção e entrega são informados/)).toBeInTheDocument();
    expect(view.container.textContent).not.toMatch(/ORDAX|30 dias|Envio a partir do dia 15|Intel FAQ/i);
  });

  it("points public actions to existing canonical catalog and contact routes", () => {
    render(<AboutArcade />);
    expect(screen.getByRole("link", { name: "VER UNIVERSO" })).toHaveAttribute("href", "/universo");
    expect(screen.getByRole("link", { name: "FALAR COM O ESTÚDIO" })).toHaveAttribute("href", "/contato");
    expect(screen.queryByRole("link", { name: "FAZER ORÇAMENTO" })).not.toBeInTheDocument();
  });

  it("discloses the estimate as conditional on a quote rather than advertising a guaranteed deadline", () => {
    render(<AboutArcade />);
    fireEvent.click(screen.getByRole("button", { name: /Qual o prazo de produção/i }));
    expect(screen.getByText(/Depende da complexidade/)).toBeInTheDocument();
  });
});
