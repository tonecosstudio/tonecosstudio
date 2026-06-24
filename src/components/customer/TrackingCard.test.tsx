import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORREIOS_TRACKING_BASE_URL, JADLOG_TRACKING_BASE_URL } from "@/lib/tracking-links";
import { TrackingCard } from "./TrackingCard";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

describe("TrackingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    it("renders empty state when no tracking code is provided", () => {
      render(
        <TrackingCard
          trackingCode={null}
          trackingCarrier={null}
          estimatedDeliveryDate={null}
        />
      );

      expect(screen.getByText("Rastreamento")).toBeInTheDocument();
      expect(
        screen.getByText(/O código de rastreamento será disponibilizado/)
      ).toBeInTheDocument();
    });

    it("does not show copy button in empty state", () => {
      render(
        <TrackingCard
          trackingCode={null}
          trackingCarrier={null}
          estimatedDeliveryDate={null}
        />
      );

      expect(screen.queryAllByRole("button", { name: /copiar/i })).toHaveLength(0);
    });

    it("does not show track order button in empty state", () => {
      render(
        <TrackingCard
          trackingCode={null}
          trackingCarrier={null}
          estimatedDeliveryDate={null}
        />
      );

      expect(
        screen.queryByRole("button", { name: /rastrear pedido/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("With Tracking Code", () => {
    const mockProps = {
      trackingCode: "BR123456789BR",
      trackingCarrier: "correios",
      estimatedDeliveryDate: "2024-05-15T00:00:00Z",
    };

    it("renders tracking code", () => {
      render(<TrackingCard {...mockProps} />);
      expect(screen.getByText("BR123456789BR")).toBeInTheDocument();
    });

    it("shows sent badge", () => {
      render(<TrackingCard {...mockProps} />);
      expect(screen.getByText("Enviado")).toBeInTheDocument();
    });

    it("renders copy button", () => {
      render(<TrackingCard {...mockProps} />);
      expect(
        screen.getByRole("button", { name: /copiar código/i })
      ).toBeInTheDocument();
    });

    it("renders track order button", () => {
      render(<TrackingCard {...mockProps} />);
      expect(
        screen.getByRole("button", { name: /rastrear pedido/i })
      ).toBeInTheDocument();
    });

    it("displays carrier name", () => {
      render(<TrackingCard {...mockProps} />);
      expect(screen.getByText("Correios")).toBeInTheDocument();
    });

    it("displays estimated delivery date", () => {
      render(<TrackingCard {...mockProps} />);
      expect(screen.getByText(/14 de maio de 2024/i)).toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("shows toast notification when copy button is clicked", async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);

      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      await user.click(screen.getByRole("button", { name: /copiar código/i }));

      expect(mockToast).toHaveBeenCalledWith({
        title: "Código copiado",
        description: "Código de rastreamento copiado para a área de transferência.",
      });
    });
  });

  describe("Tracking Link", () => {
    it("opens Correios tracking page", async () => {
      const user = userEvent.setup();
      const trackingCode = "BR123456789BR";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      await user.click(screen.getByRole("button", { name: /rastrear pedido/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${CORREIOS_TRACKING_BASE_URL}?objeto=${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("opens Jadlog tracking page for Jadlog carrier", async () => {
      const user = userEvent.setup();
      const trackingCode = "JD123456789";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="jadlog"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      await user.click(screen.getByRole("button", { name: /rastrear pedido/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${JADLOG_TRACKING_BASE_URL}/${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("opens Correios tracking page for Sedex carrier", async () => {
      const user = userEvent.setup();
      const trackingCode = "SD123456789BR";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="sedex"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      await user.click(screen.getByRole("button", { name: /rastrear pedido/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${CORREIOS_TRACKING_BASE_URL}?objeto=${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  describe("Carrier Configuration", () => {
    it("displays Correios carrier with short code", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Correios")).toBeInTheDocument();
      expect(screen.getByLabelText("Correios")).toHaveTextContent("BR");
    });

    it("displays Jadlog carrier with short code", () => {
      render(
        <TrackingCard
          trackingCode="JD123456789"
          trackingCarrier="jadlog"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Jadlog")).toBeInTheDocument();
      expect(screen.getByLabelText("Jadlog")).toHaveTextContent("JD");
    });

    it("displays Sedex carrier with short code", () => {
      render(
        <TrackingCard
          trackingCode="SD123456789BR"
          trackingCarrier="sedex"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Sedex")).toBeInTheDocument();
      expect(screen.getByLabelText("Sedex")).toHaveTextContent("SX");
    });

    it("displays default carrier for unknown carrier", () => {
      render(
        <TrackingCard
          trackingCode="XYZ123456789"
          trackingCarrier="unknown-carrier"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const transportadoraElements = screen.getAllByText("Transportadora");
      expect(transportadoraElements.length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Transportadora")).toHaveTextContent("TR");
    });

    it("handles null carrier gracefully", () => {
      render(
        <TrackingCard
          trackingCode="XYZ123456789"
          trackingCarrier={null}
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getAllByText("Transportadora").length).toBeGreaterThan(0);
    });

    it("handles carrier name case-insensitively", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="CORREIOS"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Correios")).toBeInTheDocument();
    });
  });

  describe("Estimated Delivery Date", () => {
    it("displays estimated delivery date when provided", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-12-25T00:00:00Z"
        />
      );

      expect(screen.getByText(/24 de dezembro de 2024/i)).toBeInTheDocument();
    });

    it("does not display delivery date section when not provided", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate={null}
        />
      );

      expect(screen.queryByText(/Previsão de entrega/i)).not.toBeInTheDocument();
    });

    it("formats date in Portuguese", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-01-15T00:00:00Z"
        />
      );

      expect(screen.getByText(/janeiro/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible button labels", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByRole("button", { name: /copiar código/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /rastrear pedido/i })).toBeInTheDocument();
    });

    it("has ARIA labels for carrier marker", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByLabelText("Correios")).toBeInTheDocument();
    });

    it("uses semantic HTML for tracking code", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("BR123456789BR").tagName).toBe("CODE");
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
          className="custom-class"
        />
      );

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });
});
