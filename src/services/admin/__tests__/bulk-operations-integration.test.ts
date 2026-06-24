/**
 * Integration test for bulk operations
 * 
 * Verifies bulk assignment, bulk stage updates, and other bulk operations
 * 
 * Requirements: 2.1.2, 2.3.2, 2.3.3
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { 
  bulkAssignProduction, 
  bulkUpdateStage,
  BulkOperationResult 
} from "../operations/bulk-operations-service";
import { fetchProductionQueue } from "../production/production-service";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-123" } } }),
    },
  },
}));

// Mock notification service
vi.mock("@/services/notifications/production-notification-service", () => ({
  productionNotificationService: {
    sendBulkAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    sendBulkStageUpdateNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

interface MockDefaultQuery {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

describe("Bulk Operations Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockReset();
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: "updated-production-item" },
      error: null,
    } as never);
  });

  it("should handle bulk assignment of multiple items to a team member", async () => {
    // Mock data for bulk assignment
    const itemIds = ["prod-queue-001", "prod-queue-002", "prod-queue-003"];
    const teamMemberId = "team-789";
    const teamMemberName = "Team Member";
    
    const _mockItems = itemIds.map((id, index) => ({
      id,
      order_id: `order-${index + 1}`,
      order_type: "subscription_delivery",
      customer_id: `customer-${index + 1}`,
      customer_name: `Customer ${index + 1}`,
      customer_email: `customer${index + 1}@example.com`,
      collection_id: "collection-001",
      collection_name: "Test Collection",
      character_id: `character-${index + 1}`,
      character_name: `Character ${index + 1}`,
      production_status: "ready_for_production",
      current_stage: "design",
      choice_status: "approved",
      choice_deadline: null,
      choice_made_at: new Date().toISOString(),
      priority: "normal",
      priority_score: 50 + index * 10,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Mock user fetch
    const mockUserQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: teamMemberName, email: "team@example.com" }, 
        error: null 
      }),
    };

    // Mock update queries for each item
    const createMockUpdateQuery = (_itemId: string) => ({
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    });

    // Configure supabase.from mock
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      callCount++;
      
      if (table === "profiles") {
        return { select: vi.fn().mockReturnValue(mockUserQuery) };
      }
      
      if (table === "production_queue") {
        // First call after profiles: update first item
        if (callCount === 2) {
          const mockQuery = createMockUpdateQuery(itemIds[0]);
          mockQuery.eq.mockResolvedValue({ error: null });
          return mockQuery;
        }
        // Second call: update second item
        if (callCount === 3) {
          const mockQuery = createMockUpdateQuery(itemIds[1]);
          mockQuery.eq.mockResolvedValue({ error: null });
          return mockQuery;
        }
        // Third call: update third item
        if (callCount === 4) {
          const mockQuery = createMockUpdateQuery(itemIds[2]);
          mockQuery.eq.mockResolvedValue({ error: null });
          return mockQuery;
        }
      }
      
      // Default return
      return { 
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      } as MockDefaultQuery;
    }) as never);

    // Execute bulk assignment
    const result: BulkOperationResult = await bulkAssignProduction(itemIds, teamMemberId);
    
    // Verify all items were successfully assigned
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
    
    // Verify profiles was queried for user info
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    
    itemIds.forEach((itemId) => {
      expect(supabase.rpc).toHaveBeenCalledWith("admin_assign_production", {
        p_queue_id: itemId,
        p_user_id: teamMemberId,
        p_reason: `Atribuicao em massa para ${teamMemberName}`,
      });
    });
  });

  it("should handle partial failures in bulk assignment", async () => {
    // Test scenario where some assignments succeed and some fail
    const itemIds = ["prod-queue-001", "prod-queue-002", "prod-queue-003"];
    const teamMemberId = "team-789";
    
    // Mock user fetch (successful)
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: { id: itemIds[0] }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Database constraint violation" } })
      .mockResolvedValueOnce({ data: { id: itemIds[2] }, error: null });

    const mockUserQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member", email: "team@example.com" }, 
        error: null 
      }),
    };

    // Configure supabase.from mock with mixed success/failure
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      callCount++;
      
      if (table === "profiles") {
        return { select: vi.fn().mockReturnValue(mockUserQuery) };
      }
      
      if (table === "production_queue") {
        // First item: success
        if (callCount === 2) {
          const mockQuery = {
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
          mockQuery.eq.mockResolvedValue({ error: null });
          return mockQuery;
        }
        // Second item: failure
        if (callCount === 3) {
          const mockQuery = {
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
          mockQuery.eq.mockResolvedValue({ error: { message: "Database constraint violation" } });
          return mockQuery;
        }
        // Third item: success
        if (callCount === 4) {
          const mockQuery = {
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
          mockQuery.eq.mockResolvedValue({ error: null });
          return mockQuery;
        }
      }
      
      return { 
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      } as MockDefaultQuery;
    }) as never);

    // Execute bulk assignment
    const result: BulkOperationResult = await bulkAssignProduction(itemIds, teamMemberId);
    
    // Verify mixed results
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Database constraint violation");
  });

  it("should handle bulk stage updates with validation", async () => {
    // Test bulk stage updates with proper validation
    const itemIds = ["prod-queue-001", "prod-queue-002", "prod-queue-003"];
    const newStage = "production";
    
    const mockItems = [
      {
        id: "prod-queue-001",
        current_stage: "design",
        customer_name: "Customer 1",
        production_status: "ready_for_production",
      },
      {
        id: "prod-queue-002",
        current_stage: "design",
        customer_name: "Customer 2",
        production_status: "ready_for_production",
      },
      {
        id: "prod-queue-003",
        current_stage: "awaiting_choice", // Invalid: can't jump from awaiting_choice to production
        customer_name: "Customer 3",
        production_status: "awaiting_choice",
      },
    ];

    // Mock fetch for validation
    const mockFetchQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    mockFetchQuery.in.mockResolvedValue({
      data: mockItems,
      error: null,
    });

    // Mock update queries (only for valid transitions)
    const _createMockUpdateQuery = (_shouldSucceed: boolean) => ({
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    });

    // Configure supabase.from mock
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockFetchQuery) // First call: fetch items for validation
      .mockReturnValueOnce({ // Second call: update first valid item
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      .mockReturnValueOnce({ // Third call: update second valid item
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      // Note: Third item won't be updated due to invalid transition

    // Execute bulk stage update
    const result: BulkOperationResult = await bulkUpdateStage(itemIds, newStage);
    
    // Verify results
    expect(result.successful).toBe(2); // First two items should succeed
    expect(result.failed).toBe(1); // Third item should fail validation
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Não é possível avançar");
    expect(result.errors[0]).toContain("Aguardando Escolha");
    expect(result.errors[0]).toContain("Produção");
  });

  it("should handle bulk operations on filtered items", async () => {
    // Test bulk operations on items filtered by collection
    const collectionId = "collection-001";
    const teamMemberId = "team-789";
    
    // Mock filtered items
    const mockFilteredItems = [
      {
        id: "prod-queue-001",
        order_id: "order-001",
        collection_id: collectionId,
        customer_name: "Customer 1",
        production_status: "ready_for_production",
        current_stage: "design",
      },
      {
        id: "prod-queue-002",
        order_id: "order-002",
        collection_id: collectionId,
        customer_name: "Customer 2",
        production_status: "ready_for_production",
        current_stage: "design",
      },
    ];

    // Mock items from other collections (should not be included)
    const _mockOtherItems = [
      {
        id: "prod-queue-003",
        order_id: "order-003",
        collection_id: "collection-002", // Different collection
        customer_name: "Customer 3",
        production_status: "ready_for_production",
        current_stage: "design",
      },
    ];

    // Mock fetchProductionQueue with collection filter
    const mockQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnValue({
        data: mockFilteredItems,
        error: null,
        count: mockFilteredItems.length,
      }),
    };

    // Mock .in() method for collection filter
    mockQueueQuery.in.mockImplementation((column: string, values: string[]) => {
      if (column === "collection_id" && values.includes(collectionId)) {
        return mockQueueQuery;
      }
      return mockQueueQuery;
    });

    // Mock user fetch for bulk assignment
    const mockUserQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member", email: "team@example.com" }, 
        error: null 
      }),
    };

    // Configure supabase.from mock
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      callCount++;
      
      if (table === "profiles") {
        return { select: vi.fn().mockReturnValue(mockUserQuery) };
      }
      
      if (table === "production_queue") {
        if (callCount === 1) {
          return mockQueueQuery;
        }
      }
      
      return { 
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      } as MockDefaultQuery;
    }) as never);

    // Step 1: Fetch filtered items
    const filters = {
      collections: [collectionId],
    };
    
    const filteredQueue = await fetchProductionQueue(filters, { page: 1, pageSize: 10 });
    
    // Verify only items from specified collection are returned
    expect(filteredQueue.data.length).toBe(2);
    expect(filteredQueue.data.every(item => item.collectionId === collectionId)).toBe(true);
    
    // Step 2: Perform bulk assignment on filtered items
    const filteredItemIds = filteredQueue.data.map(item => item.id);
    const assignmentResult = await bulkAssignProduction(filteredItemIds, teamMemberId);
    
    // Verify all filtered items were assigned
    expect(assignmentResult.successful).toBe(2);
    expect(assignmentResult.failed).toBe(0);
  });

  it("should handle concurrent bulk operations gracefully", async () => {
    // Test scenario where multiple bulk operations happen concurrently
    const itemIds = ["prod-queue-001", "prod-queue-002"];
    const teamMember1Id = "team-789";
    const newStage = "production";
    
    // Mock user fetches
    const mockUserQuery1 = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member 1", email: "team1@example.com" }, 
        error: null 
      }),
    };

    // Mock items for stage validation
    const mockItems = [
      {
        id: "prod-queue-001",
        current_stage: "design",
        customer_name: "Customer 1",
        production_status: "ready_for_production",
      },
      {
        id: "prod-queue-002",
        current_stage: "design",
        customer_name: "Customer 2",
        production_status: "ready_for_production",
      },
    ];

    // Track which operations completed
    const completedOperations: string[] = [];
    
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === "profiles") {
        return { select: vi.fn().mockReturnValue(mockUserQuery1) };
      }

      if (table === "production_queue") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: mockItems,
              error: null,
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      } as MockDefaultQuery;
    }) as never);

    vi.mocked(supabase.rpc).mockImplementation(((name: string, args: Record<string, string>) => {
      if (name === "admin_assign_production") {
        completedOperations.push(`assignment-${args.p_queue_id}`);
      }

      if (name === "admin_update_production_stage") {
        completedOperations.push(`stage-update-${args.p_queue_id}`);
      }

      return Promise.resolve({
        data: { id: args.p_queue_id },
        error: null,
      });
    }) as never);

    // Execute concurrent bulk operations (simulated)
    const assignmentPromise = bulkAssignProduction(itemIds, teamMember1Id);
    const stageUpdatePromise = bulkUpdateStage(itemIds, newStage);
    
    const [assignmentResult, stageUpdateResult] = await Promise.all([
      assignmentPromise,
      stageUpdatePromise,
    ]);
    
    // Verify both operations completed
    expect(assignmentResult.successful).toBe(2);
    expect(stageUpdateResult.successful).toBe(2);
    
    expect(completedOperations).toEqual(
      expect.arrayContaining([
        "assignment-prod-queue-001",
        "assignment-prod-queue-002",
        "stage-update-prod-queue-001",
        "stage-update-prod-queue-002",
      ])
    );
  });
});
