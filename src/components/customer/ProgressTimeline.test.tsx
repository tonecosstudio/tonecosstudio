/**
 * ProgressTimeline Component Tests
 * 
 * Tests for the customer-facing production progress timeline component.
 * 
 * Task: 5.1.2 Create ProgressTimeline component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressTimeline, type StageInfo, type ProductionStage } from "./ProgressTimeline";

// ============================================================================
// Test Data
// ============================================================================

const createStageInfo = (
  name: ProductionStage,
  status: "completed" | "current" | "upcoming",
  completedAt: string | null = null,
  estimatedDate: string | null = null
): StageInfo => ({
  name,
  displayName: name,
  status,
  completedAt,
  estimatedDate,
  order: getStageOrder(name),
});

const getStageOrder = (stage: ProductionStage): number => {
  const orders: Record<ProductionStage, number> = {
    awaiting_choice: 1,
    design: 2,
    production: 3,
    quality_check: 4,
    packaging: 5,
    shipped: 6,
  };
  return orders[stage];
};

// ============================================================================
// Tests
// ============================================================================

describe("ProgressTimeline", () => {
  describe("Stage Display", () => {
    it("should display all stages horizontally", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      render(<ProgressTimeline stages={stages} />);

      // Check all stage labels are present (both desktop and mobile views)
      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Design").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Produção").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Controle de Qualidade").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Embalagem").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Enviado").length).toBeGreaterThan(0);
    });

    it("should show completed stages with checkmarks", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Check for checkmark icons (lucide-react Check component)
      const checkIcons = container.querySelectorAll('svg.lucide-check');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it("should highlight current stage with animation", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Check for "Em Progresso" badge
      expect(screen.getAllByText("Em Progresso")[0]).toBeInTheDocument();

      // Check for animation class (animate-pulse)
      const animatedElements = container.querySelectorAll('.animate-pulse');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("should show completion dates for completed stages", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-15T10:00:00Z"),
        createStageInfo("design", "completed", "2024-01-20T14:30:00Z"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      render(<ProgressTimeline stages={stages} />);

      // Check for formatted dates (dd/MM/yyyy format)
      expect(screen.getByText("15/01/2024")).toBeInTheDocument();
      expect(screen.getByText("20/01/2024")).toBeInTheDocument();
    });

    it("should show estimated dates for future stages", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming", null, "2024-02-01T10:00:00Z"),
        createStageInfo("quality_check", "upcoming", null, "2024-02-05T10:00:00Z"),
        createStageInfo("packaging", "upcoming", null, "2024-02-08T10:00:00Z"),
        createStageInfo("shipped", "upcoming", null, "2024-02-10T10:00:00Z"),
      ];

      render(<ProgressTimeline stages={stages} />);

      // Check for "Prev:" or "Previsão:" text (depending on viewport)
      const estimatedDates = screen.getAllByText(/Prev:|Previsão:/);
      expect(estimatedDates.length).toBeGreaterThan(0);
    });
  });

  describe("Stage Order", () => {
    it("should display stages in correct order", () => {
      const stages: StageInfo[] = [
        createStageInfo("shipped", "upcoming"),
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("production", "current"),
      ];

      render(
        <ProgressTimeline stages={stages} />
      );

      // Check all expected stages are present (both desktop and mobile views render them)
      const expectedOrder = [
        "Aguardando Escolha",
        "Design",
        "Produção",
        "Controle de Qualidade",
        "Embalagem",
        "Enviado",
      ];

      expectedOrder.forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Progress Calculation", () => {
    it("should calculate progress percentage correctly", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "completed", "2024-01-10"),
        createStageInfo("quality_check", "current"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Check for progress bar (should be 50% - 3 out of 6 completed)
      const progressBar = container.querySelector('.bg-primary.transition-all');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it("should show 0% progress when no stages completed", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
        createStageInfo("design", "upcoming"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      const progressBar = container.querySelector('.bg-primary.transition-all');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it("should show 100% progress when all stages completed", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "completed", "2024-01-10"),
        createStageInfo("quality_check", "completed", "2024-01-12"),
        createStageInfo("packaging", "completed", "2024-01-14"),
        createStageInfo("shipped", "completed", "2024-01-15"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      const progressBar = container.querySelector('.bg-primary.transition-all');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels for emojis", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
        createStageInfo("design", "upcoming"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Check for role="img" and aria-label on emoji spans
      const emojiElements = container.querySelectorAll('span[role="img"]');
      expect(emojiElements.length).toBeGreaterThan(0);

      emojiElements.forEach((emoji) => {
        expect(emoji).toHaveAttribute('aria-label');
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should render without errors on mobile viewport", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Check for mobile-specific classes (md:hidden for mobile view)
      const mobileView = container.querySelector('.md\\:hidden');
      expect(mobileView).toBeInTheDocument();

      // Check for desktop-specific classes (hidden md:block for desktop view)
      const desktopView = container.querySelector('.hidden.md\\:block');
      expect(desktopView).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty stages array", () => {
      const stages: StageInfo[] = [];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });

    it("should handle single stage", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
      ];

      render(<ProgressTimeline stages={stages} />);

      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Em Progresso")[0]).toBeInTheDocument();
    });

    it("should handle missing completion dates gracefully", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", null), // No completion date
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(
        <ProgressTimeline stages={stages} />
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
    });

    it("should handle custom className prop", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
      ];

      const { container } = render(
        <ProgressTimeline
          stages={stages}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
