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
} from "../bulk-operations-service";
import { fetchProductionQueue } from "../production-service";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-123" } } }),
    },
  },
}));

// Mock notification service
vi.mock("../../notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendBulkAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    sendBulkStageUpdateNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("Bulk Operations Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    (supabase.from as any).mockImplementation((table: string) => {
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
      };
    });

    // Execute bulk assignment
    const result: BulkOperationResult = await bulkAssignProduction(itemIds, teamMemberId);
    
    // Verify all items were successfully assigned
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    
    // Verify supabase.from was called correct number of times
    // 1 for profiles + 3 for production_queue updates = 4 calls
    expect(supabase.from).toHaveBeenCalledTimes(4);
    
    // Verify profiles was queried for user info
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    
    // Verify production_queue was updated for each item
    expect(supabase.from).toHaveBeenCalledWith("production_queue");
  });

  it("should handle partial failures in bulk assignment", async () => {
    // Test scenario where some assignments succeed and some fail
    const itemIds = ["prod-queue-001", "prod-queue-002", "prod-queue-003"];
    const teamMemberId = "team-789";
    
    // Mock user fetch (successful)
    const mockUserQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member", email: "team@example.com" }, 
        error: null 
      }),
    };

    // Configure supabase.from mock with mixed success/failure
    let callCount = 0;
    (supabase.from as any).mockImplementation((table: string) => {
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
      };
    });

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

    mockFetchQuery.select.mockResolvedValue({
      data: mockItems,
      error: null,
    });

    // Mock update queries (only for valid transitions)
    const _createMockUpdateQuery = (_shouldSucceed: boolean) => ({
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    });

    // Configure supabase.from mock
    (supabase.from as any)
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
      range: vi.fn().mockReturnThis(),
    };

    mockQueueQuery.select.mockResolvedValue({
      data: mockFilteredItems,
      error: null,
      count: mockFilteredItems.length,
    });

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
    (supabase.from as any).mockImplementation((table: string) => {
      callCount++;
      
      if (table === "profiles" && callCount === 1) {
        return { select: vi.fn().mockReturnValue(mockUserQuery) };
      }
      
      if (table === "production_queue") {
        if (callCount === 2) {
          // First call: fetchProductionQueue with filter
          return mockQueueQuery;
        }
        if (callCount >= 3) {
          // Subsequent calls: bulk assignment updates
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
      };
    });

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
    const _teamMember2Id = "team-456";
    const newStage = "production";
    
    // Mock user fetches
    const mockUserQuery1 = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member 1", email: "team1@example.com" }, 
        error: null 
      }),
    };

    const mockUserQuery2 = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { full_name: "Team Member 2", email: "team2@example.com" }, 
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
    
    // Configure complex mock for concurrent operations
    let callCount = 0;
    (supabase.from as any).mockImplementation((table: string) => {
      callCount++;
      
      if (table === "profiles") {
        if (callCount === 1) {
          return { select: vi.fn().mockReturnValue(mockUserQuery1) };
        }
        if (callCount === 4) {
          return { select: vi.fn().mockReturnValue(mockUserQuery2) };
        }
      }
      
      if (table === "production_queue") {
        // First bulk operation: assignment to team member 1
        if (callCount === 2 || callCount === 3) {
          const mockQuery = {
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
          mockQuery.eq.mockImplementation(() => {
            completedOperations.push(`assignment-${callCount}`);
            return Promise.resolve({ error: null });
          });
          return mockQuery;
        }
        
        // Second bulk operation: stage update (needs fetch first)
        if (callCount === 5) {
          const mockQuery = {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
          };
          mockQuery.select.mockResolvedValue({
            data: mockItems,
            error: null,
          });
          return mockQuery;
        }
        
        // Stage updates
        if (callCount === 6 || callCount === 7) {
          const mockQuery = {
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
          mockQuery.eq.mockImplementation(() => {
            completedOperations.push(`stage-update-${callCount}`);
            return Promise.resolve({ error: null });
          });
          return mockQuery;
        }
      }
      
      return { 
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };
    });

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
    
    // Verify operations completed in reasonable order
    // (assignments should complete before stage updates start fetching)
    expect(completedOperations).toContain("assignment-2");
    expect(completedOperations).toContain("assignment-3");
    expect(completedOperations).toContain("stage-update-6");
    expect(completedOperations).toContain("stage-update-7");
  });
});
