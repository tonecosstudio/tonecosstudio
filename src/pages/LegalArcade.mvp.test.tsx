import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
const mock = vi.hoisted(() => ({ useSystemSettings: vi.fn(() => ({ data: undefined })) }));
vi.mock("@/hooks/useSystemSettings", () => ({ useSystemSettings: mock.useSystemSettings }));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeHero: ({ title, subtitle }: { title: string; subtitle: string }) => <header><h1>{title}</h1><p>{subtitle}</p></header>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  ArcadeCTA: () => null,
}));
import PrivacyArcade from "./PrivacyArcade";
import TermsArcade from "./TermsArcade";

beforeEach(() => {
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
  vi.stubEnv("VITE_CONTACT_EMAIL", "tonecosstudio@gmail.com");
  mock.useSystemSettings.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("legal content for read-only public catalog", () => {
  it("does not claim to collect CPF or payments in the public catalog", () => {
    render(<PrivacyArcade />);
    expect(screen.getByText(/Nesta versão de consulta não há envio de orçamentos, pedidos ou pagamentos pelo site/)).toBeInTheDocument();
    expect(screen.getByText(/Contato por e-mail/)).toBeInTheDocument();
    expect(screen.queryByText(/Cadastro \(nome, email, CPF/)).not.toBeInTheDocument();
    expect(mock.useSystemSettings).toHaveBeenCalledWith({ enabled: false });
  });
  it("does not advertise unavailable subscriptions or coins", () => {
    render(<TermsArcade />);
    expect(screen.getByText(/não permite concluir compras, pagamentos ou encomendas diretamente pelo site/)).toBeInTheDocument();
    expect(screen.queryByText(/Sistema de Coins/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assinaturas mensais/)).not.toBeInTheDocument();
    expect(mock.useSystemSettings).toHaveBeenCalledWith({ enabled: false });
  });
  it("preserves preexisting legal copy when the public catalog mode is off", () => {
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    render(<PrivacyArcade />);
    render(<TermsArcade />);
    expect(screen.getByText(/Cadastro \(nome, email, CPF/)).toBeInTheDocument();
    expect(screen.getByText(/Sistema de Coins/)).toBeInTheDocument();
    expect(mock.useSystemSettings).toHaveBeenCalledWith({ enabled: false });
  });
});
