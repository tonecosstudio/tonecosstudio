/**
 * Opt-in performance tests for the manual payment flow.
 *
 * These tests require a dedicated test Supabase project and are skipped unless
 * VITEST_PERFORMANCE=true. Fixture creation/cleanup uses service_role only in
 * the Node test process; measured product operations keep the same authenticated
 * boundaries used by the application.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fileUploadService } from "@/services/payments/payment-file-upload-service";
import { getPaymentById } from "@/services/payments/payment-service";
import { updateManualPaymentStatus } from "@/services/admin/orders/admin-order-status-service";

const isPerformanceTestEnv = process.env.VITEST_PERFORMANCE === "true";
const describePerformance = isPerformanceTestEnv ? describe : describe.skip;

const PERFORMANCE_THRESHOLDS = {
  DASHBOARD_LOAD: 2_000,
  PAYMENT_DETAILS_LOAD: 1_000,
  FILE_UPLOAD_5MB: 10_000,
  PAGINATION: 1_000,
  INDEX_QUERY: 1_000,
  CONCURRENT_UPLOADS: 30_000,
  CONCURRENT_ADMIN_MUTATIONS: 8_000,
  CONCURRENT_READS: 10_000,
} as const;

const PAYMENT_PROOF_BUCKET = "payment-proofs";
const MAX_CANONICAL_CONCURRENT_UPLOADS = 5;
const MAX_CANONICAL_CONCURRENT_ADMIN_MUTATIONS = 10;

let fixtureClient: SupabaseClient<Database> | null = null;
const uploadedStoragePaths = new Set<string>();

function getFixtureClient(): SupabaseClient<Database> {
  if (fixtureClient) return fixtureClient;
  if (!isPerformanceTestEnv) {
    throw new Error("Performance fixture client requested outside VITEST_PERFORMANCE mode");
  }

  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Performance tests require VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  fixtureClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return fixtureClient;
}

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startedAt = performance.now();
  const result = await fn();
  return { result, duration: performance.now() - startedAt };
}

async function requirePerformanceUser(options: { admin?: boolean } = {}): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Performance tests require an authenticated test user session");
  }

  if (options.admin) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || !["admin", "super_admin"].includes(String(profile.role))) {
      throw new Error("Admin mutation performance tests require an admin test user session");
    }
  }

  return data.user;
}

async function getActivePaymentMethodId(): Promise<string> {
  const { data, error } = await getFixtureClient()
    .from("admin_payment_methods")
    .select("id")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Performance test project requires at least one active payment method");
  }

  return data.id;
}

async function createTestPaymentData(count: number): Promise<string[]> {
  const user = await requirePerformanceUser();
  const paymentMethodId = await getActivePaymentMethodId();
  const batchId = `${Date.now()}-${crypto.randomUUID()}`;

  const rows = Array.from({ length: count }, (_, index) => ({
    reference_number: `PERF-${batchId}-${index}`,
    user_id: user.id,
    payment_method_id: paymentMethodId,
    amount: 100 + index,
    currency: "BRL",
    payment_type: "one_time" as const,
    status: index % 3 === 0 ? ("pending" as const) : ("under_review" as const),
  }));

  const { data, error } = await getFixtureClient()
    .from("manual_payments")
    .insert(rows)
    .select("id");

  if (error) throw error;
  const ids = (data ?? []).map((payment) => payment.id);
  if (ids.length !== count) {
    throw new Error(`Expected ${count} payment fixtures, created ${ids.length}`);
  }

  return ids;
}

async function cleanupTestPayments(paymentIds: string[]): Promise<void> {
  if (paymentIds.length === 0) return;

  const { error } = await getFixtureClient()
    .from("manual_payments")
    .delete()
    .in("id", paymentIds);

  if (error) throw error;
}

async function cleanupUploadedStorage(): Promise<void> {
  if (uploadedStoragePaths.size === 0) return;

  const paths = [...uploadedStoragePaths];
  uploadedStoragePaths.clear();
  const { error } = await getFixtureClient().storage.from(PAYMENT_PROOF_BUCKET).remove(paths);
  if (error) throw error;
}

function createJpegTestFile(sizeInBytes: number, suffix = "proof"): File {
  if (sizeInBytes < 4) throw new Error("JPEG performance fixture must be at least 4 bytes");

  const bytes = new Uint8Array(sizeInBytes);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[sizeInBytes - 2] = 0xff;
  bytes[sizeInBytes - 1] = 0xd9;

  return new File([bytes], `${suffix}-${crypto.randomUUID()}.jpg`, { type: "image/jpeg" });
}

async function uploadAndTrack(paymentId: string, file: File) {
  const uploaded = await fileUploadService.upload(paymentId, file);
  uploadedStoragePaths.add(uploaded.file_path);
  return uploaded;
}

describePerformance("Performance: manual payment reads", () => {
  let paymentIds: string[] = [];

  beforeAll(async () => {
    paymentIds = await createTestPaymentData(100);
  });

  afterAll(async () => {
    await cleanupTestPayments(paymentIds);
  });

  it("loads the pending-payment dashboard within the target", async () => {
    const { result, duration } = await measureTime(async () => {
      const { data, error } = await supabase
        .from("manual_payments")
        .select(
          "id,reference_number,amount,currency,status,created_at,payment_method:admin_payment_methods(name),files:payment_files(count)",
        )
        .in("status", ["pending", "under_review", "requires_info"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    });

    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);
  });

  it("paginates 25 rows within the target", async () => {
    const { result, duration } = await measureTime(async () => {
      const { data, error } = await supabase
        .from("manual_payments")
        .select("id,status,created_at")
        .order("created_at", { ascending: false })
        .range(0, 24);

      if (error) throw error;
      return data ?? [];
    });

    expect(result.length).toBeLessThanOrEqual(25);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.PAGINATION);
  });

  it("queries indexed reference/status fields within the target", async () => {
    const { data: sample, error: sampleError } = await supabase
      .from("manual_payments")
      .select("reference_number")
      .eq("id", paymentIds[0])
      .single();
    if (sampleError) throw sampleError;
    if (!sample) throw new Error("Performance payment fixture could not be reloaded");

    const { result, duration } = await measureTime(async () => {
      const [referenceResult, statusResult] = await Promise.all([
        supabase
          .from("manual_payments")
          .select("id")
          .eq("reference_number", sample.reference_number)
          .single(),
        supabase.from("manual_payments").select("id").eq("status", "under_review").limit(100),
      ]);

      if (referenceResult.error) throw referenceResult.error;
      if (statusResult.error) throw statusResult.error;
      return { referenceResult, statusResult };
    });

    expect(result.referenceResult.data?.id).toBeTruthy();
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.INDEX_QUERY);
  });

  it("handles concurrent authenticated dashboard reads", async () => {
    const queryCount = 50;
    const { result, duration } = await measureTime(async () =>
      Promise.all(
        Array.from({ length: queryCount }, () =>
          supabase
            .from("manual_payments")
            .select("id,reference_number,amount,status")
            .in("status", ["pending", "under_review", "requires_info"])
            .limit(25),
        ),
      ),
    );

    const failures = result.filter((response) => response.error);
    expect(failures).toHaveLength(0);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_READS);
  });
});

describePerformance("Performance: payment details", () => {
  let paymentId = "";

  beforeAll(async () => {
    const user = await requirePerformanceUser();
    [paymentId] = await createTestPaymentData(1);

    const fixtureRows = Array.from({ length: 3 }, (_, index) => ({
      payment_id: paymentId,
      file_name: `fixture-${index}.jpg`,
      file_path: `${paymentId}/fixture-${crypto.randomUUID()}.jpg`,
      file_size: 1024,
      file_type: "image/jpeg",
      uploaded_by: user.id,
    }));

    const { error } = await getFixtureClient().from("payment_files").insert(fixtureRows);
    if (error) throw error;
  });

  afterAll(async () => {
    await cleanupTestPayments(paymentId ? [paymentId] : []);
  });

  it("loads payment details through the canonical application path within the target", async () => {
    const { result, duration } = await measureTime(() => getPaymentById(paymentId));

    expect(result?.id).toBe(paymentId);
    expect(result?.timeline.length).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.PAYMENT_DETAILS_LOAD);
  });
});

describePerformance("Performance: canonical payment-proof upload", () => {
  const paymentIds: string[] = [];

  beforeAll(async () => {
    paymentIds.push(...(await createTestPaymentData(1 + MAX_CANONICAL_CONCURRENT_UPLOADS)));
  });

  afterAll(async () => {
    await cleanupUploadedStorage();
    await cleanupTestPayments(paymentIds);
  });

  it("uploads and scans a 5 MB proof through the Edge Function within the target", async () => {
    const file = createJpegTestFile(5 * 1024 * 1024, "max-size");
    const { result, duration } = await measureTime(() => uploadAndTrack(paymentIds[0], file));

    expect(result.payment_id).toBe(paymentIds[0]);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FILE_UPLOAD_5MB);
  });

  it("handles concurrent uploads within the canonical per-user rate-limit budget", async () => {
    const targets = paymentIds.slice(1, 1 + MAX_CANONICAL_CONCURRENT_UPLOADS);
    const { result, duration } = await measureTime(() =>
      Promise.all(
        targets.map((paymentId, index) =>
          uploadAndTrack(paymentId, createJpegTestFile(512 * 1024, `concurrent-${index}`)),
        ),
      ),
    );

    expect(result).toHaveLength(MAX_CANONICAL_CONCURRENT_UPLOADS);
    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_UPLOADS);
  });
});

describePerformance("Performance: canonical admin payment mutation", () => {
  let paymentIds: string[] = [];

  beforeAll(async () => {
    await requirePerformanceUser({ admin: true });
    paymentIds = await createTestPaymentData(MAX_CANONICAL_CONCURRENT_ADMIN_MUTATIONS);
  });

  afterAll(async () => {
    await cleanupTestPayments(paymentIds);
  });

  it("handles concurrent status mutations through admin-rpc", async () => {
    const { duration } = await measureTime(async () => {
      await Promise.all(
        paymentIds.map((paymentId) => updateManualPaymentStatus(paymentId, "under_review")),
      );
    });

    expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONCURRENT_ADMIN_MUTATIONS);
  });
});
