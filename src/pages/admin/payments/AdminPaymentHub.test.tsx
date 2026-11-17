import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPaymentHub from "./AdminPaymentHub";

vi.mock("@/components/admin/shared/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("./AdminPayments", () => ({
  default: () => <div>legacy-payment-dashboard</div>,
}));
vi.mock("./AdminPaymentMethods", () => ({
  default: () => <div>payment-method-settings</div>,
}));
vi.mock("./PaymentCalculator", () => ({
  default: () => <div>payment-calculator</div>,
}));
vi.mock("./AdminPreorders", () => ({
  default: () => <div>canonical-quote-payment-queue</div>,
}));
vi.mock("./AdminPaymentKeys", () => ({
  default: () => <div>payment-key-settings</div>,
}));

afterEach(cleanup);

function renderHub(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AdminPaymentHub />
    </MemoryRouter>,
  );
}

describe("admin payment hub routing", () => {
  it("opens the canonical quote payment queue on the payments route", () => {
    renderHub("/admin/pagamentos");

    expect(
      screen.getByText("canonical-quote-payment-queue"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("legacy-payment-dashboard"),
    ).not.toBeInTheDocument();
  });

  it("keeps the old manual payment dashboard reachable by its legacy view", () => {
    renderHub("/admin/pagamentos?view=legacy");

    expect(screen.getByText("legacy-payment-dashboard")).toBeInTheDocument();
    expect(
      screen.queryByText("canonical-quote-payment-queue"),
    ).not.toBeInTheDocument();
  });

  it("opens legacy payment details in the legacy dashboard", () => {
    renderHub("/admin/pagamentos/11111111-1111-4111-8111-111111111111");

    expect(screen.getByText("legacy-payment-dashboard")).toBeInTheDocument();
  });

  it("keeps the old preorder URL as an alias for the canonical payment queue", () => {
    renderHub("/admin/pagamentos/pre-vendas");

    expect(
      screen.getByText("canonical-quote-payment-queue"),
    ).toBeInTheDocument();
  });
});
