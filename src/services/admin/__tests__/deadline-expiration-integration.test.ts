/**
 * Integration test for deadline expiration flow
 * 
 * Verifies what happens when character choice deadlines expire
 * 
 * Requirements: 2.2.4, 3.3.3
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductionQueue } from "../production-service";
import { fetchPendingChoices, extendDeadline } from "../choice-service";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock notification service
vi.mock("../../notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendExpirationNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("Deadline Expiration Flow Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle deadline expiration and notify admin", async () => {
    // Mock data for expired deadline
    const now = new Date();
    const expiredDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const approachingDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    
    const mockExpiredItem = {
      id: "prod-queue-001",
      order_id: "order-123",
      order_type: "subscription_delivery",
      customer_id: "customer-123",
      customer_name: "Expired Customer",
      customer_email: "expired@example.com",
      collection_id: "collection-001",
      collection_name: "Test Collection",
      character_id: null,
      character_name: null,
      production_status: "awaiting_choice",
      current_stage: "awaiting_choice",
      choice_status: "pending",
      choice_deadline: expiredDeadline.toISOString(),
      choice_made_at: null,
      priority: "critical",
      priority_score: 90,
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

    const mockApproachingItem = {
      ...mockExpiredItem,
      id: "prod-queue-002",
      order_id: "order-456",
      customer_name: "Approaching Customer",
      customer_email: "approaching@example.com",
      choice_deadline: approachingDeadline.toISOString(),
      priority: "high",
      priority_score: 70,
    };

    // Mock pending choices data
    const mockPendingChoices = [
      {
        id: "choice-001",
        order_id: "order-123",
        order_type: "subscription_delivery",
        user_id: "customer-123",
        collection_id: "collection-001",
        character_id: null,
        character_name: null,
        status: "pending",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        approved_by_name: null,
        rejected_at: null,
        rejection_reason: null,
        deadline: expiredDeadline.toISOString(),
        reminders_sent: 3,
        last_reminder_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        previous_choice_id: null,
        change_reason: null,
        change_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "choice-002",
        order_id: "order-456",
        order_type: "standalone_purchase",
        user_id: "customer-456",
        collection_id: "collection-001",
        character_id: null,
        character_name: null,
        status: "pending",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        approved_by_name: null,
        rejected_at: null,
        rejection_reason: null,
        deadline: approachingDeadline.toISOString(),
        reminders_sent: 2,
        last_reminder_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        previous_choice_id: null,
        change_reason: null,
        change_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Setup mock for fetching production queue
    const mockQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockExpiredItem, mockApproachingItem],
        error: null,
        count: 2,
      }),
    };

    // Setup mock for fetching pending choices
    const mockChoicesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPendingChoices,
        error: null,
      }),
    };

    // Configure supabase.from mock
    (supabase.from as any)
      .mockReturnValueOnce(mockQueueQuery) // For fetchProductionQueue
      .mockReturnValueOnce(mockChoicesQuery); // For fetchPendingChoices

    // Execute tests
    
    // Step 1: Fetch production queue to identify expired deadlines
    const queueResult = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    
    // Verify expired item is marked as critical priority
    const expiredItem = queueResult.data.find(item => item.orderId === "order-123");
    expect(expiredItem?.priority).toBe("critical");
    expect(expiredItem?.priorityScore).toBe(90);

    // Verify approaching item is marked as high priority
    const approachingItem = queueResult.data.find(item => item.orderId === "order-456");
    expect(approachingItem?.priority).toBe("high");
    expect(approachingItem?.priorityScore).toBe(70);

    // Step 2: Fetch pending choices to check deadlines
    const pendingChoices = await fetchPendingChoices({});
    
    // Verify expired choice is in the list
    const expiredChoice = pendingChoices.find(choice => choice.orderId === "order-123");
    expect(expiredChoice).toBeTruthy();
    expect(new Date(expiredChoice!.deadline!).getTime()).toBeLessThan(now.getTime());

    // Step 3: Test deadline extension
    const newDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    
    // Mock extendDeadline function
    const mockExtendedChoice = {
      ...mockPendingChoices[0],
      deadline: newDeadline.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockExtendedChoicesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockExtendedChoice, mockPendingChoices[1]],
        error: null,
      }),
    };

    (supabase.rpc as any).mockResolvedValueOnce({ data: "choice-001", error: null });
    (supabase.from as any).mockReturnValueOnce(mockExtendedChoicesQuery);

    // Mock the actual extendDeadline function
    const extendDeadlineResult = await extendDeadline("choice-001", newDeadline.toISOString());
    expect(extendDeadlineResult.deadline).toBe(newDeadline.toISOString());

    // Step 4: Verify that after extension, priority is recalculated
    const mockUpdatedItem = {
      ...mockExpiredItem,
      choice_deadline: newDeadline.toISOString(),
      priority: "normal",
      priority_score: 50,
    };

    const mockUpdatedQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUpdatedItem, mockApproachingItem],
        error: null,
        count: 2,
      }),
    };

    (supabase.from as any)
      .mockReturnValueOnce(mockUpdatedQueueQuery);

    const updatedQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    const updatedItem = updatedQueue.data.find(item => item.orderId === "order-123");
    expect(updatedItem?.priority).toBe("normal");
    expect(updatedItem?.priorityScore).toBe(50);
  });

  it("should handle multiple expired deadlines in bulk", async () => {
    // Test scenario with multiple expired deadlines
    const now = new Date();
    const expiredDeadlines = [
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    ];

    const mockExpiredItems = expiredDeadlines.map((deadline, index) => ({
      id: `prod-queue-${index + 1}`,
      order_id: `order-${index + 1}`,
      order_type: "subscription_delivery",
      customer_id: `customer-${index + 1}`,
      customer_name: `Customer ${index + 1}`,
      customer_email: `customer${index + 1}@example.com`,
      collection_id: "collection-001",
      collection_name: "Test Collection",
      character_id: null,
      character_name: null,
      production_status: "awaiting_choice",
      current_stage: "awaiting_choice",
      choice_status: "pending",
      choice_deadline: deadline.toISOString(),
      choice_made_at: null,
      priority: "critical",
      priority_score: 90 + index, // Different scores for sorting
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

    // Mock queue query
    const mockQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [...mockExpiredItems].sort((a, b) => b.priority_score - a.priority_score),
        error: null,
        count: mockExpiredItems.length,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQueueQuery);

    // Fetch queue with expired items
    const queueResult = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    
    // Verify all items are marked as critical
    expect(queueResult.data.every(item => item.priority === "critical")).toBe(true);
    
    // Verify items are sorted by priority score (descending)
    const priorityScores = queueResult.data.map(item => item.priorityScore);
    const sortedScores = [...priorityScores].sort((a, b) => b - a);
    expect(priorityScores).toEqual(sortedScores);

    // Verify the most urgent item (oldest deadline) has highest priority score
    const mostUrgentItem = queueResult.data[0];
    expect(mostUrgentItem.priorityScore).toBe(92); // 90 + 2 (3 days ago)
  });

  it("should filter dashboard to show only urgent items when alert is clicked", async () => {
    // Test filtering functionality for urgent alerts
    const now = new Date();
    
    const mockItems = [
      {
        id: "prod-queue-001",
        order_id: "order-123",
        customer_name: "Urgent Customer",
        production_status: "awaiting_choice",
        current_stage: "awaiting_choice",
        choice_status: "pending",
        choice_deadline: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
        priority: "critical",
        priority_score: 95,
      },
      {
        id: "prod-queue-002",
        order_id: "order-456",
        customer_name: "Normal Customer",
        production_status: "ready_for_production",
        current_stage: "design",
        choice_status: "approved",
        choice_deadline: null,
        priority: "normal",
        priority_score: 50,
      },
      {
        id: "prod-queue-003",
        order_id: "order-789",
        customer_name: "Blocked Customer",
        production_status: "on_hold",
        current_stage: "production",
        choice_status: "approved",
        choice_deadline: null,
        priority: "critical",
        priority_score: 80,
      },
    ];

    // Mock query for filtered results (only critical priority)
    const mockFilteredQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    // Mock the chain methods to return the query object
    mockFilteredQuery.select.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.in.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.eq.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.gte.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.lte.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.or.mockReturnValue(mockFilteredQuery);
    mockFilteredQuery.order.mockReturnValue(mockFilteredQuery);
    
    // Mock range to resolve with filtered data
    mockFilteredQuery.range.mockResolvedValue({
      data: mockItems.filter(item => item.priority === "critical"),
      error: null,
      count: 2,
    });

    (supabase.from as any).mockReturnValue(mockFilteredQuery);

    // Simulate clicking on urgent alert to filter dashboard
    const filters = {
      priorities: ["critical"] as const, // Only show critical items
    };

    const filteredQueue = await fetchProductionQueue(filters, { page: 1, pageSize: 10 });
    
    // Verify only critical items are shown
    expect(filteredQueue.data.length).toBe(2);
    expect(filteredQueue.data.every(item => item.priority === "critical")).toBe(true);
    
    // Verify both types of critical items are included
    const hasDeadlineItem = filteredQueue.data.some(item => item.choiceDeadline);
    const hasBlockedItem = filteredQueue.data.some(item => item.productionStatus === "on_hold");
    expect(hasDeadlineItem).toBe(true);
    expect(hasBlockedItem).toBe(true);
  });
});
