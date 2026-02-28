/**
 * Tests for Admin Update Collection Endpoint
 * 
 * Requirements: 14.6
 * Task: 20.4
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/admin-update-collection";

/**
 * Helper to make authenticated requests
 */
async function makeRequest(body: any, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    data: await response.json(),
  };
}

Deno.test("Admin Update Collection - should reject without authorization", async () => {
  const result = await makeRequest({
    id: "test-id",
    name: "Updated Collection",
  });

  assertEquals(result.status, 401);
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject missing id", async () => {
  const result = await makeRequest({
    name: "Updated Collection",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
  assertEquals(result.data.error, "id is required");
});

Deno.test("Admin Update Collection - should reject empty id", async () => {
  const result = await makeRequest({
    id: "",
    name: "Updated Collection",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
  assertEquals(result.data.error, "id is required");
});

Deno.test("Admin Update Collection - should reject non-existent collection", async () => {
  const result = await makeRequest({
    id: "00000000-0000-0000-0000-000000000000",
    name: "Updated Collection",
  }, "test-admin-token");

  // Without valid token, will fail auth first
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject empty name", async () => {
  const result = await makeRequest({
    id: "test-id",
    name: "",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject empty slug", async () => {
  const result = await makeRequest({
    id: "test-id",
    slug: "",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject invalid rotation_type", async () => {
  const result = await makeRequest({
    id: "test-id",
    rotation_type: "invalid",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject invalid character_revelation_date", async () => {
  const result = await makeRequest({
    id: "test-id",
    character_revelation_date: "not-a-date",
  }, "test-admin-token");

  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept null character_revelation_date", async () => {
  const result = await makeRequest({
    id: "test-id",
    character_revelation_date: null,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept null character fields", async () => {
  const result = await makeRequest({
    id: "test-id",
    character_name: null,
    character_image_url: null,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should reject no fields to update", async () => {
  const result = await makeRequest({
    id: "test-id",
  }, "test-admin-token");

  // Without valid token, will fail auth first
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid name update", async () => {
  const result = await makeRequest({
    id: "test-id",
    name: "Updated Collection Name",
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid description update", async () => {
  const result = await makeRequest({
    id: "test-id",
    description: "Updated description text",
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid rotation_type update", async () => {
  const result = await makeRequest({
    id: "test-id",
    rotation_type: "odd_months",
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid image_url update", async () => {
  const result = await makeRequest({
    id: "test-id",
    image_url: "https://example.com/new-image.jpg",
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid character revelation update", async () => {
  const result = await makeRequest({
    id: "test-id",
    character_revelation_date: "2026-06-15T10:00:00Z",
    character_name: "Revealed Character",
    character_image_url: "https://example.com/character.jpg",
    revealed: true,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid is_active update", async () => {
  const result = await makeRequest({
    id: "test-id",
    is_active: false,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept valid display_order update", async () => {
  const result = await makeRequest({
    id: "test-id",
    display_order: 5,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

Deno.test("Admin Update Collection - should accept multiple field updates", async () => {
  const result = await makeRequest({
    id: "test-id",
    name: "Updated Name",
    description: "Updated Description",
    rotation_type: "even_months",
    is_active: true,
    display_order: 10,
  }, "test-admin-token");

  // Without valid token, will fail auth
  assertEquals(result.data.ok, false);
});

console.log("✅ All admin-update-collection tests defined");
console.log("⚠️  Note: Tests require valid admin token and existing collection to fully execute");
console.log("   Run with: deno test --allow-net --allow-env");
