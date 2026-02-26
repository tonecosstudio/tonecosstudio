import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CycleInfo, Cycle } from "./CycleInfo";

const mockCycle: Cycle = {
  id: "cycle-1",
  cycle_number: 1,
  month: 3,
  year: 2026,
  open_start: "2026-03-01T00:00:00-03:00",
  open_end: "2026-03-15T23:59:59-03:00",
  production_start: "2026-03-16T00:00:00-03:00",
  production_end: "2026-03-31T23:59:59-03:00",
  shipping_date: "2026-04-07",
  status: "open",
  capacity_current: 25,
  capacity_max: 100,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("CycleInfo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading state", () => {
    render(<CycleInfo cycle={null} isLoading={true} />);

    expect(screen.getByText("Informações do Ciclo")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no cycle", () => {
    render(<CycleInfo cycle={null} isLoading={false} />);

    expect(
      screen.getByText("Nenhum ciclo ativo no momento. Aguarde a abertura do próximo ciclo.")
    ).toBeInTheDocument();
  });

  it("renders cycle information", () => {
    render(<CycleInfo cycle={mockCycle} />);

    expect(screen.getByText(/Ciclo 1/)).toBeInTheDocument();
    expect(screen.getByText(/março\/2026/i)).toBeInTheDocument();
  });

  it("shows open status badge", () => {
    render(<CycleInfo cycle={mockCycle} />);

    expect(screen.getByText("Aberto")).toBeInTheDocument();
  });

  it("shows production status badge", () => {
    const productionCycle = { ...mockCycle, status: "production" as const };
    render(<CycleInfo cycle={productionCycle} />);

    expect(screen.getByText("Em Produção")).toBeInTheDocument();
  });

  it("shows shipping status badge", () => {
    const shippingCycle = { ...mockCycle, status: "shipping" as const };
    render(<CycleInfo cycle={shippingCycle} />);

    expect(screen.getByText("Enviando")).toBeInTheDocument();
  });

  it("shows completed status badge", () => {
    const completedCycle = { ...mockCycle, status: "completed" as const };
    render(<CycleInfo cycle={completedCycle} />);

    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("displays capacity information", () => {
    render(<CycleInfo cycle={mockCycle} />);

    expect(screen.getByText("25 / 100")).toBeInTheDocument();
  });

  it("shows warning when capacity is near limit", () => {
    const nearCapacityCycle = { ...mockCycle, capacity_current: 85 };
    render(<CycleInfo cycle={nearCapacityCycle} />);

    expect(screen.getByText("Atenção: Ciclo próximo da capacidade máxima")).toBeInTheDocument();
  });

  it("displays shipping date", () => {
    render(<CycleInfo cycle={mockCycle} />);

    expect(screen.getByText("07/04/2026")).toBeInTheDocument();
  });

  it("shows countdown for open cycle", () => {
    render(<CycleInfo cycle={mockCycle} showCountdown={true} />);

    expect(screen.getByText(/Tempo restante para alterações:/)).toBeInTheDocument();
  });

  it("does not show countdown when showCountdown is false", () => {
    render(<CycleInfo cycle={mockCycle} showCountdown={false} />);

    expect(screen.queryByText(/Tempo restante para alterações:/)).not.toBeInTheDocument();
  });

  it("shows production alert for production status", () => {
    const productionCycle = { ...mockCycle, status: "production" as const };
    render(<CycleInfo cycle={productionCycle} />);

    expect(
      screen.getByText("Ciclo em produção. Alterações não são mais permitidas.")
    ).toBeInTheDocument();
  });

  it("displays cycle date ranges", () => {
    render(<CycleInfo cycle={mockCycle} />);

    expect(screen.getByText("Período de Pedidos:")).toBeInTheDocument();
    expect(screen.getByText("Período de Produção:")).toBeInTheDocument();
  });

  it("shows cycle 2 correctly", () => {
    const cycle2 = { ...mockCycle, cycle_number: 2 as const };
    render(<CycleInfo cycle={cycle2} />);

    expect(screen.getByText(/Ciclo 2/)).toBeInTheDocument();
  });

  it("renders capacity progress bar", () => {
    render(<CycleInfo cycle={mockCycle} />);

    const progressBar = document.querySelector(".bg-primary");
    expect(progressBar).toBeInTheDocument();
  });

  it("changes progress bar color when near capacity", () => {
    const nearCapacityCycle = { ...mockCycle, capacity_current: 85 };
    render(<CycleInfo cycle={nearCapacityCycle} />);

    const progressBar = document.querySelector(".bg-amber-500");
    expect(progressBar).toBeInTheDocument();
  });
});
