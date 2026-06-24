import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryConfirmation } from "./DeliveryConfirmation";

describe("DeliveryConfirmation", () => {
  const mockOnConfirmDelivery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the delivery confirmation form", () => {
    render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered={false}
        onConfirmDelivery={mockOnConfirmDelivery}
      />
    );

    expect(screen.getByText("Confirmar entrega")).toBeInTheDocument();
    expect(screen.getByText(/Recebeu seu pedido/)).toBeInTheDocument();
    expect(screen.getByLabelText("Data de entrega")).toBeInTheDocument();
    expect(screen.getByLabelText(/Feedback opcional/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marcar como entregue/ })).toBeInTheDocument();
    expect(screen.getByText(/pedido #12345/)).toBeInTheDocument();
  });

  it("renders the delivered state with date and order number", () => {
    render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered
        deliveryDate="2024-05-15T00:00:00Z"
        onConfirmDelivery={mockOnConfirmDelivery}
      />
    );

    expect(screen.getByText("Entrega confirmada")).toBeInTheDocument();
    expect(screen.getByText(/pedido #12345 foi marcado como entregue/)).toBeInTheDocument();
    expect(screen.getByText("Data de entrega")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marcar como entregue/ })).not.toBeInTheDocument();
  });

  it("accepts feedback and shows the character count", async () => {
    const user = userEvent.setup();

    render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered={false}
        onConfirmDelivery={mockOnConfirmDelivery}
      />
    );

    const feedbackTextarea = screen.getByPlaceholderText(/Conte sobre sua experiencia/);
    await user.type(feedbackTextarea, "Produto excelente!");

    expect(feedbackTextarea).toHaveValue("Produto excelente!");
    expect(screen.getByText("18/500 caracteres")).toBeInTheDocument();
    expect(feedbackTextarea).toHaveAttribute("maxLength", "500");
  });

  it("calls onConfirmDelivery with the selected date and optional feedback", async () => {
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

    await user.type(screen.getByPlaceholderText(/Conte sobre sua experiencia/), "Produto excelente!");
    await user.click(screen.getByRole("button", { name: /Marcar como entregue/ }));

    await waitFor(() => {
      expect(mockOnConfirmDelivery).toHaveBeenCalledWith(expect.any(Date), "Produto excelente!");
    });
    expect(screen.getByText("Entrega confirmada")).toBeInTheDocument();
  });

  it("shows submitting state while confirmation is pending", async () => {
    const user = userEvent.setup();
    mockOnConfirmDelivery.mockImplementation(() => new Promise(() => {}));

    render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered={false}
        onConfirmDelivery={mockOnConfirmDelivery}
      />
    );

    await user.click(screen.getByRole("button", { name: /Marcar como entregue/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirmando/ })).toBeDisabled();
    });
  });

  it("opens the calendar popover", async () => {
    const user = userEvent.setup();

    render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered={false}
        onConfirmDelivery={mockOnConfirmDelivery}
      />
    );

    await user.click(screen.getByRole("button", { name: /Data de entrega/ }));

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });
  });

  it("keeps the provided className", () => {
    const { container } = render(
      <DeliveryConfirmation
        orderId="order-1"
        orderNumber="12345"
        isDelivered={false}
        onConfirmDelivery={mockOnConfirmDelivery}
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("works without an onConfirmDelivery callback", async () => {
    const user = userEvent.setup();

    render(<DeliveryConfirmation orderId="order-1" orderNumber="12345" isDelivered={false} />);

    await user.click(screen.getByRole("button", { name: /Marcar como entregue/ }));

    await waitFor(() => {
      expect(screen.getByText("Entrega confirmada")).toBeInTheDocument();
    });
  });
});
