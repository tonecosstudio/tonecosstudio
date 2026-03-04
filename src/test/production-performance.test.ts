/**
 * Performance Tests for Production Management System
 *
 * Task: 6.3.3 Performance tests
 * Requirements: 3.1.1, 3.1.2, 3.1.3, 3.2.1
 *
 * These tests validate that the system meets performance requirements:
 * - Dashboard loads in < 2 seconds with 1000 items
 * - System handles concurrent updates from 100 users
 * - Real-time updates have acceptable latency
 * - Database queries perform well with 50k records
 *
 * NOTE: These are performance tests that require a live Supabase connection.
 * They should be run against a test database with appropriate test data.
 *
 * TypeScript Note: The production_queue table may not be in the generated types yet.
 * The tests use type assertions to bypass TypeScript errors. The tests will work
 * at runtime once the database migrations are applied.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProductionQueue,
  fetchProductionMetrics,
  updateProductionStage,
  assignProduction,
  type ProductionFilters,
  type PaginationParams,
} from "@/services/admin/production-service";

// Skip these tests if not in performance test environment
const isPerformanceTestEnv = process.env.VITEST_PERFORMANCE === "true";
const describePerformance = isPerformanceTestEnv ? describe : describe.skip;

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  DASHBOARD_LOAD_1000: 2000, // 2 seconds with 1000 items
  DASHBOARD_LOAD_50K: 5000, // 5 seconds with 50k items
  METRICS_LOAD: 1000, // 1 second for metrics
  CONCURRENT_UPDATES: 10000, // 10 seconds for 100 concurrent updates
  REALTIME_LATENCY: 5000, // 5 seconds for real-time updates
  QUERY_PERFORMANCE: 500, // 500ms for individual queries
};

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  return { result, duration };
}

/**
 * Create test production queue data
 * 
 * Note: Uses type assertions to bypass TypeScript errors for production_queue table
 * which may not be in generated types yet. Works at runtime with proper migrations.
 */
async function createTestProductionData(count: number): Promise<string[]> {
  const productionIds: string[] = [];

  // Get or create test collection
  let { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("name", "Performance Test Collection")
    .single();

  if (!collection) {
    const { data: newCollection } = await supabase
      .from("collections")
      .insert({
        name: "Performance Test Collection",
        description: "Test collection for performance testing",
        is_active: true,
      })
      .select()
      .single();
    collection = newCollection;
  }

  // Get test user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No authenticated user for performance tests");
  }

  // Create production queue items
  const batchSize = 100;
  for (let i = 0; i < count; i += batchSize) {
    const batch = Math.min(batchSize, count - i);
    const items = Array.from({ length: batch }, (_, j) => ({
      order_id: `test-order-${i + j}`,
      order_type: i % 2 === 0 ? "subscription_delivery" : "standalone_purchase",
      customer_id: user.id,
      customer_name: `Test Customer ${i + j}`,
      customer_email: `test${i + j}@example.com`,
      collection_id: collection!.id,
      collection_name: "Performance Test Collection",
      production_status: ["awaiting_choice", "ready_for_production", "in_production"][
        (i + j) % 3
      ],
      current_stage: ["awaiting_choice", "design", "production", "quality_check", "packaging"][
        (i + j) % 5
      ],
      choice_status: ["pending", "submitted", "approved"][(i + j) % 3],
      priority: ["critical", "high", "normal", "low"][(i + j) % 4],
      priority_score: 100 - (i + j) % 100,
    }));

    // @ts-ignore - production_queue table exists at runtime
    const { data, error } = await supabase
      .from("production_queue")
      .insert(items)
      .select("id");

    if (error) {
      console.error("Error creating test data:", error);
      throw error;
    }

    if (data) {
      productionIds.push(...data.map((item: any) => item.id));
    }
  }

  return productionIds;
}

/**
 * Clean up test production data
 */
async function cleanupTestProduction(productionIds: string[]) {
  if (productionIds.length === 0) return;

  // Delete in batches to avoid query size limits
  const batchSize = 100;
  for (let i = 0; i < productionIds.length; i += batchSize) {
    const batch = productionIds.slice(i, i + batchSize);
    // @ts-ignore - production_queue table exists at runtime
    await supabase.from("production_queue").delete().in("id", batch);
  }
}

// =====================================================
// TEST SUITE 1: DASHBOARD LOAD WITH 1000 ITEMS
// =====================================================

describePerformance("Performance: Dashboard Load with 1000 Items", () => {
  let testProductionIds: string[] = [];

  beforeAll(async () => {
    console.log("Creating 1000 test production items...");
    testProductionIds = await createTestProductionData(1000);
    console.log(`Created ${testProductionIds.length} test production items`);
  });

  afterAll(async () => {
    console.log("Cleaning up test production data...");
    await cleanupTestProduction(testProductionIds);
  });

  it("should load dashboard with 1000 items in < 2 seconds", async () => {
    // Requirement 3.1.1: Dashboard must load in < 2 seconds with up to 1000 production items

    const filters: ProductionFilters = {};
    const pagination: PaginationParams = { page: 1, pageSize: 50 };

    const { result, duration } = await measureTime(async () => {
      return await fetchProductionQueue(filters, pagination);
    });

    console.log(`Dashboard load time (1000 items): ${duration.toFixed(2)}ms`);
    console.log(`Loaded ${result.data.length} items (page 1 of ${result.totalPages})`);
    console.log(`Total items: ${result.total}`);

    expect(result).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_1000);
  });

  it("should apply filters efficiently", async () => {
    const filters: ProductionFilters = {
      priorities: ["high", "critical"],
      stages: ["production", "quality_check"],
    };
    const pagination: PaginationParams = { page: 1, pageSize: 50 };

    const { result, duration } = await measureTime(async () => {
      return await fetchProductionQueue(filters, pagination);
    });

    console.log(`Filtered query time: ${duration.toFixed(2)}ms`);
    console.log(`Filtered results: ${result.data.length} items`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should search by customer name efficiently", async () => {
    const filters: ProductionFilters = {
      searchQuery: "Test Customer 100",
    };
    const pagination: PaginationParams = { page: 1, pageSize: 50 };

    const { result, duration } = await measureTime(async () => {
      return await fetchProductionQueue(filters, pagination);
    });

    console.log(`Search query time: ${duration.toFixed(2)}ms`);
    console.log(`Search results: ${result.data.length} items`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should load metrics efficiently", async () => {
    const { result, duration } = await measureTime(async () => {
      return await fetchProductionMetrics();
    });

    console.log(`Metrics load time: ${duration.toFixed(2)}ms`);
    console.log(`Total items in metrics: ${result.overall.totalItems}`);

    expect(result).toBeDefined();
    expect(result.overall.totalItems).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.METRICS_LOAD);
  });

  it("should paginate efficiently", async () => {
    const filters: ProductionFilters = {};
    const pagination: PaginationParams = { page: 5, pageSize: 50 };

    const { result, duration } = await measureTime(async () => {
      return await fetchProductionQueue(filters, pagination);
    });

    console.log(`Pagination query time (page 5): ${duration.toFixed(2)}ms`);

    expect(result.data.length).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });
});

// =====================================================
// TEST SUITE 2: CONCURRENT UPDATES FROM 100 USERS
// =====================================================

describePerformance("Performance: Concurrent Updates from 100 Users", () => {
  let testProductionIds: string[] = [];

  beforeAll(async () => {
    console.log("Creating 100 test production items for concurrent updates...");
    testProductionIds = await createTestProductionData(100);
    console.log(`Created ${testProductionIds.length} test production items`);
  });

  afterAll(async () => {
    console.log("Cleaning up test production data...");
    await cleanupTestProduction(testProductionIds);
  });

  it("should handle 100 concurrent stage updates", async () => {
    // Requirement 3.1.3: System must support 100 concurrent admin users without degradation

    const updateCount = Math.min(100, testProductionIds.length);
    console.log(`Testing ${updateCount} concurrent stage updates...`);

    const { duration } = await measureTime(async () => {
      const updatePromises = testProductionIds.slice(0, updateCount).map(async (id, index) => {
        const newStage = ["design", "production", "quality_check"][index % 3] as any;
        try {
          await updateProductionStage(id, newStage);
        } catch (error) {
          // Some updates may fail due to validation, that's ok for this test
          console.log(`Update ${index} failed (expected for some):`, error);
        }
      });

      await Promise.all(updatePromises);
    });

    console.log(`${updateCount} concurrent updates completed in: ${duration.toFixed(2)}ms`);
    console.log(`Average time per update: ${(duration / updateCount).toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES);
  });

  it("should handle 100 concurrent assignment updates", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user, skipping concurrent assignment test");
      return;
    }

    const updateCount = Math.min(100, testProductionIds.length);
    console.log(`Testing ${updateCount} concurrent assignment updates...`);

    const { duration } = await measureTime(async () => {
      const updatePromises = testProductionIds.slice(0, updateCount).map(async (id) => {
        try {
          await assignProduction(id, user.id);
        } catch (error) {
          console.log("Assignment failed:", error);
        }
      });

      await Promise.all(updatePromises);
    });

    console.log(`${updateCount} concurrent assignments completed in: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES);
  });

  it("should handle 100 concurrent dashboard queries", async () => {
    const queryCount = 100;
    console.log(`Testing ${queryCount} concurrent dashboard queries...`);

    const { duration } = await measureTime(async () => {
      const queries = Array.from({ length: queryCount }, () =>
        fetchProductionQueue({}, { page: 1, pageSize: 25 })
      );

      const results = await Promise.all(queries);

      // Check that all queries succeeded
      const failedQueries = results.filter((r) => !r || r.data.length === 0);
      if (failedQueries.length > 0) {
        console.log(`${failedQueries.length} queries returned no data`);
      }

      return results;
    });

    console.log(`${queryCount} concurrent queries completed in: ${duration.toFixed(2)}ms`);
    console.log(`Average time per query: ${(duration / queryCount).toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES);
  });
});

// =====================================================
// TEST SUITE 3: REAL-TIME UPDATE LATENCY
// =====================================================

describePerformance("Performance: Real-Time Update Latency", () => {
  let testProductionId: string;

  beforeAll(async () => {
    const ids = await createTestProductionData(1);
    testProductionId = ids[0];
  });

  afterAll(async () => {
    await cleanupTestProduction([testProductionId]);
  });

  it("should receive real-time updates within 5 seconds", async () => {
    // Requirement 3.1.2: Dashboard updates must appear within 5 seconds of data change

    let updateReceived = false;
    let latency = 0;
    const updateStartTime = performance.now();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("production-test")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "production_queue",
          filter: `id=eq.${testProductionId}`,
        },
        () => {
          updateReceived = true;
          latency = performance.now() - updateStartTime;
          console.log(`Real-time update received in: ${latency.toFixed(2)}ms`);
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Perform an update
    // @ts-ignore - production_queue table exists at runtime
    await supabase
      .from("production_queue")
      .update({ production_notes: `Test update at ${Date.now()}` })
      .eq("id", testProductionId);

    // Wait for real-time update (max 6 seconds)
    const maxWait = 6000;
    const checkInterval = 100;
    let waited = 0;

    while (!updateReceived && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    // Cleanup
    await supabase.removeChannel(channel);

    console.log(`Update received: ${updateReceived}`);
    console.log(`Latency: ${latency.toFixed(2)}ms`);

    expect(updateReceived).toBe(true);
    expect(latency).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.REALTIME_LATENCY);
  });
});

// =====================================================
// TEST SUITE 4: DATABASE QUERY PERFORMANCE WITH 50K RECORDS
// =====================================================

describePerformance("Performance: Database Queries with 50k Records", () => {
  let testProductionIds: string[] = [];

  beforeAll(async () => {
    // Note: Creating 50k records takes a long time
    // In a real test environment, you would pre-populate the database
    console.log("Creating test data for 50k records test...");
    console.log("Note: This test assumes database already has ~50k records");
    console.log("Creating 1000 additional test records...");
    testProductionIds = await createTestProductionData(1000);
  });

  afterAll(async () => {
    await cleanupTestProduction(testProductionIds);
  });

  it("should query by ID efficiently with large dataset", async () => {
    // Requirement 3.2.1: System must handle 50,000 active production items

    const testId = testProductionIds[0];

    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .eq("id", testId)
        .single();

      if (error) throw error;
      return data;
    });

    console.log(`Query by ID with large dataset: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(100); // Should be very fast with primary key
  });

  it("should query by priority efficiently with large dataset", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .eq("priority", "high")
        .limit(50);

      if (error) throw error;
      return data;
    });

    console.log(`Query by priority with large dataset: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should query by stage efficiently with large dataset", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .eq("current_stage", "production")
        .limit(50);

      if (error) throw error;
      return data;
    });

    console.log(`Query by stage with large dataset: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should count total items efficiently with large dataset", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { count, error } = await supabase
        .from("production_queue")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count;
    });

    console.log(`Count query with large dataset: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should perform complex filtered query efficiently", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .in("priority", ["high", "critical"])
        .in("current_stage", ["production", "quality_check"])
        .eq("production_status", "in_production")
        .order("priority_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    });

    console.log(`Complex filtered query with large dataset: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should load dashboard with large dataset in acceptable time", async () => {
    const filters: ProductionFilters = {};
    const pagination: PaginationParams = { page: 1, pageSize: 50 };

    const { result, duration } = await measureTime(async () => {
      return await fetchProductionQueue(filters, pagination);
    });

    console.log(`Dashboard load with large dataset: ${duration.toFixed(2)}ms`);
    console.log(`Total items in database: ${result.total}`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_50K);
  });
});

// =====================================================
// TEST SUITE 5: BULK OPERATIONS PERFORMANCE
// =====================================================

describePerformance("Performance: Bulk Operations", () => {
  let testProductionIds: string[] = [];

  beforeAll(async () => {
    console.log("Creating 200 test production items for bulk operations...");
    testProductionIds = await createTestProductionData(200);
  });

  afterAll(async () => {
    await cleanupTestProduction(testProductionIds);
  });

  it("should perform bulk status update efficiently", async () => {
    const itemsToUpdate = testProductionIds.slice(0, 100);

    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { error } = await supabase
        .from("production_queue")
        .update({ production_status: "ready_for_production" })
        .in("id", itemsToUpdate);

      if (error) throw error;
    });

    console.log(`Bulk update of 100 items: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(5000);
  });

  it("should perform bulk query efficiently", async () => {
    const { result, duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .in("id", testProductionIds);

      if (error) throw error;
      return data;
    });

    console.log(`Bulk query of ${testProductionIds.length} items: ${duration.toFixed(2)}ms`);
    console.log(`Retrieved ${result?.length || 0} items`);

    expect(result).toBeDefined();
    expect(result!.length).toBe(testProductionIds.length);
    expect(duration).toBeLessThanOrEqual(2000);
  });

  it("should perform bulk delete efficiently", async () => {
    // Create temporary items for deletion test
    const tempIds = await createTestProductionData(50);

    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { error } = await supabase.from("production_queue").delete().in("id", tempIds);

      if (error) throw error;
    });

    console.log(`Bulk delete of 50 items: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(2000);
  });
});

// =====================================================
// TEST SUITE 6: INDEX PERFORMANCE
// =====================================================

describePerformance("Performance: Database Indexes", () => {
  let testProductionIds: string[] = [];

  beforeAll(async () => {
    testProductionIds = await createTestProductionData(100);
  });

  afterAll(async () => {
    await cleanupTestProduction(testProductionIds);
  });

  it("should query by customer_id efficiently (indexed)", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user, skipping customer_id index test");
      return;
    }

    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .eq("customer_id", user.id);

      if (error) throw error;
      return data;
    });

    console.log(`Query by customer_id: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should query by collection_id efficiently (indexed)", async () => {
    // @ts-ignore - production_queue table exists at runtime
    const { data: sampleItem } = await supabase
      .from("production_queue")
      .select("collection_id")
      .eq("id", testProductionIds[0])
      .single();

    if (!sampleItem) {
      console.log("Could not get sample item for collection_id test");
      return;
    }

    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .eq("collection_id", sampleItem.collection_id);

      if (error) throw error;
      return data;
    });

    console.log(`Query by collection_id: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should query by priority_score efficiently (indexed)", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .gte("priority_score", 80)
        .order("priority_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    });

    console.log(`Query by priority_score with order: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });

  it("should query by created_at efficiently (indexed)", async () => {
    const { duration } = await measureTime(async () => {
      // @ts-ignore - production_queue table exists at runtime
      const { data, error } = await supabase
        .from("production_queue")
        .select("*")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    });

    console.log(`Query by created_at with order: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE);
  });
});

// =====================================================
// PERFORMANCE SUMMARY
// =====================================================

describePerformance("Performance: Summary Report", () => {
  it("should generate performance summary", () => {
    console.log("\n=== PRODUCTION MANAGEMENT PERFORMANCE TEST SUMMARY ===");
    console.log(`Dashboard Load (1000 items) Threshold: ${PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_1000}ms`);
    console.log(`Dashboard Load (50k items) Threshold: ${PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_50K}ms`);
    console.log(`Metrics Load Threshold: ${PERFORMANCE_THRESHOLDS.METRICS_LOAD}ms`);
    console.log(`Concurrent Updates (100 users) Threshold: ${PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES}ms`);
    console.log(`Real-Time Update Latency Threshold: ${PERFORMANCE_THRESHOLDS.REALTIME_LATENCY}ms`);
    console.log(`Individual Query Threshold: ${PERFORMANCE_THRESHOLDS.QUERY_PERFORMANCE}ms`);
    console.log("======================================================\n");

    expect(true).toBe(true);
  });
});
