import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CollectorBenefits } from "./CollectorBenefits";

describe("CollectorBenefits", () => {
  it("recalculates the preorder balance after the R$50 entry", () => {
    render(<MemoryRouter><CollectorBenefits coinsAvailable={false} /></MemoryRouter>);
    expect(screen.getByText(/1 Coin abate R\$ 1 em orçamento respondido/)).toBeInTheDocument();
    expect(screen.getByText(/não aceita Coins/)).toBeInTheDocument();
    const total = screen.getByRole("spinbutton", { name: "Valor da peça (R$)" });
    const result = document.getElementById("preorder-result");
    expect(result?.textContent).toContain("250,00 na finalização.");

    fireEvent.change(total, { target: { value: "500" } });

    expect(result?.textContent).toContain("450,00 na finalização.");
  });
});
