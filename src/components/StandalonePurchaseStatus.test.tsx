import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandalonePurchaseStatus } from "./StandalonePurchaseStatus";
import type { StandalonePurchase } from "@/types/database";

describe("StandalonePurchaseStatus", () => {
  const basePurchase: StandalonePurchase = {
    id: "test-1",
    user_id: "user-1",
    collection_id: "col-1",
    cycle_id: "cycle-1",
    status: "deposit_paid",
    deposit_amount: 100,
    balance_amount: 150,
    total_amount: 250,
    deposit_paid_at: new Date("2026-03-15T10:30:00Z"),
    balance_due_date: null,
    balance_paid_at: null,
    production_complete_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    tracking_code: null,
    payment_voucher_deposit_url: null,
    payment_voucher_balance_url: null,
    created_at: new Date("2026-03-15T10:00:00Z"),
    updated_at: new Date("2026-03-15T10:30:00Z"),
  };

  it("renders status badge", () => {
    render(<StandalonePurchaseStatus purchase={basePurchase} />);
    expect(screen.getByText("Status:")).toBeInTheDocument();
  });

  it("displays deposit paid status", () => {
    render(<StandalonePurchaseStatus purchase={basePurchase} />);
    expect(screen.getByText("Depósito Pago")).toBeInTheDocument();
  });

  it("displays awaiting balance status", () => {
    const purchase = {
      ...basePurchase,
      status: "awaiting_balance" as const,
      production_complete_at: new Date("2026-03-20T14:00:00Z"),
      balance_due_date: new Date("2026-03-27T23:59:59Z"),
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Aguardando Saldo")).toBeInTheDocument();
  });

  it("displays balance paid status", () => {
    const purchase = {
      ...basePurchase,
      status: "balance_paid" as const,
      balance_paid_at: new Date("2026-03-25T16:00:00Z"),
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Saldo Pago")).toBeInTheDocument();
  });

  it("displays shipped status", () => {
    const purchase = {
      ...basePurchase,
      status: "shipped" as const,
      shipped_at: new Date("2026-03-28T09:00:00Z"),
      tracking_code: "BR123456789",
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Enviado")).toBeInTheDocument();
  });

  it("displays delivered status", () => {
    const purchase = {
      ...basePurchase,
      status: "delivered" as const,
      delivered_at: new Date("2026-04-02T15:30:00Z"),
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getAllByText("Entregue").length).toBeGreaterThan(0);
  });

  it("displays cancelled status", () => {
    const purchase = {
      ...basePurchase,
      status: "cancelled" as const,
      cancelled_at: new Date("2026-03-28T00:00:00Z"),
      cancellation_reason: "Balance payment not received",
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("shows deposit confirmation", () => {
    render(<StandalonePurchaseStatus purchase={basePurchase} />);
    expect(screen.getByText("Depósito Confirmado")).toBeInTheDocument();
  });

  it("shows production complete info", () => {
    const purchase = {
      ...basePurchase,
      production_complete_at: new Date("2026-03-20T14:00:00Z"),
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Produção Concluída")).toBeInTheDocument();
  });

  it("shows balance due date", () => {
    const purchase = {
      ...basePurchase,
      status: "awaiting_balance" as const,
      balance_due_date: new Date("2026-03-27T23:59:59Z"),
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("Prazo para Pagamento do Saldo")).toBeInTheDocument();
  });

  it("shows tracking code", () => {
    const purchase = {
      ...basePurchase,
      tracking_code: "BR123456789",
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText("BR123456789")).toBeInTheDocument();
  });

  it("shows cancellation reason", () => {
    const purchase = {
      ...basePurchase,
      status: "cancelled" as const,
      cancellation_reason: "Payment not received",
    };
    render(<StandalonePurchaseStatus purchase={purchase} />);
    expect(screen.getByText(/Payment not received/)).toBeInTheDocument();
  });

  it("displays timeline", () => {
    render(<StandalonePurchaseStatus purchase={basePurchase} />);
    expect(screen.getByText("Linha do Tempo")).toBeInTheDocument();
    expect(screen.getByText("Depósito")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByText("Pagamento Saldo")).toBeInTheDocument();
    expect(screen.getByText("Envio")).toBeInTheDocument();
    expect(screen.getByText("Entrega")).toBeInTheDocument();
  });
});
