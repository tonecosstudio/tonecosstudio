/**
 * DeliveryConfirmation Component Tests
 * 
 * Tests for the DeliveryConfirmation component including:
 * - Rendering confirmation form
 * - Date picker functionality
 * - Feedback form
 * - Delivery confirmation
 * - Confirmed state display
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeliveryConfirmation } from "./DeliveryConfirmation";

describe("DeliveryConfirmation", () => {
  const mockOnConfirmDelivery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Render", () => {
    it("should render confirmation form when not delivered", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByText("Confirmar Entrega")).toBeInTheDocument();
      expect(screen.getByText(/Recebeu seu pedido/)).toBeInTheDocument();
    });

    it("should render delivery date picker", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByLabelText("Data de Entrega")).toBeInTheDocument();
    });

    it("should render feedback textarea", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByLabelText(/Feedback/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Conte-nos sobre sua experiência/)).toBeInTheDocument();
    });

    it("should render 'Mark as Delivered' button", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByRole("button", { name: /Marcar como Entregue/ })).toBeInTheDocument();
    });

    it("should show order number in help text", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByText(/pedido #12345/)).toBeInTheDocument();
    });
  });

  describe("Delivered State", () => {
    it("should render confirmation message when already delivered", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={true}
          deliveryDate="2024-05-15T00:00:00Z"
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByText("Entrega Confirmada")).toBeInTheDocument();
      expect(screen.getByText(/Obrigado por confirmar o recebimento/)).toBeInTheDocument();
    });

    it("should show delivery date in confirmed state", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={true}
          deliveryDate="2024-05-15T00:00:00Z"
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByText("Data de Entrega")).toBeInTheDocument();
      // Date is formatted as "14 de maio de 2024" due to UTC conversion
      expect(screen.getByText(/14 de maio de 2024/)).toBeInTheDocument();
    });

    it("should show order number in confirmed state", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={true}
          deliveryDate="2024-05-15T00:00:00Z"
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByText(/pedido #12345 foi marcado como entregue/)).toBeInTheDocument();
    });

    it("should not show confirmation form in delivered state", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={true}
          deliveryDate="2024-05-15T00:00:00Z"
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.queryByRole("button", { name: /Marcar como Entregue/ })).not.toBeInTheDocument();
    });
  });

  describe("Feedback Form", () => {
    it("should allow typing feedback", async () => {
      const user = userEvent.setup();

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const feedbackTextarea = screen.getByPlaceholderText(/Conte-nos sobre sua experiência/);
      await user.type(feedbackTextarea, "Produto excelente!");

      expect(feedbackTextarea).toHaveValue("Produto excelente!");
    });

    it("should show character count", async () => {
      const user = userEvent.setup();

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const feedbackTextarea = screen.getByPlaceholderText(/Conte-nos sobre sua experiência/);
      await user.type(feedbackTextarea, "Ótimo!");

      expect(screen.getByText("6/500 caracteres")).toBeInTheDocument();
    });

    it("should limit feedback to 500 characters", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const feedbackTextarea = screen.getByPlaceholderText(/Conte-nos sobre sua experiência/);
      expect(feedbackTextarea).toHaveAttribute("maxLength", "500");
    });
  });

  describe("Delivery Confirmation", () => {
    it("should call onConfirmDelivery when button is clicked", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockResolvedValue(undefined);

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirmDelivery).toHaveBeenCalled();
      });
    });

    it("should pass selected date to onConfirmDelivery", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockResolvedValue(undefined);

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirmDelivery).toHaveBeenCalledWith(
          expect.any(Date),
          undefined
        );
      });
    });

    it("should pass feedback to onConfirmDelivery when provided", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockResolvedValue(undefined);

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const feedbackTextarea = screen.getByPlaceholderText(/Conte-nos sobre sua experiência/);
      await user.type(feedbackTextarea, "Produto excelente!");

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirmDelivery).toHaveBeenCalledWith(
          expect.any(Date),
          "Produto excelente!"
        );
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Confirmando.../ })).toBeInTheDocument();
      });
    });

    it("should disable button while submitting", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Confirmando.../ })).toBeDisabled();
      });
    });

    it("should show confirmation message after successful submission", async () => {
      const user = userEvent.setup();
      mockOnConfirmDelivery.mockResolvedValue(undefined);

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Entrega Confirmada")).toBeInTheDocument();
      });
    });
  });

  describe("Date Picker", () => {
    it("should show today's date by default", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const dateButton = screen.getByRole("button", { name: "Data de Entrega" });
      expect(dateButton).toBeInTheDocument();
      // Check that button contains a date (matches format like "03 de março de 2026")
      expect(dateButton.textContent).toMatch(/\d{1,2} de .+ de \d{4}/);
    });

    it("should use provided delivery date when available", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          deliveryDate="2024-05-15T00:00:00Z"
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      // Date is formatted as "14 de maio de 2024" due to UTC conversion
      expect(screen.getByText(/14 de maio de 2024/)).toBeInTheDocument();
    });

    it("should open calendar when date button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const dateButton = screen.getByRole("button", { name: "Data de Entrega" });
      await user.click(dateButton);

      // Calendar should be visible (check for grid role which is part of calendar)
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument();
      });
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for form fields", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByLabelText("Data de Entrega")).toBeInTheDocument();
      expect(screen.getByLabelText(/Feedback/)).toBeInTheDocument();
    });

    it("should have accessible button", () => {
      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      expect(screen.getByRole("button", { name: /Marcar como Entregue/ })).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle onConfirmDelivery errors gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockOnConfirmDelivery.mockRejectedValue(new Error("Network error"));

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("should work without onConfirmDelivery callback", async () => {
      const user = userEvent.setup();

      render(
        <DeliveryConfirmation
          orderId="order-1"
          orderNumber="12345"
          isDelivered={false}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Marcar como Entregue/ });
      await user.click(confirmButton);

      // Should show confirmation without calling callback
      await waitFor(() => {
        expect(screen.getByText("Entrega Confirmada")).toBeInTheDocument();
      });
    });
  });
});
