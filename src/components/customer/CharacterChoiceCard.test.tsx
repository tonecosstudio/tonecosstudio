/**
 * CharacterChoiceCard Component Tests
 * 
 * Tests for the CharacterChoiceCard component covering all choice statuses,
 * deadline scenarios, and user interactions.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterChoiceCard } from "./CharacterChoiceCard";
import type { CharacterChoiceCardProps } from "./CharacterChoiceCard";

// Helper to create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

// Mock date-fns to control time-based tests
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
    orderType: "subscription_delivery" as const,
    collectionId: "collection-123",
    choiceStatus: "pending" as const,
    choiceDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    characterName: null,
    characterImageUrl: null,
  };

  describe("Pending Status", () => {
    it("should render pending status with choose button", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Escolha de Personagem")).toBeInTheDocument();
      expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
      expect(screen.getByText("Escolher Personagem")).toBeInTheDocument();
      expect(screen.getByText(/Você precisa escolher um personagem/i)).toBeInTheDocument();
    });

    it("should show deadline countdown when deadline is set", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
      expect(screen.getByText("em 5 dias")).toBeInTheDocument();
    });

    it("should show expired deadline message when deadline passed", () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceDeadline={pastDeadline}
        />
      );

      expect(screen.getByText("Prazo Expirado")).toBeInTheDocument();
      expect(screen.getByText(/O prazo para escolher o personagem expirou/i)).toBeInTheDocument();
    });
  });

  describe("Submitted Status", () => {
    it("should render submitted status with waiting message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      expect(screen.getByText("Aguardando Aprovação")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha foi enviada e está aguardando aprovação/i)).toBeInTheDocument();
      expect(screen.getByText("Naruto")).toBeInTheDocument();
      expect(screen.getByText("Personagem escolhido")).toBeInTheDocument();
    });

    it("should display character image when provided", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      const image = screen.getByAltText("Naruto");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/naruto.jpg");
    });
  });

  describe("Approved Status", () => {
    it("should render approved status with success message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Sasuke"
          characterImageUrl="https://example.com/sasuke.jpg"
        />
      );

      expect(screen.getByText("Aprovado")).toBeInTheDocument();
      expect(screen.getByText("Escolha Aprovada")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha foi aprovada/i)).toBeInTheDocument();
      expect(screen.getByText("Sasuke")).toBeInTheDocument();
    });

    it("should show change button when changes are allowed", () => {
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

    it("should show singular form when 1 change remaining", () => {
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

    it("should not show change button when max changes reached", () => {
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
    it("should render rejected status with error message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="rejected"
          characterName="Sakura"
          characterImageUrl="https://example.com/sakura.jpg"
        />
      );

      expect(screen.getByText("Rejeitado")).toBeInTheDocument();
      expect(screen.getByText("Escolha Rejeitada")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha foi rejeitada/i)).toBeInTheDocument();
      expect(screen.getByText("Sakura")).toBeInTheDocument();
      expect(screen.getByText("Escolha rejeitada")).toBeInTheDocument();
    });

    it("should show button to choose another character", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="rejected"
          characterName="Sakura"
        />
      );

      expect(screen.getByText("Escolher Outro Personagem")).toBeInTheDocument();
    });

    it("should show expired message when deadline passed", () => {
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
      expect(screen.getByText("Prazo Expirado")).toBeInTheDocument();
    });
  });

  describe("Locked Status", () => {
    it("should render locked status with info message", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="locked"
          characterName="Kakashi"
          characterImageUrl="https://example.com/kakashi.jpg"
        />
      );

      expect(screen.getByText("Bloqueado")).toBeInTheDocument();
      expect(screen.getByText("Escolha Bloqueada")).toBeInTheDocument();
      expect(screen.getByText(/A produção foi iniciada/i)).toBeInTheDocument();
      expect(screen.getByText("Kakashi")).toBeInTheDocument();
    });

    it("should not show any action buttons", () => {
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
    it("should show deadline countdown with appropriate styling", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      // Should show deadline section
      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
      expect(screen.getByText("em 5 dias")).toBeInTheDocument();
    });

    it("should display deadline information for submitted status", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName="Test Character"
        />
      );

      expect(screen.getByText("Prazo para escolha")).toBeInTheDocument();
    });

    it("should not show deadline for approved status", () => {
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
    it("should have proper heading structure", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      expect(screen.getByText("Escolha de Personagem")).toBeInTheDocument();
    });

    it("should have descriptive alt text for character images", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="approved"
          characterName="Naruto"
          characterImageUrl="https://example.com/naruto.jpg"
        />
      );

      const image = screen.getByAltText("Naruto");
      expect(image).toBeInTheDocument();
    });

    it("should have accessible button labels", () => {
      renderWithProviders(<CharacterChoiceCard {...baseProps} />);

      const button = screen.getByRole("button", { name: /Escolher Personagem/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing character name gracefully", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceStatus="submitted"
          characterName={null}
        />
      );

      expect(screen.getByText("Aguardando Aprovação")).toBeInTheDocument();
      expect(screen.queryByText("Personagem escolhido")).not.toBeInTheDocument();
    });

    it("should handle missing deadline gracefully", () => {
      render(
        <CharacterChoiceCard
          {...baseProps}
          choiceDeadline={null}
        />
      );

      expect(screen.queryByText("Prazo para escolha")).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CharacterChoiceCard
          {...baseProps}
          className="custom-class"
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass("custom-class");
    });
  });
});
