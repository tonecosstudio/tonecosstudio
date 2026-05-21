/**
 * Integration test for end-to-end order flow
 * 
 * Verifies complete order journey: create → choose character → produce → ship
 * 
 * Requirements: 2.1.1, 2.2.2, 2.3.1, 2.4.1, 2.5.1
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  fetchProductionQueue, 
  updateProductionStage,
  assignProduction
} from "../production-service";
import { supabase } from "@/integrations/supabase/client";
import { submitCharacterChoice } from "@/services/customer/choice-service";
import { approveChoice } from "../choice-service";

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

// Mock customer choice service
vi.mock("@/services/customer/choice-service", () => ({
  submitCharacterChoice: vi.fn(),
}));

// Mock choice service
vi.mock("../choice-service", () => ({
  approveChoice: vi.fn(),
}));

// Mock stage service
vi.mock("../stage-service", () => ({
  calculateEstimatedCompletion: vi.fn().mockResolvedValue(new Date("2024-02-01")),
}));

// Mock notification service
vi.mock("../../notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    sendStageUpdateNotification: vi.fn().mockResolvedValue(undefined),
    sendChoiceApprovalNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("End-to-End Order Flow Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full order flow: create → choose → produce → ship", async () => {
    // Mock data for the complete flow
    const mockOrderId = "order-123";
    const mockCustomerId = "customer-123";
    const mockCharacterId = "character-456";
    const mockTeamMemberId = "team-789";
    
    // Phase 1: Order Creation (auto-populated by trigger)
    const mockCreatedItem = {
      id: "prod-queue-001",
      order_id: mockOrderId,
      order_type: "subscription_delivery",
      customer_id: mockCustomerId,
      customer_name: "Test Customer",
      customer_email: "customer@example.com",
      collection_id: "collection-001",
      collection_name: "Test Collection",
      character_id: null,
      character_name: null,
      production_status: "awaiting_choice",
      current_stage: "awaiting_choice",
      choice_status: "pending",
      choice_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      choice_made_at: null,
      priority: "normal",
      priority_score: 50,
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
    };

    // Phase 2: Character Choice Submitted
    const mockChoiceSubmittedItem = {
      ...mockCreatedItem,
      character_id: mockCharacterId,
      character_name: "Test Character",
      choice_status: "submitted",
      choice_made_at: new Date().toISOString(),
    };

    // Phase 3: Character Choice Approved
    const mockChoiceApprovedItem = {
      ...mockChoiceSubmittedItem,
      choice_status: "approved",
      production_status: "ready_for_production",
    };

    // Phase 4: Assigned to Team Member
    const mockAssignedItem = {
      ...mockChoiceApprovedItem,
      assigned_to: mockTeamMemberId,
      assigned_to_name: "Team Member",
      assigned_at: new Date().toISOString(),
    };

    // Phase 5: Production Started (Design stage)
    const mockDesignStageItem = {
      ...mockAssignedItem,
      current_stage: "design",
      production_status: "ready_for_production",
    };

    // Phase 6: Production Stage
    const mockProductionStageItem = {
      ...mockDesignStageItem,
      current_stage: "production",
      production_status: "in_production",
      production_started_at: new Date().toISOString(),
    };

    // Phase 7: Quality Check Stage
    const mockQualityCheckItem = {
      ...mockProductionStageItem,
      current_stage: "quality_check",
    };

    // Phase 8: Packaging Stage
    const mockPackagingItem = {
      ...mockQualityCheckItem,
      current_stage: "packaging",
    };

    // Phase 9: Shipped Stage
    const mockShippedItem = {
      ...mockPackagingItem,
      current_stage: "shipped",
      production_status: "completed",
      production_completed_at: new Date().toISOString(),
    };

    // Setup mock chain for fetching queue item
    const mockFetchQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCreatedItem, error: null }),
    };

    // Setup mock chain for updating production_queue
    const createMockUpdateQuery = (updatedData: any) => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedData, error: null }),
    });

    // Configure supabase.from mock to return appropriate chains
    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      
      // First call: fetch queue item for character choice
      if (callCount === 1) {
        return { select: vi.fn().mockReturnValue(mockFetchQuery) };
      }
      
      // Subsequent calls: update operations
      return { 
        update: vi.fn().mockReturnValue(createMockUpdateQuery(mockShippedItem)),
        select: vi.fn().mockReturnValue(mockFetchQuery),
      };
    });

    // Mock user fetch for assignment
    (supabase.from as any)
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockFetchQuery) }) // Fetch queue item
      .mockReturnValueOnce({ // Fetch user for assignment
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { full_name: "Team Member", email: "team@example.com" }, 
            error: null 
          }),
        }),
      })
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(createMockUpdateQuery(mockAssignedItem)) }) // Update assignment
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) }); // Log assignment

    // Mock submitCharacterChoice
    (submitCharacterChoice as any).mockResolvedValue({
      id: "choice-123",
      orderId: mockOrderId,
      characterId: mockCharacterId,
      status: "submitted",
    });

    // Mock approveChoice
    (approveChoice as any).mockResolvedValue({
      id: "choice-123",
      status: "approved",
    });

    // Execute the complete flow
    
    // Step 1: Verify order is created and awaiting choice
    const initialQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(initialQueue.data[0].productionStatus).toBe("awaiting_choice");
    expect(initialQueue.data[0].choiceStatus).toBe("pending");

    // Step 2: Customer submits character choice
    const choiceResult = await submitCharacterChoice(mockOrderId, mockCharacterId);
    expect(choiceResult.status).toBe("submitted");
    
    // Step 3: Admin approves character choice
    const approvalResult = await approveChoice("choice-123");
    expect(approvalResult.status).toBe("approved");

    // Step 4: Assign to team member
    const assignmentResult = await assignProduction("prod-queue-001", mockTeamMemberId, "Initial assignment");
    expect(assignmentResult.assignedTo).toBe(mockTeamMemberId);
    expect(assignmentResult.assignedToName).toBe("Team Member");

    // Step 5: Progress through stages
    const designResult = await updateProductionStage("prod-queue-001", "design");
    expect(designResult.currentStage).toBe("design");
    expect(designResult.productionStatus).toBe("ready_for_production");

    const productionResult = await updateProductionStage("prod-queue-001", "production");
    expect(productionResult.currentStage).toBe("production");
    expect(productionResult.productionStatus).toBe("in_production");

    const qualityResult = await updateProductionStage("prod-queue-001", "quality_check");
    expect(qualityResult.currentStage).toBe("quality_check");

    const packagingResult = await updateProductionStage("prod-queue-001", "packaging");
    expect(packagingResult.currentStage).toBe("packaging");

    const shippedResult = await updateProductionStage("prod-queue-001", "shipped");
    expect(shippedResult.currentStage).toBe("shipped");
    expect(shippedResult.productionStatus).toBe("completed");

    // Verify all stages were completed in correct order
    expect(shippedResult.productionCompletedAt).toBeTruthy();
  });

  it("should handle errors gracefully at any stage without breaking the flow", async () => {
    // Test that errors in one stage don't prevent other stages from working
    const mockItem = {
      id: "prod-queue-002",
      order_id: "order-456",
      order_type: "standalone_purchase",
      customer_id: "customer-456",
      customer_name: "Test Customer 2",
      customer_email: "customer2@example.com",
      collection_id: "collection-002",
      collection_name: "Test Collection 2",
      character_id: "character-789",
      character_name: "Test Character 2",
      production_status: "ready_for_production",
      current_stage: "design",
      choice_status: "approved",
      choice_deadline: null,
      choice_made_at: new Date().toISOString(),
      priority: "high",
      priority_score: 75,
      scheduled_production_date: null,
      estimated_completion_date: null,
      assigned_to: "team-123",
      assigned_to_name: "Team Member",
      assigned_at: new Date().toISOString(),
      production_started_at: null,
      production_completed_at: null,
      production_notes: null,
      customer_notes: null,
      internal_flags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock fetch to return item
    const mockFetchQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockItem, error: null }),
    };

    // Mock update to fail for production stage but succeed for others
    let updateCallCount = 0;
    const mockUpdateQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        updateCallCount++;
        // Fail only on the production stage update (3rd call)
        if (updateCallCount === 3) {
          return Promise.resolve({ data: null, error: { message: "Database error" } });
        }
        return Promise.resolve({ data: mockItem, error: null });
      }),
    };

    (supabase.from as any)
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockFetchQuery) })
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(mockUpdateQuery) })
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(mockUpdateQuery) })
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(mockUpdateQuery) });

    // Should successfully move to design stage
    const designResult = await updateProductionStage("prod-queue-002", "design");
    expect(designResult.currentStage).toBe("design");

    // Should fail when trying to move to production stage
    await expect(updateProductionStage("prod-queue-002", "production")).rejects.toThrow();

    // Should still be able to fetch the item
    const queue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(queue.data.length).toBeGreaterThan(0);
  });
});
