import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { PUBLIC_ROUTES, loginReturnToPath, profileSectionPath } from "@/config/routes";
import ContactArcade from "./ContactArcade";

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
const submission = vi.hoisted(() => ({
  submit: vi.fn(async (_values: { name: string; message: string }) => {}),
  onError: null as null | ((message: string) => void),
  onSuccess: null as null | (() => void),
  onRequiresAuth: null as null | (() => void),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: auth.user }),
}));
vi.mock("@/hooks/customer/useContactFormSubmission", () => ({
  useContactFormSubmission: ({
    onError,
    onSuccess,
    onRequiresAuth,
  }: {
    onError: (message: string) => void;
    onSuccess: () => void;
    onRequiresAuth: () => void;
  }) => {
    submission.onError = onError;
    submission.onSuccess = onSuccess;
    submission.onRequiresAuth = onRequiresAuth;
    return { submitContactForm: submission.submit, isSubmitting: false };
  },
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

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="route">{location.pathname}</output>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={["/contato"]}>
      <ContactArcade />
      <CurrentPath />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  auth.user = null;
  submission.onError = null;
  submission.onSuccess = null;
  submission.onRequiresAuth = null;
  submission.submit.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tonecos public contact entry", () => {
  it("provides model discovery rather than a broken login in read-only preview", () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mount();
    const heading = screen.getByRole("heading", { name: "CONTATO EM PREPARAÇÃO" });
    expect(heading.closest('[role="status"]')).toHaveTextContent(
      "Esta prévia é somente leitura e não recebe mensagens",
    );
    expect(screen.getByRole("link", { name: "EXPLORAR MODELOS" })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.catalogModels,
    );
    expect(screen.queryByRole("link", { name: "Entrar para enviar mensagem" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar Transmissao" })).not.toBeInTheDocument();
    expect(submission.submit).not.toHaveBeenCalled();
  });

  it("never exposes contact submission for an existing session in read-only preview", () => {
    auth.user = { id: "existing-session" };
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mount();
    expect(screen.getByRole("heading", { name: "CONTATO EM PREPARAÇÃO" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Seu nome completo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar Transmissao" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "EXPLORAR MODELOS" })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.catalogModels,
    );
    expect(submission.submit).not.toHaveBeenCalled();
  });


  it("prompts guests to authenticate before collecting a support message", () => {
    mount();
    const guestHeading = screen.getByRole("heading", {
      name: "Atendimento pela sua conta",
    });
    expect(guestHeading.closest('[role="status"]')).toHaveTextContent(
      "Para enviar uma mensagem ao suporte",
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

  it("submits only the valid name and message to the authenticated contact hook", async () => {
    auth.user = { id: "test-account" };
    mount();
    fireEvent.change(screen.getByPlaceholderText("Seu nome completo"), {
      target: { value: "Maria Silva" },
    });
    fireEvent.change(screen.getByPlaceholderText("Descreva sua duvida ou solicitacao..."), {
      target: { value: "Gostaria de solicitar um orçamento personalizado." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar Transmissao" }));
    await waitFor(() => {
      expect(submission.submit).toHaveBeenCalledTimes(1);
      expect(submission.submit).toHaveBeenCalledWith({
        name: "Maria Silva",
        message: "Gostaria de solicitar um orçamento personalizado.",
      });
    });
  });

  it("shows a service error without inventing a successful submission", () => {
    auth.user = { id: "test-account" };
    mount();
    act(() => submission.onError?.("Serviço de suporte indisponível."));
    expect(screen.getByText("Serviço de suporte indisponível.")).toBeInTheDocument();
    expect(submission.submit).not.toHaveBeenCalled();
  });

  it("routes an authenticated successful submission to the support profile", () => {
    auth.user = { id: "test-account" };
    mount();
    act(() => submission.onSuccess?.());
    expect(screen.getByTestId("route")).toHaveTextContent(
      profileSectionPath("support"),
    );
  });

  it("redirects expired sessions to login instead of claiming message delivery", () => {
    vi.useFakeTimers();
    try {
      auth.user = { id: "test-account" };
      mount();
      act(() => submission.onRequiresAuth?.());
      expect(screen.getByText("Faca login para enviar mensagem.")).toBeInTheDocument();
      expect(submission.submit).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(2000));
      expect(screen.getByTestId("route")).toHaveTextContent("/login");
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
