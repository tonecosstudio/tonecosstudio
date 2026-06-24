import type React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditRecord } from "@/services/system/audit-trail-service";
import * as auditTrailService from "@/services/system/audit-trail-service";
import AuditTrail from "./AuditTrail";

vi.mock("@/services/system/audit-trail-service");

vi.mock("@/components/admin/shared/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/SEOHead", () => ({
  default: () => null,
}));

vi.mock("@/lib/timezone", () => ({
  toBahiaTime: (date: Date) => date,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

function auditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: "history-1",
    order_id: "12345678-90ab-cdef-1234-567890abcdef",
    order_type: "subscription_delivery",
    old_status: "pending",
    new_status: "confirmed",
    changed_by: "admin-1",
    changed_by_name: "Admin User",
    notes: "Pagamento confirmado manualmente",
    created_at: "2026-02-27T10:00:00Z",
    ...overrides,
  };
}

describe("AuditTrail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditTrailService.getAuditTrailRecords).mockResolvedValue({
      data: [],
      count: 0,
    });
    vi.mocked(auditTrailService.searchAuditTrailByResponsible).mockResolvedValue([]);
  });

  it("renderiza o cabecalho da trilha de auditoria de status de pedidos", () => {
    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByRole("heading", { name: "Trilha de Auditoria" })).toBeInTheDocument();
    expect(
      screen.getByText("Histórico completo de todas as mudanças de status dos pedidos")
    ).toBeInTheDocument();
  });

  it("exibe filtros do dominio atual de auditoria", () => {
    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar por Responsável")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Pedido")).toBeInTheDocument();
    expect(screen.getByLabelText("Data Inicial")).toBeInTheDocument();
    expect(screen.getByLabelText("Data Final")).toBeInTheDocument();
  });

  it("exibe registros de auditoria quando ha dados", async () => {
    vi.mocked(auditTrailService.getAuditTrailRecords).mockResolvedValue({
      data: [
        auditRecord({
          order_type: "standalone_purchase",
          old_status: "awaiting_payment",
          new_status: "paid",
          changed_by_name: "Financeiro",
          notes: "Comprovante validado",
        }),
      ],
      count: 1,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Compra Avulsa")).toBeInTheDocument();
      expect(screen.getByText("12345678...")).toBeInTheDocument();
      expect(screen.getByText("awaiting_payment")).toBeInTheDocument();
      expect(screen.getByText("paid")).toBeInTheDocument();
      expect(screen.getByText("Financeiro")).toBeInTheDocument();
      expect(screen.getByText("Comprovante validado")).toBeInTheDocument();
    });
  });

  it("exibe status inicial quando nao existe status anterior", async () => {
    vi.mocked(auditTrailService.getAuditTrailRecords).mockResolvedValue({
      data: [auditRecord({ old_status: null, new_status: "created" })],
      count: 1,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Inicial:")).toBeInTheDocument();
      expect(screen.getByText("created")).toBeInTheDocument();
    });
  });

  it("exibe estado vazio quando nenhum registro e encontrado", async () => {
    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
    });
  });

  it("exibe paginacao quando existem multiplas paginas", async () => {
    const data = Array.from({ length: 50 }, (_, index) =>
      auditRecord({
        id: `history-${index}`,
        order_id: `order-${index.toString().padStart(4, "0")}-abcdef`,
      })
    );

    vi.mocked(auditTrailService.getAuditTrailRecords).mockResolvedValue({
      data,
      count: 100,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText(/Página 1 de 2/)).toHaveLength(2);
      expect(screen.getByRole("button", { name: /Anterior/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Próxima/ })).toBeInTheDocument();
      expect(screen.getByText("Mostrando 1 a 50 de 100")).toBeInTheDocument();
    });
  });

  it("usa o nome do responsavel quando disponivel e Sistema quando ausente", async () => {
    vi.mocked(auditTrailService.getAuditTrailRecords).mockResolvedValue({
      data: [
        auditRecord({ id: "history-admin", changed_by_name: "Admin User" }),
        auditRecord({ id: "history-system", changed_by_name: null }),
      ],
      count: 2,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("Sistema")).toBeInTheDocument();
    });
  });
});
