import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanSelector, SubscriptionPlan } from "./PlanSelector";

const mockPlans: SubscriptionPlan[] = [
  {
    id: "plan-1",
    name: "Plano Trimestral",
    plan_type: "trimestral",
    price_full: 1350,
    price_pix: 1200,
    deliveries_total: 3,
    includes_bonus: false,
    is_active: true,
  },
  {
    id: "plan-2",
    name: "Plano Semestral",
    plan_type: "semestral",
    price_full: 2700,
    price_pix: 2400,
    deliveries_total: 6,
    includes_bonus: true,
    is_active: true,
  },
];

describe("PlanSelector", () => {
  it("renders loading state", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText("Carregando planos disponíveis...")).toBeInTheDocument();
  });

  it("renders empty state when no plans", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText("Nenhum plano disponível no momento")).toBeInTheDocument();
  });

  it("renders all plans", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    expect(screen.getByText("Plano Trimestral")).toBeInTheDocument();
    expect(screen.getByText("Plano Semestral")).toBeInTheDocument();
  });

  it("shows bonus badge for semestral plan", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    expect(screen.getByText("Peça Bônus")).toBeInTheDocument();
  });

  it("displays correct prices", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    expect(screen.getByText(/R\$\s*1\.350,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*2\.700,00/)).toBeInTheDocument();
  });

  it("displays PIX prices", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    expect(screen.getByText(/R\$\s*1\.200,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*2\.400,00/)).toBeInTheDocument();
  });

  it("calls onPlanSelect when plan is clicked", () => {
    const onPlanSelect = vi.fn();
    render(
      <PlanSelector
        onPlanSelect={onPlanSelect}
        plans={mockPlans}
      />
    );

    const trimestralLabel = screen.getByText("Plano Trimestral").closest("label");
    fireEvent.click(trimestralLabel!);

    expect(onPlanSelect).toHaveBeenCalledWith("plan-1");
  });

  it("highlights selected plan", () => {
    render(
      <PlanSelector
        selectedPlanId="plan-1"
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    const trimestralLabel = screen.getByText("Plano Trimestral").closest("label");
    expect(trimestralLabel).toHaveClass("border-primary");
  });

  it("disables selection when disabled prop is true", () => {
    const onPlanSelect = vi.fn();
    render(
      <PlanSelector
        onPlanSelect={onPlanSelect}
        plans={mockPlans}
        disabled={true}
      />
    );

    const trimestralLabel = screen.getByText("Plano Trimestral").closest("label");
    expect(trimestralLabel).toHaveClass("opacity-50");
  });

  it("shows delivery count for each plan", () => {
    render(
      <PlanSelector
        onPlanSelect={vi.fn()}
        plans={mockPlans}
      />
    );

    expect(screen.getByText(/3 entregas consecutivas/)).toBeInTheDocument();
    expect(screen.getByText(/6 entregas consecutivas/)).toBeInTheDocument();
  });
});
