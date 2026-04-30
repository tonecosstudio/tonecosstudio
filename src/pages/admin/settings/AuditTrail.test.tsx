import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import AuditTrail from "./AuditTrail";
import * as auditTrailService from "@/services/audit-trail-service";

// Mock the audit trail service
vi.mock("@/services/audit-trail-service");

// Mock the AdminLayout component
vi.mock("@/components/admin/shared/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock SEOHead component
vi.mock("@/components/SEOHead", () => ({
  default: () => null,
}));

// Mock timezone utilities
vi.mock("@/lib/timezone", () => ({
  toBahiaTime: (date: Date) => date,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("AuditTrail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the audit trail page with header", async () => {
    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: [],
      count: 0,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText("Trilha de Auditoria")).toBeInTheDocument();
    expect(
      screen.getByText("Histórico completo de todas as mudanças de coleção realizadas por assinantes")
    ).toBeInTheDocument();
  });

  it("displays filters section", async () => {
    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: [],
      count: 0,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar Assinante")).toBeInTheDocument();
    expect(screen.getByLabelText("Motivo da Mudança")).toBeInTheDocument();
    expect(screen.getByLabelText("Data Inicial")).toBeInTheDocument();
    expect(screen.getByLabelText("Data Final")).toBeInTheDocument();
  });

  it("displays audit records when data is available", async () => {
    const mockData = [
      {
        id: "1",
        delivery_id: "del-1",
        user_id: "user-1",
        previous_collection_id: "col-1",
        new_collection_id: "col-2",
        change_reason: "manual" as const,
        changed_by_admin: false,
        admin_user_id: null,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        created_at: "2026-02-27T10:00:00Z",
        user: {
          id: "user-1",
          email: "test@example.com",
          full_name: "Test User",
        },
        previous_collection: {
          id: "col-1",
          name: "Collection A",
        },
        new_collection: {
          id: "col-2",
          name: "Collection B",
        },
      },
    ];

    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: mockData,
      count: 1,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("Collection A")).toBeInTheDocument();
      expect(screen.getByText("Collection B")).toBeInTheDocument();
      expect(screen.getByText("Manual")).toBeInTheDocument();
      expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
    });
  });

  it("displays empty state when no records found", async () => {
    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: [],
      count: 0,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
    });
  });

  it("displays different badge types for change reasons", async () => {
    const mockData = [
      {
        id: "1",
        delivery_id: "del-1",
        user_id: "user-1",
        previous_collection_id: null,
        new_collection_id: "col-1",
        change_reason: "automatic_maintenance" as const,
        changed_by_admin: false,
        admin_user_id: null,
        ip_address: null,
        user_agent: null,
        created_at: "2026-02-27T10:00:00Z",
        user: {
          id: "user-1",
          email: "test@example.com",
          full_name: "Test User",
        },
        new_collection: {
          id: "col-1",
          name: "Collection A",
        },
      },
    ];

    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: mockData,
      count: 1,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Auto-Manutenção")).toBeInTheDocument();
      expect(screen.getByText("Primeira escolha")).toBeInTheDocument();
    });
  });

  it("displays pagination controls when there are multiple pages", async () => {
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      delivery_id: `del-${i}`,
      user_id: `user-${i}`,
      previous_collection_id: `col-${i}`,
      new_collection_id: `col-${i + 1}`,
      change_reason: "manual" as const,
      changed_by_admin: false,
      admin_user_id: null,
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0",
      created_at: "2026-02-27T10:00:00Z",
      user: {
        id: `user-${i}`,
        email: `test${i}@example.com`,
        full_name: `Test User ${i}`,
      },
      previous_collection: {
        id: `col-${i}`,
        name: `Collection ${i}`,
      },
      new_collection: {
        id: `col-${i + 1}`,
        name: `Collection ${i + 1}`,
      },
    }));

    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: mockData,
      count: 100, // Total count is 100, so we have 2 pages
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
      expect(screen.getByText("Anterior")).toBeInTheDocument();
      expect(screen.getByText("Próxima")).toBeInTheDocument();
    });
  });

  it("shows admin override information when changed by admin", async () => {
    const mockData = [
      {
        id: "1",
        delivery_id: "del-1",
        user_id: "user-1",
        previous_collection_id: "col-1",
        new_collection_id: "col-2",
        change_reason: "admin_override" as const,
        changed_by_admin: true,
        admin_user_id: "admin-1",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        created_at: "2026-02-27T10:00:00Z",
        user: {
          id: "user-1",
          email: "test@example.com",
          full_name: "Test User",
        },
        previous_collection: {
          id: "col-1",
          name: "Collection A",
        },
        new_collection: {
          id: "col-2",
          name: "Collection B",
        },
        admin_user: {
          id: "admin-1",
          email: "admin@example.com",
          full_name: "Admin User",
        },
      },
    ];

    vi.mocked(auditTrailService.getAllCollectionChanges).mockResolvedValue({
      data: mockData,
      count: 1,
    });

    render(<AuditTrail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("por Admin User")).toBeInTheDocument();
    });
  });
});
