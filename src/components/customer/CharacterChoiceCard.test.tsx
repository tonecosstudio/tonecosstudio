import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterChoiceCard } from "./CharacterChoiceCard";
import type { CharacterChoiceCardProps } from "./CharacterChoiceCard";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    formatDistanceToNow: vi.fn(() => "em 5 dias"),
    differenceInDays: vi.fn(() => 5),
    differenceInHours: vi.fn(() => 120),
  };
});

describe("CharacterChoiceCard", () => {
  const baseProps: CharacterChoiceCardProps = {
    orderId: "order-123",
    orderType: "subscription_delivery",
    collectionId: "collection-123",
    choiceStatus: "pending",
    choiceDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    characterName: null,
    characterImageUrl: null,
  };

  describe("Pending Status", () => {
    it("renders pending status with choose button", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Escolha de Personagem")).toBeInTheDocument();
      expect(screen.getByText("Aguardando escolha")).toBeInTheDocument();
      expect(screen.getByText("Escolher Personagem")).toBeInTheDocument();
      expect(screen.getByText(/Você precisa escolher um personagem/i)).toBeInTheDocument();
    });

    it("shows deadline countdown when deadline is set", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
      expect(screen.getByText("em 5 dias")).toBeInTheDocument();
    });

    it("shows expired deadline message when deadline passed", () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      render(<CharacterChoiceCard {...baseProps} choiceDeadline={pastDeadline} />);

      expect(screen.getByText("Prazo expirado")).toBeInTheDocument();
      expect(screen.getByText(/O prazo para escolher o personagem expirou/i)).toBeInTheDocument();
    });
  });

  describe("Submitted Status", () => {
    it("renders submitted status with waiting message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
      expect(
        screen.getByText(/Sua escolha foi enviada e está aguardando aprovação/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Naruto")).toBeInTheDocument();
      expect(screen.getByText("Personagem vinculado ao pedido")).toBeInTheDocument();
    });

    it("displays character image when provided", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      expect(screen.getByAltText("Naruto")).toHaveAttribute(
        "src",
        "https://example.com/naruto.jpg"
      );
    });
  });

  describe("Approved Status", () => {
    it("renders approved status with success message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Sasuke"
          characterImageUrl="https://example.com/sasuke.jpg"
        />
      );

      expect(screen.getByText("Aprovado")).toBeInTheDocument();
      expect(screen.getByText("Escolha aprovada")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha foi aprovada/i)).toBeInTheDocument();
      expect(screen.getByText("Sasuke")).toBeInTheDocument();
    });

    it("shows change button when changes are allowed", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Sasuke"
          changesCount={1}
        />
      );

      expect(screen.getByText(/Alterar Escolha/i)).toBeInTheDocument();
      expect(screen.getByText(/2 alterações restantes/i)).toBeInTheDocument();
    });

    it("shows singular form when 1 change remains", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Sasuke"
          changesCount={2}
        />
      );

      expect(screen.getByText(/1 alteração restante/i)).toBeInTheDocument();
    });

    it("hides change button when max changes reached", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Sasuke"
          changesCount={3}
        />
      );

      expect(screen.queryByText(/Alterar Escolha/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Você atingiu o limite de 3 alterações/i)).toBeInTheDocument();
    });
  });

  describe("Rejected Status", () => {
    it("renders rejected status with error message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="rejected"
          characterName="Sakura"
          characterImageUrl="https://example.com/sakura.jpg"
        />
      );

      expect(screen.getByText("Rejeitado")).toBeInTheDocument();
      expect(screen.getByText("Escolha rejeitada")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha foi rejeitada/i)).toBeInTheDocument();
      expect(screen.getByText("Sakura")).toBeInTheDocument();
      expect(screen.getByText("Escolha rejeitada pela equipe")).toBeInTheDocument();
    });

    it("shows button to choose another character", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="rejected"
          characterName="Sakura"
        />
      );

      expect(screen.getByText("Escolher Outro Personagem")).toBeInTheDocument();
    });

    it("shows expired message when deadline passed", () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="rejected"
          characterName="Sakura"
          choiceDeadline={pastDeadline}
        />
      );

      expect(screen.queryByText("Escolher Outro Personagem")).not.toBeInTheDocument();
      expect(screen.getByText("Prazo expirado")).toBeInTheDocument();
    });
  });

  describe("Locked Status", () => {
    it("renders locked status with info message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="locked"
          characterName="Kakashi"
          characterImageUrl="https://example.com/kakashi.jpg"
        />
      );

      expect(screen.getByText("Bloqueado")).toBeInTheDocument();
      expect(screen.getByText("Escolha bloqueada")).toBeInTheDocument();
      expect(screen.getByText(/A produção já foi iniciada/i)).toBeInTheDocument();
      expect(screen.getByText("Kakashi")).toBeInTheDocument();
    });

    it("does not show action buttons", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="locked"
          characterName="Kakashi"
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Deadline Urgency", () => {
    it("shows deadline countdown section", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
      expect(screen.getByText("em 5 dias")).toBeInTheDocument();
    });

    it("displays deadline information for submitted status", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Test Character"
        />
      );

      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
    });

    it("does not show deadline for approved status", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Test Character"
        />
      );

      expect(screen.queryByText("Prazo para escolha")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);
      expect(screen.getByText("Escolha de Personagem")).toBeInTheDocument();
    });

    it("has descriptive alt text for character images", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      expect(screen.getByAltText("Naruto")).toBeInTheDocument();
    });

    it("has accessible button labels", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);
      expect(
        screen.getByRole("button", { name: /Escolher Personagem/i })
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing character name gracefully", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName={null}
        />
      );

      expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
      expect(screen.queryByText("Personagem vinculado ao pedido")).not.toBeInTheDocument();
    });

    it("handles missing deadline gracefully", () => {
      render(<CharacterChoiceCard {...baseProps} choiceDeadline={null} />);
      expect(screen.queryByText("Prazo para escolha")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <CharacterChoiceCard {...baseProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
