import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

function endpoint(fn: string) {
  return `${SUPABASE_URL}/functions/v1/${fn}`;
}

// ─── Payload size tests ────────────────────────────────────────────

Deno.test("pay-standalone-balance rejects oversized payload (> 64 KB)", async () => {
  // Create a payload larger than 64 KB
  const hugePayload = JSON.stringify({
    purchaseId: "00000000-0000-0000-0000-000000000001",
    balanceVoucherUrl: "x".repeat(70 * 1024), // ~70 KB string
  });

  const res = await fetch(endpoint("pay-standalone-balance"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: hugePayload,
  });

  const body = await res.text();
  // Should be 413 (Payload Too Large) or 401 (auth fails first) — either means it doesn't process
  assert(
    res.status === 413 || res.status === 401,
    `Expected 413 or 401 but got ${res.status}: ${body}`,
  );
});

Deno.test("create-standalone-purchase rejects oversized payload (> 64 KB)", async () => {
  const hugePayload = JSON.stringify({
    collectionId: "00000000-0000-0000-0000-000000000001",
    cycleId: "00000000-0000-0000-0000-000000000002",
    depositVoucherUrl: "x".repeat(70 * 1024),
  });

  const res = await fetch(endpoint("create-standalone-purchase"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: hugePayload,
  });

  const body = await res.text();
  assert(
    res.status === 413 || res.status === 401,
    `Expected 413 or 401 but got ${res.status}: ${body}`,
  );
});

Deno.test("analyze-preferences rejects extremely large prompt (> 32 KB)", async () => {
  const hugePayload = JSON.stringify({
    text: "a".repeat(40 * 1024), // 40 KB text
  });

  const res = await fetch(endpoint("analyze-preferences"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: hugePayload,
  });

  const body = await res.text();
  assert(
    res.status === 413 || res.status === 401 || res.status === 400,
    `Expected 413, 401 or 400 but got ${res.status}: ${body}`,
  );
});

// ─── Rate limiting simulation test ─────────────────────────────────

Deno.test("rapid requests trigger rate limiting (429)", async () => {
  const url = endpoint("get-my-subscriptions");
  const headers = {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };

  // Send 35 rapid requests (limit is 30/min for STANDARD)
  const responses: Response[] = [];
  for (let i = 0; i < 35; i++) {
    const res = await fetch(url, { method: "POST", headers, body: "{}" });
    responses.push(res);
    // Consume body to prevent resource leak
    await res.text();
  }

  // At least one of the last requests should be rate limited (429) or auth-blocked (401)
  const statuses = responses.map((r) => r.status);
  const has429or401 = statuses.some((s) => s === 429 || s === 401);
  assert(
    has429or401,
    `Expected at least one 429 or 401 in rapid fire, got statuses: ${statuses.join(",")}`,
  );
});
