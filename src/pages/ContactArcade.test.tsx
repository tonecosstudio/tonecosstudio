import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PUBLIC_ROUTES, loginReturnToPath } from "@/config/routes";
import ContactArcade from "./ContactArcade";

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: auth.user }),
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeCTA: () => null,
  ArcadeHero: () => null,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/arcade/ArcadeEffects", () => ({
  FloatingParticles: () => null,
}));

function mount() {
  return render(
    <MemoryRouter initialEntries={["/contato"]}>
      <ContactArcade />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
});

describe("Tonecos public contact entry", () => {
  it("prompts guests to authenticate before collecting a support message", () => {
    mount();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Atendimento pela sua conta",
    );
    expect(
      screen.getByRole("link", { name: "Entrar para enviar mensagem" }),
    ).toHaveAttribute("href", loginReturnToPath(PUBLIC_ROUTES.contact));
    expect(screen.queryByPlaceholderText("Seu nome completo")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("seu@email.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar Transmissao" })).not.toBeInTheDocument();
  });

  it("collects only fields accepted by the authenticated contact service", () => {
    auth.user = { id: "test-account" };
    mount();
    expect(screen.getByPlaceholderText("Seu nome completo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Descreva sua duvida ou solicitacao...")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("seu@email.com")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar Transmissao" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Entrar para enviar mensagem" })).not.toBeInTheDocument();
  });
});
