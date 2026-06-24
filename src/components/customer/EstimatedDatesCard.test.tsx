import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstimatedDatesCard } from "./EstimatedDatesCard";

describe("EstimatedDatesCard", () => {
  const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate2 = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate3 = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  describe("Date Display", () => {
    it("displays all three dates when provided", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
        />
      );

      expect(screen.getByText("Conclusão da produção")).toBeInTheDocument();
      expect(screen.getByText("Data de envio")).toBeInTheDocument();
      expect(screen.getByText("Data de entrega")).toBeInTheDocument();
    });

    it("displays only completion date when others are null", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack
        />
      );

      expect(screen.getByText("Conclusão da produção")).toBeInTheDocument();
      expect(screen.queryByText("Data de envio")).not.toBeInTheDocument();
      expect(screen.queryByText("Data de entrega")).not.toBeInTheDocument();
    });

    it("shows message when no dates are available", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={null}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack
        />
      );

      expect(screen.getByText(/As datas estimadas serão calculadas em breve/i)).toBeInTheDocument();
    });

    it("displays relative time for future dates", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
        />
      );

      expect(screen.getAllByText(/em \d+ dias?/i).length).toBeGreaterThan(0);
    });

    it("marks past dates as completed", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack
        />
      );

      expect(screen.getByText("Concluído")).toBeInTheDocument();
    });
  });

  describe("Status Indicators", () => {
    it("shows 'No Prazo' badge when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
        />
      );

      expect(screen.getByText("No Prazo")).toBeInTheDocument();
    });

    it("shows 'Atrasado' badge when delayed", () => {
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

    it("shows success message when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
        />
      );

      expect(screen.getByText(/Tudo está correndo conforme o planejado/i)).toBeInTheDocument();
    });
  });

  describe("Delay Handling", () => {
    it("displays delay alert with reason when delayed", () => {
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

      expect(screen.getByText("Produção atrasada")).toBeInTheDocument();
      expect(screen.getByText(delayReason)).toBeInTheDocument();
    });

    it("does not show delay alert when on track", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
          delayReason="Some reason"
        />
      );

      expect(screen.queryByText("Produção atrasada")).not.toBeInTheDocument();
    });

    it("does not show delay alert when no reason provided", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
        />
      );

      expect(screen.queryByText("Produção atrasada")).not.toBeInTheDocument();
    });
  });

  describe("Blocked/On Hold Status", () => {
    it("shows blocked alert when production is on hold", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack={false}
          productionStatus="on_hold"
        />
      );

      expect(screen.getByText("Produção pausada")).toBeInTheDocument();
    });

    it("shows custom delay reason when blocked", () => {
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

      expect(screen.getByText("Produção pausada")).toBeInTheDocument();
      expect(screen.getByText(customReason)).toBeInTheDocument();
      expect(screen.queryByText("Produção atrasada")).not.toBeInTheDocument();
    });

    it("shows default message when blocked without reason", () => {
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

    it("does not show success message when blocked", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
          productionStatus="on_hold"
        />
      );

      expect(screen.queryByText(/Tudo está correndo conforme o planejado/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
        />
      );

      expect(screen.getByText("Datas Estimadas")).toBeInTheDocument();
      expect(
        screen.getByText("Previsão de conclusão da produção, envio e entrega.")
      ).toBeInTheDocument();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <EstimatedDatesCard
          estimatedCompletionDate={futureDate1}
          estimatedShippingDate={futureDate2}
          estimatedDeliveryDate={futureDate3}
          isOnTrack
          className="custom-class"
        />
      );

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles invalid date strings gracefully", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate="invalid-date"
          estimatedShippingDate={null}
          estimatedDeliveryDate={null}
          isOnTrack
        />
      );

      expect(screen.getByText("Datas Estimadas")).toBeInTheDocument();
    });

    it("handles all dates in the past", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={pastDate}
          estimatedDeliveryDate={pastDate}
          isOnTrack
        />
      );

      expect(screen.getAllByText("Concluído")).toHaveLength(3);
    });

    it("handles mixed past and future dates", () => {
      render(
        <EstimatedDatesCard
          estimatedCompletionDate={pastDate}
          estimatedShippingDate={futureDate1}
          estimatedDeliveryDate={futureDate2}
          isOnTrack
        />
      );

      expect(screen.getByText("Concluído")).toBeInTheDocument();
      expect(screen.getAllByText(/em \d+ dias?/i).length).toBeGreaterThan(0);
    });
  });
});
