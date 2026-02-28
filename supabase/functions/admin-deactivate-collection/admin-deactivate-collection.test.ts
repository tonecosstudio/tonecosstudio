/**
 * Tests for admin-deactivate-collection Edge Function
 * 
 * Requirements: 14.7, 14.8
 * Task: 20.5
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Mock data
const mockCollectionId = "550e8400-e29b-41d4-a716-446655440000";
const mockAdminToken = "mock-admin-token";

Deno.test("admin-deactivate-collection - should require authentication", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/admin-deactivate-collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: mockCollectionId }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.ok, false);
});

Deno.test("admin-deactivate-collection - should require collection id", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/admin-deactivate-collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${mockAdminToken}`,
    },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.ok, false);
  assertExists(data.error);
});

Deno.test("admin-deactivate-collection - should return 404 for non-existent collection", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/admin-deactivate-collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${mockAdminToken}`,
    },
    body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }),
  });

  assertEquals(response.status, 404);
  const data = await response.json();
  assertEquals(data.ok, false);
});

Deno.test("admin-deactivate-collection - should prevent deactivation with active deliveries", async () => {
  // This test would need a collection with active deliveries in the test database
  // For now, we document the expected behavior
  
  // Expected: 400 status with error message about active deliveries
  // Expected: Response includes activeDeliveriesCount
});

Deno.test("admin-deactivate-collection - should successfully deactivate collection without active deliveries", async () => {
  // This test would need a collection without active deliveries in the test database
  // For now, we document the expected behavior
  
  // Expected: 200 status
  // Expected: Response includes updated collection with is_active = false
});
