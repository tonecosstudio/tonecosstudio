/**
 * TrackingCard Component Tests
 * 
 * Tests for the TrackingCard component including:
 * - Rendering with tracking code
 * - Empty state rendering
 * - Copy functionality
 * - Tracking link opening
 * - Carrier configuration
 * - Date formatting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrackingCard } from "./TrackingCard";
import {
  CORREIOS_TRACKING_BASE_URL,
  JADLOG_TRACKING_BASE_URL,
} from "@/lib/tracking-links";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

describe("TrackingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    it("should render empty state when no tracking code is provided", () => {
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

    it("should not show copy button in empty state", () => {
      render(
        <TrackingCard
          trackingCode={null}
          trackingCarrier={null}
          estimatedDeliveryDate={null}
        />
      );

      const copyButtons = screen.queryAllByRole("button", { name: /copiar/i });
      expect(copyButtons).toHaveLength(0);
    });

    it("should not show track order button in empty state", () => {
      render(
        <TrackingCard
          trackingCode={null}
          trackingCarrier={null}
          estimatedDeliveryDate={null}
        />
      );

      const trackButtons = screen.queryByRole("button", { name: /rastrear pedido/i });
      expect(trackButtons).not.toBeInTheDocument();
    });
  });

  describe("With Tracking Code", () => {
    const mockProps = {
      trackingCode: "BR123456789BR",
      trackingCarrier: "correios",
      estimatedDeliveryDate: "2024-05-15T00:00:00Z",
    };

    it("should render tracking code", () => {
      render(<TrackingCard {...mockProps} />);

      expect(screen.getByText("BR123456789BR")).toBeInTheDocument();
    });

    it("should show 'Enviado' badge", () => {
      render(<TrackingCard {...mockProps} />);

      expect(screen.getByText("Enviado")).toBeInTheDocument();
    });

    it("should render copy button", () => {
      render(<TrackingCard {...mockProps} />);

      const copyButton = screen.getByRole("button", { name: /copiar código/i });
      expect(copyButton).toBeInTheDocument();
    });

    it("should render track order button", () => {
      render(<TrackingCard {...mockProps} />);

      const trackButton = screen.getByRole("button", { name: /rastrear pedido/i });
      expect(trackButton).toBeInTheDocument();
    });

    it("should display carrier name", () => {
      render(<TrackingCard {...mockProps} />);

      expect(screen.getByText("Correios")).toBeInTheDocument();
    });

    it("should display estimated delivery date", () => {
      render(<TrackingCard {...mockProps} />);

      // Date is formatted as "14 de maio de 2024" due to UTC conversion
      expect(screen.getByText(/14 de maio de 2024/i)).toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("should show toast notification when copy button is clicked", async () => {
      const user = userEvent.setup();
      const trackingCode = "BR123456789BR";

      // Mock clipboard writeText to return a resolved promise
      mockWriteText.mockResolvedValue(undefined);

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const copyButton = screen.getByRole("button", { name: /copiar código/i });
      await user.click(copyButton);

      // Verify toast was called (user-visible behavior)
      expect(mockToast).toHaveBeenCalledWith({
        title: "Código Copiado",
        description: "Código de rastreamento copiado para a área de transferência.",
      });
    });

    it("should show toast notification after copying", async () => {
      const user = userEvent.setup();

      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const copyButton = screen.getByRole("button", { name: /copiar código/i });
      await user.click(copyButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: "Código Copiado",
        description: "Código de rastreamento copiado para a área de transferência.",
      });
    });
  });

  describe("Tracking Link", () => {
    it("should open Correios tracking page when track button is clicked", async () => {
      const user = userEvent.setup();
      const trackingCode = "BR123456789BR";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const trackButton = screen.getByRole("button", { name: /rastrear pedido/i });
      await user.click(trackButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${CORREIOS_TRACKING_BASE_URL}?objeto=${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should open Jadlog tracking page for Jadlog carrier", async () => {
      const user = userEvent.setup();
      const trackingCode = "JD123456789";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="jadlog"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const trackButton = screen.getByRole("button", { name: /rastrear pedido/i });
      await user.click(trackButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${JADLOG_TRACKING_BASE_URL}/${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should open Correios tracking page for Sedex carrier", async () => {
      const user = userEvent.setup();
      const trackingCode = "SD123456789BR";

      render(
        <TrackingCard
          trackingCode={trackingCode}
          trackingCarrier="sedex"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const trackButton = screen.getByRole("button", { name: /rastrear pedido/i });
      await user.click(trackButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${CORREIOS_TRACKING_BASE_URL}?objeto=${trackingCode}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  describe("Carrier Configuration", () => {
    it("should display Correios carrier with correct logo", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Correios")).toBeInTheDocument();
      expect(screen.getByLabelText("Correios")).toHaveTextContent("🇧🇷");
    });

    it("should display Jadlog carrier with correct logo", () => {
      render(
        <TrackingCard
          trackingCode="JD123456789"
          trackingCarrier="jadlog"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Jadlog")).toBeInTheDocument();
      expect(screen.getByLabelText("Jadlog")).toHaveTextContent("📦");
    });

    it("should display Sedex carrier with correct logo", () => {
      render(
        <TrackingCard
          trackingCode="SD123456789BR"
          trackingCarrier="sedex"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByText("Sedex")).toBeInTheDocument();
      expect(screen.getByLabelText("Sedex")).toHaveTextContent("🇧🇷");
    });

    it("should display default carrier for unknown carrier", () => {
      render(
        <TrackingCard
          trackingCode="XYZ123456789"
          trackingCarrier="unknown-carrier"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      // Use getAllByText since "Transportadora" appears twice (label and value)
      const transportadoraElements = screen.getAllByText("Transportadora");
      expect(transportadoraElements.length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Transportadora")).toHaveTextContent("🚚");
    });

    it("should handle null carrier gracefully", () => {
      render(
        <TrackingCard
          trackingCode="XYZ123456789"
          trackingCarrier={null}
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      // Use getAllByText since "Transportadora" appears twice (label and value)
      const transportadoraElements = screen.getAllByText("Transportadora");
      expect(transportadoraElements.length).toBeGreaterThan(0);
    });

    it("should handle carrier name case-insensitively", () => {
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
    it("should display estimated delivery date when provided", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-12-25T00:00:00Z"
        />
      );

      // Date is formatted as "24 de dezembro de 2024" due to UTC conversion
      expect(screen.getByText(/24 de dezembro de 2024/i)).toBeInTheDocument();
    });

    it("should not display delivery date section when not provided", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate={null}
        />
      );

      expect(screen.queryByText(/Previsão de Entrega/i)).not.toBeInTheDocument();
    });

    it("should format date in Portuguese", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-01-15T00:00:00Z"
        />
      );

      // Should use Portuguese month name
      expect(screen.getByText(/janeiro/i)).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
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

    it("should have proper ARIA labels for carrier logo", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      expect(screen.getByLabelText("Correios")).toBeInTheDocument();
    });

    it("should use semantic HTML for tracking code", () => {
      render(
        <TrackingCard
          trackingCode="BR123456789BR"
          trackingCarrier="correios"
          estimatedDeliveryDate="2024-05-15T00:00:00Z"
        />
      );

      const codeElement = screen.getByText("BR123456789BR");
      expect(codeElement.tagName).toBe("CODE");
    });
  });
});
