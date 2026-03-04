/**
 * EstimatedDatesCard Component Tests
 * 
 * Tests for the EstimatedDatesCard component including:
 * - Date display and formatting
 * - Status indicators (on track vs delayed)
 * - Delay reason display
 * - Edge cases (no dates, past dates, blocked status)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstimatedDatesCard } from "./EstimatedDatesCard";

describe("EstimatedDatesCard", () => {
  const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const futureDate2 = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(); // 9 days from now
  const futureDate3 = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(); // 16 days from now
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago

  describe("Date Display", () => {
    it("should display all three dates when provided", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("Conclusão da Produção")).toBeInTheDocument();
      expect(screen.getByText("Data de Envio")).toBeInTheDocument();
      expect(screen.getByText("Data de Entrega")).toBeInTheDocument();
    });

    it("should display only completion date when others are null", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("Conclusão da Produção")).toBeInTheDocument();
      expect(screen.queryByText("Data de Envio")).not.toBeInTheDocument();
      expect(screen.queryByText("Data de Entrega")).not.toBeInTheDocument();
    });

    it("should show message when no dates are available", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={null}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack={true}
        />
      );

      expect(screen.getByText(/As datas estimadas serão calculadas em breve/i)).toBeInTheDocument();
    });

    it("should display relative time for future dates", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
        />
      );

      // Should show "em X dias" for future dates
      const relativeTimeElements = screen.getAllByText(/em \d+ dias?/i);
      expect(relativeTimeElements.length).toBeGreaterThan(0);
    });

    it("should mark past dates as completed", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("Concluído")).toBeInTheDocument();
    });
  });

  describe("Status Indicators", () => {
    it("should show 'No Prazo' badge when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("No Prazo")).toBeInTheDocument();
    });

    it("should show 'Atrasado' badge when delayed", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
        />
      );

      expect(screen.getByText("Atrasado")).toBeInTheDocument();
    });

    it("should show success message when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
        />
      );

      expect(screen.getByText(/Tudo está correndo conforme o planejado/i)).toBeInTheDocument();
    });
  });

  describe("Delay Handling", () => {
    it("should display delay alert with reason when delayed", () => {
      const delayReason = "Aguardando material especial do fornecedor";

      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
          delayReason={delayReason}
        />
      );

      expect(screen.getByText("Produção Atrasada")).toBeInTheDocument();
      expect(screen.getByText(delayReason)).toBeInTheDocument();
    });

    it("should not show delay alert when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
          delayReason="Some reason"
        />
      );

      expect(screen.queryByText("Produção Atrasada")).not.toBeInTheDocument();
    });

    it("should not show delay alert when no reason provided", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
        />
      );

      expect(screen.queryByText("Produção Atrasada")).not.toBeInTheDocument();
    });
  });

  describe("Blocked/On Hold Status", () => {
    it("should show blocked alert when production is on hold", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
          productionStatus="on_hold"
        />
      );

      expect(screen.getByText("Produção Pausada")).toBeInTheDocument();
    });

    it("should show custom delay reason when blocked", () => {
      const customReason = "Aguardando aprovação de design especial";

      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
          productionStatus="on_hold"
          delayReason={customReason}
        />
      );

      // Should show blocked alert with custom reason (not delay alert)
      expect(screen.getByText("Produção Pausada")).toBeInTheDocument();
      expect(screen.getByText(customReason)).toBeInTheDocument();
      expect(screen.queryByText("Produção Atrasada")).not.toBeInTheDocument();
    });

    it("should show default message when blocked without reason", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
          productionStatus="on_hold"
        />
      );

      expect(screen.getByText(/temporariamente pausado/i)).toBeInTheDocument();
    });

    it("should not show success message when blocked", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
          productionStatus="on_hold"
        />
      );

      expect(screen.queryByText(/Tudo está correndo conforme o planejado/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("Datas Estimadas")).toBeInTheDocument();
      expect(screen.getByText("Previsão de conclusão e entrega")).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      const { container } = render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={true}
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid date strings gracefully", () => {
      // This test ensures the component doesn't crash with invalid dates
      // The date-fns library will handle invalid dates
      render(
        <EstimatedDatesCard
          estimatedCompletionDate="invalid-date"
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack={true}
        />
      );

      // Component should still render
      expect(screen.getByText("Datas Estimadas")).toBeInTheDocument();
    });

    it("should handle all dates in the past", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={pastDate}
          estimatedDeliveryDate={pastDate}
          isOnTrack={true}
        />
      );

      // Should show multiple "Concluído" badges
      const completedBadges = screen.getAllByText("Concluído");
      expect(completedBadges.length).toBe(3);
    });

    it("should handle mixed past and future dates", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={futureDate1}
          estimatedDeliveryDate={futureDate2}
          isOnTrack={true}
        />
      );

      expect(screen.getByText("Concluído")).toBeInTheDocument();
      // Use getAllByText since there are multiple future dates with relative time
      const relativeTimes = screen.getAllByText(/em \d+ dias?/i);
      expect(relativeTimes.length).toBeGreaterThan(0);
    });
  });
});
