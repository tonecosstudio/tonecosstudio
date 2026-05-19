/**
 * Testes para o Serviço de Gestão de Produção
 *
 * Valida as funções principais do production-service.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProductionQueue,
  fetchProductionMetrics,
  updateProductionStage,
  assignProduction,
  blockProduction,
  unblockProduction,
  type ProductionFilters,
  type PaginationParams,
} from "./production-service";

// Mock do Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("Production Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchProductionQueue", () => {
    it("deve buscar fila de produção com filtros e paginação", async () => {
      const mockData = [
        {
          id: "1",
          order_id: "order-1",
          order_type: "subscription_delivery",
          customer_id: "user-1",
          customer_name: "João Silva",
          customer_email: "joao@example.com",
          collection_id: "col-1",
          collection_name: "Coleção Teste",
          character_id: null,
          character_name: null,
          production_status: "awaiting_choice",
          current_stage: "awaiting_choice",
          choice_status: "pending",
          choice_deadline: "2024-12-31T23:59:59Z",
          choice_made_at: null,
          priority: "high",
          priority_score: 80,
          scheduled_production_date: null,
          estimated_completion_date: null,
          assigned_to: null,
          assigned_to_name: null,
          assigned_at: null,
          production_started_at: null,
          production_completed_at: null,
          production_notes: null,
          customer_notes: null,
          internal_flags: [],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
          count: 1,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const filters: ProductionFilters = {
        collections: ["col-1"],
        priorities: ["high"],
      };

      const pagination: PaginationParams = {
        page: 1,
        pageSize: 10,
      };

      const result = await fetchProductionQueue(filters, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.data[0].customerName).toBe("João Silva");
    });

    it("deve aplicar busca por texto", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const filters: ProductionFilters = {
        searchQuery: "João",
      };

      const pagination: PaginationParams = {
        page: 1,
        pageSize: 10,
      };

      await fetchProductionQueue(filters, pagination);

      expect(mockQuery.or).toHaveBeenCalledWith(
        expect.stringContaining("customer_name.ilike.%João%")
      );
    });
  });

  describe("fetchProductionMetrics", () => {
    it("deve buscar métricas de produção", async () => {
      const criticalDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const mockQueueData = [
        ...Array.from({ length: 5 }, () => ({
          current_stage: "awaiting_choice",
          production_status: "awaiting_choice",
          priority: "normal",
          choice_status: "pending",
        })),
        ...Array.from({ length: 35 }, () => ({
          current_stage: "delivered",
          production_status: "completed",
          priority: "normal",
          choice_status: "approved",
        })),
        {
          current_stage: "printing",
          production_status: "in_production",
          priority: "critical",
          choice_status: "pending",
          choice_deadline: criticalDeadline,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockResolvedValue({
          data: mockQueueData,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await fetchProductionMetrics();

      expect(result.stages.awaiting_choice).toBe(5);
      expect(result.overall.totalItems).toBe(41);
      expect(result.urgent.deadlineCritical).toBe(1);
    });
  });

  describe("updateProductionStage", () => {
    it("deve atualizar estágio de produção", async () => {
      const mockCurrentItem = {
        id: "1",
        production_status: "awaiting_choice",
        current_stage: "awaiting_choice",
      };

      const mockUpdatedItem = {
        ...mockCurrentItem,
        current_stage: "design",
        production_status: "ready_for_production",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCurrentItem,
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedItem,
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const result = await updateProductionStage("1", "design");

      expect(result.currentStage).toBe("design");
      expect(result.productionStatus).toBe("ready_for_production");
    });
  });

  describe("assignProduction", () => {
    it("deve atribuir produção a um usuário", async () => {
      const mockUser = {
        full_name: "Maria Santos",
        email: "maria@example.com",
      };

      const mockCurrentAssignment = {
        assigned_to: null,
        assigned_to_name: null,
      };

      const mockUpdatedItem = {
        id: "1",
        order_id: "order-1",
        order_type: "subscription_delivery",
        customer_id: "user-1",
        customer_name: "Cliente",
        customer_email: "cliente@example.com",
        collection_id: "col-1",
        collection_name: "Coleção",
        character_id: null,
        character_name: null,
        production_status: "ready_for_production",
        current_stage: "model_preparation",
        choice_status: "approved",
        choice_deadline: null,
        choice_made_at: null,
        priority: "normal",
        priority_score: 0,
        scheduled_production_date: null,
        estimated_completion_date: null,
        assigned_to: "user-2",
        assigned_to_name: "Maria Santos",
        assigned_at: "2024-01-02T00:00:00Z",
        production_started_at: null,
        production_completed_at: null,
        production_notes: null,
        customer_notes: null,
        internal_flags: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        user_id: "user-1",
      };

      const mockCurrentAssignmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCurrentAssignment,
          error: null,
        }),
      };

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedItem,
          error: null,
        }),
      };

      const mockLogQuery = {
        insert: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCurrentAssignmentQuery as any)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)
        .mockReturnValueOnce(mockLogQuery as any);

      const result = await assignProduction("1", "user-2");

      expect(result.assignedTo).toBe("user-2");
      expect(result.assignedToName).toBe("Maria Santos");
    });
  });

  describe("blockProduction", () => {
    it("deve bloquear produção com motivo", async () => {
      const mockQueueItem = {
        id: "1",
        current_stage: "production",
        customer_id: "user-1",
        customer_email: "user@example.com",
        collection_name: "Test Collection",
        order_id: "order-1",
        order_type: "subscription_delivery",
      };

      const mockUpdatedItem = {
        id: "1",
        production_status: "on_hold",
        production_notes: "Falta de material",
        updated_at: "2024-01-02T00:00:00Z",
        order_id: "order-1",
        order_type: "subscription_delivery",
        customer_id: "user-1",
        customer_name: "Test User",
        customer_email: "user@example.com",
        collection_id: "col-1",
        collection_name: "Test Collection",
        character_id: null,
        character_name: null,
        current_stage: "production",
        choice_status: "approved",
        choice_deadline: null,
        priority: "normal",
        priority_score: 50,
        scheduled_production_date: null,
        estimated_completion_date: null,
        assigned_to: null,
        assigned_to_name: null,
        assigned_at: null,
        production_started_at: null,
        production_completed_at: null,
        production_notes: "Falta de material",
        customer_notes: null,
        internal_flags: [],
        created_at: "2024-01-01T00:00:00Z",
      };

      // Mock the initial fetch query
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockQueueItem,
          error: null,
        }),
      };

      // Mock the stage update query
      const mockStageUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      };

      // Mock the production_queue update query
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedItem,
          error: null,
        }),
      };

      // Mock the estimated date update query
      const mockEstimatedDateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      };

      // Setup the mock to return different queries based on call order
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockFetchQuery as any) // First call: fetch queue item
        .mockReturnValueOnce(mockStageUpdateQuery as any) // Second call: update stage
        .mockReturnValueOnce(mockUpdateQuery as any) // Third call: update queue
        .mockReturnValueOnce(mockEstimatedDateQuery as any); // Fourth call: update estimated date

      const result = await blockProduction("1", "Falta de material");

      expect(result.productionStatus).toBe("on_hold");
      expect(result.productionNotes).toBe("Falta de material");
      expect(supabase.from).toHaveBeenCalledWith("production_queue");
      expect(supabase.from).toHaveBeenCalledWith("production_stages");
    });
  });

  describe("unblockProduction", () => {
    it("deve desbloquear produção", async () => {
      const mockCurrentItem = {
        id: "1",
        current_stage: "printing",
      };

      const mockUpdatedItem = {
        id: "1",
        order_id: "order-1",
        order_type: "subscription_delivery",
        customer_id: "user-1",
        user_id: "user-1",
        customer_name: "Cliente",
        customer_email: "cliente@example.com",
        collection_id: "col-1",
        collection_name: "Coleção",
        character_id: null,
        character_name: null,
        production_status: "in_production",
        current_stage: "printing",
        choice_status: "approved",
        choice_deadline: null,
        choice_made_at: null,
        priority: "normal",
        priority_score: 0,
        scheduled_production_date: null,
        estimated_completion_date: null,
        assigned_to: null,
        assigned_to_name: null,
        assigned_at: null,
        production_started_at: null,
        production_completed_at: null,
        production_notes: null,
        customer_notes: null,
        internal_flags: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCurrentItem,
          error: null,
        }),
      };

      const mockStageSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { started_at: "2024-01-01T00:00:00Z" },
          error: null,
        }),
      };

      const mockStageUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedItem,
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockStageSelectQuery as any)
        .mockReturnValueOnce(mockStageUpdateQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const result = await unblockProduction("1");

      expect(result.productionStatus).toBe("in_production");
    });
  });
});
