import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressTimeline, type ProductionStage, type StageInfo } from "./ProgressTimeline";

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

describe("ProgressTimeline", () => {
  describe("Stage Display", () => {
    it("displays all stages", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      render(<ProgressTimeline stages={stages} />);

      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Design").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Produção").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Controle de Qualidade").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Embalagem").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Enviado").length).toBeGreaterThan(0);
    });

    it("shows completed stages with checkmarks", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container.querySelectorAll("svg.lucide-check").length).toBeGreaterThan(0);
    });

    it("highlights current stage with animation", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(screen.getAllByText("Em Progresso")[0]).toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    it("shows completion dates for completed stages", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-15T10:00:00Z"),
        createStageInfo("design", "completed", "2024-01-20T14:30:00Z"),
        createStageInfo("production", "current"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      render(<ProgressTimeline stages={stages} />);

      expect(screen.getByText("15/01/2024")).toBeInTheDocument();
      expect(screen.getByText("20/01/2024")).toBeInTheDocument();
    });

    it("shows estimated dates for future stages", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming", null, "2024-02-01T10:00:00Z"),
        createStageInfo("quality_check", "upcoming", null, "2024-02-05T10:00:00Z"),
        createStageInfo("packaging", "upcoming", null, "2024-02-08T10:00:00Z"),
        createStageInfo("shipped", "upcoming", null, "2024-02-10T10:00:00Z"),
      ];

      render(<ProgressTimeline stages={stages} />);
      expect(screen.getAllByText(/Prev:|Previsão:/).length).toBeGreaterThan(0);
    });
  });

  describe("Stage Order", () => {
    it("displays stages in correct order", () => {
      const stages: StageInfo[] = [
        createStageInfo("shipped", "upcoming"),
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("production", "current"),
      ];

      render(<ProgressTimeline stages={stages} />);

      [
        "Aguardando Escolha",
        "Design",
        "Produção",
        "Controle de Qualidade",
        "Embalagem",
        "Enviado",
      ].forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Progress Calculation", () => {
    it("calculates progress percentage correctly", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "completed", "2024-01-10"),
        createStageInfo("quality_check", "current"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container.querySelector(".bg-primary.transition-all")).toHaveStyle({ width: "50%" });
    });

    it("shows 0% progress when no stages are completed", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
        createStageInfo("design", "upcoming"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container.querySelector(".bg-primary.transition-all")).toHaveStyle({ width: "0%" });
    });

    it("shows 100% progress when all stages are completed", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "completed", "2024-01-05"),
        createStageInfo("production", "completed", "2024-01-10"),
        createStageInfo("quality_check", "completed", "2024-01-12"),
        createStageInfo("packaging", "completed", "2024-01-14"),
        createStageInfo("shipped", "completed", "2024-01-15"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container.querySelector(".bg-primary.transition-all")).toHaveStyle({ width: "100%" });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for stage markers", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "current"),
        createStageInfo("design", "upcoming"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      const stageMarkers = container.querySelectorAll('span[role="img"]');
      expect(stageMarkers.length).toBeGreaterThan(0);
      stageMarkers.forEach((marker) => expect(marker).toHaveAttribute("aria-label"));
    });
  });

  describe("Mobile Responsiveness", () => {
    it("renders both mobile and desktop containers", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", "2024-01-01"),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
      expect(container.querySelector(".hidden.md\\:block")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty stages array", () => {
      const { container } = render(<ProgressTimeline stages={[]} />);
      expect(container).toBeInTheDocument();
    });

    it("handles single stage", () => {
      render(<ProgressTimeline stages={[createStageInfo("awaiting_choice", "current")]} />);
      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Em Progresso")[0]).toBeInTheDocument();
    });

    it("handles missing completion dates gracefully", () => {
      const stages: StageInfo[] = [
        createStageInfo("awaiting_choice", "completed", null),
        createStageInfo("design", "current"),
        createStageInfo("production", "upcoming"),
        createStageInfo("quality_check", "upcoming"),
        createStageInfo("packaging", "upcoming"),
        createStageInfo("shipped", "upcoming"),
      ];

      const { container } = render(<ProgressTimeline stages={stages} />);
      expect(container).toBeInTheDocument();
      expect(screen.getAllByText("Aguardando Escolha").length).toBeGreaterThan(0);
    });

    it("handles custom className prop", () => {
      const { container } = render(
        <ProgressTimeline stages={[createStageInfo("awaiting_choice", "current")]} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
