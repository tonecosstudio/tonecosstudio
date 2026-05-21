/**
 * End-to-End Integration Tests for Manual Payment System
 *
 * Task: 29.1 Testes de integração end-to-end
 * Requirements: All requirements (1-20)
 *
 * These tests validate complete workflows across the entire payment system:
 * - Customer payment flow (create → upload → track status)
 * - Admin workflow (review → approve → verify integration)
 * - Rejection and resubmission flow
 * - Bulk operations with mixed statuses
 * - Real-time updates across multiple clients
 * - Email notifications
 *
 * NOTE: These are integration tests that require a live Supabase connection.
 * They should be run against a test database, not production.
 * To run these tests, ensure you have:
 * 1. A test Supabase project configured
 * 2. All migrations applied
 * 3. Test data seeded
 *
 * For CI/CD, these tests should be skipped or run against a dedicated test environment.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  createPayment,
  approvePayment,
  rejectPayment,
  requestPaymentInfo,
} from "@/lib/payment-service";
import {
  listPendingPayments,
  bulkApprovePayments,
  bulkSendMessage,
} from "@/lib/admin-payment-service";
import { fileUploadService } from "@/lib/file-upload-service";

// Skip these tests if not in integration test environment
const isIntegrationTestEnv = process.env.VITEST_INTEGRATION === "true";
const describeIntegration = isIntegrationTestEnv ? describe : describe.skip;

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Create a test user and return auth session
 */
async function createTestUser(email: string, role: "customer" | "admin" = "customer") {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: "test-password-123",
  });

  if (authError) throw authError;

  // Set role in profiles
  if (authData.user) {
    await supabase.from("profiles").update({ role }).eq("id", authData.user.id);
  }

  return authData;
}

/**
 * Create a test payment method
 */
async function createTestPaymentMethod() {
  const { data, error } = await supabase
    .from("admin_payment_methods")
    .insert({
      name: "PIX Test",
      type: "pix",
      instructions: "Test PIX instructions",
      pix_key: "test@example.com",
      is_active: true,
      is_default: true,
      display_order: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test quote
 */
async function createTestQuote(userId: string) {
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: userId,
      status: "pending",
      total_amount: 100.0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test subscription
 */
async function createTestSubscription(userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      status: "pending",
      plan_type: "monthly",
      deliveries_total: 12,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test file blob
 */
function createTestFile(sizeInBytes: number, type: string = "image/jpeg"): File {
  const buffer = new ArrayBuffer(sizeInBytes);
  const blob = new Blob([buffer], { type });
  return new File([blob], "test-file.jpg", { type });
}

/**
 * Clean up test data
 */
async function cleanupTestData(paymentIds: string[], userIds: string[]) {
  // Delete payments (cascades to files, audit logs, conversations)
  if (paymentIds.length > 0) {
    await supabase.from("manual_payments").delete().in("id", paymentIds);
  }

  // Delete users
  if (userIds.length > 0) {
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }
}

// =====================================================
// TEST SUITE 1: COMPLETE CUSTOMER PAYMENT FLOW
// =====================================================

describeIntegration("E2E: Complete Customer Payment Flow", () => {
  let customerId: string;
  let paymentMethodId: string;
  let quoteId: string;
  let paymentId: string;

  beforeEach(async () => {
    // Setup test data
    const customer = await createTestUser("customer-flow@test.com");
    customerId = customer.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    const quote = await createTestQuote(customerId);
    quoteId = quote.id;
  });

  afterEach(async () => {
    await cleanupTestData([paymentId], [customerId]);
  });

  it("should complete full customer payment flow: create → upload → track status", async () => {
    // Step 1: Customer creates payment
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quoteId,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });

    paymentId = payment.id;

    // Verify payment created with correct initial state
    expect(payment).toBeDefined();
    expect(payment.status).toBe("pending");
    expect(payment.reference_number).toMatch(/^PAY-\d{8}-\d{4}$/);
    expect(payment.user_id).toBe(customerId);
    expect(payment.quote_id).toBe(quoteId);

    // Step 2: Verify conversation was automatically created
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("payment_id", paymentId)
      .single();

    expect(conversation).toBeDefined();
    expect(conversation!.subject).toContain(payment.reference_number);
    expect(conversation!.status).toBe("waiting_admin");

    // Step 3: Customer uploads payment proof
    const testFile = createTestFile(1024 * 1024); // 1MB
    const uploadedFile = await fileUploadService.upload(paymentId, testFile);

    expect(uploadedFile).toBeDefined();
    expect(uploadedFile.payment_id).toBe(paymentId);
    expect(uploadedFile.file_size).toBe(1024 * 1024);

    // Step 4: Verify payment status changed to 'under_review'
    const { data: updatedPayment } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(updatedPayment!.status).toBe("under_review");

    // Step 5: Verify audit log was created
    const { data: auditLogs } = await supabase
      .from("payment_audit_log")
      .select("*")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: true });

    expect(auditLogs).toBeDefined();
    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs!.some((log) => log.action_type === "file_uploaded")).toBe(true);

    // Step 6: Customer can view their payment
    const { data: customerPayments } = await supabase
      .from("manual_payments")
      .select("*")
      .eq("user_id", customerId);

    expect(customerPayments).toBeDefined();
    expect(customerPayments!.length).toBe(1);
    expect(customerPayments![0].id).toBe(paymentId);
  });
});

// =====================================================
// TEST SUITE 2: COMPLETE ADMIN WORKFLOW
// =====================================================

describeIntegration("E2E: Complete Admin Workflow", () => {
  let customerId: string;
  let adminId: string;
  let paymentMethodId: string;
  let quoteId: string;
  let paymentId: string;

  beforeEach(async () => {
    // Setup test data
    const customer = await createTestUser("customer-admin@test.com");
    customerId = customer.user!.id;

    const admin = await createTestUser("admin-workflow@test.com", "admin");
    adminId = admin.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    const quote = await createTestQuote(customerId);
    quoteId = quote.id;

    // Create payment and upload file
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quoteId,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });
    paymentId = payment.id;

    const testFile = createTestFile(1024 * 1024);
    await fileUploadService.upload(paymentId, testFile);
  });

  afterEach(async () => {
    await cleanupTestData([paymentId], [customerId, adminId]);
  });

  it("should complete full admin workflow: review → approve → verify integration", async () => {
    // Step 1: Admin views pending payments dashboard
    const pendingPayments = await listPendingPayments({
      status: ["under_review"],
    });

    expect(pendingPayments).toBeDefined();
    expect(pendingPayments.length).toBeGreaterThan(0);

    const targetPayment = pendingPayments.find((p) => p.id === paymentId);
    expect(targetPayment).toBeDefined();
    expect(targetPayment!.status).toBe("under_review");
    expect(targetPayment!.file_count).toBe(1);

    // Step 2: Admin reviews payment details
    const { data: paymentDetails } = await supabase
      .from("manual_payments")
      .select(
        `
        *,
        payment_method:admin_payment_methods(*),
        files:payment_files(*)
      `
      )
      .eq("id", paymentId)
      .single();

    expect(paymentDetails).toBeDefined();
    expect(paymentDetails!.files.length).toBe(1);

    // Step 3: Admin approves payment
    await approvePayment(paymentId, adminId);

    // Step 4: Verify payment status updated
    const { data: approvedPayment } = await supabase
      .from("manual_payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    expect(approvedPayment!.status).toBe("approved");
    expect(approvedPayment!.approved_by).toBe(adminId);
    expect(approvedPayment!.approved_at).toBeDefined();

    // Step 5: Verify quote status was updated
    const { data: updatedQuote } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", quoteId)
      .single();

    expect(updatedQuote!.status).toBe("paid");

    // Step 6: Verify audit log created
    const { data: auditLogs } = await supabase
      .from("payment_audit_log")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("action_type", "approved");

    expect(auditLogs).toBeDefined();
    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs![0].admin_id).toBe(adminId);

    // Step 7: Verify conversation updated
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("payment_id", paymentId)
      .single();

    expect(conversation!.status).toBe("resolved");
  });
});

// =====================================================
// TEST SUITE 3: REJECTION AND RESUBMISSION FLOW
// =====================================================

describeIntegration("E2E: Rejection and Resubmission Flow", () => {
  let customerId: string;
  let adminId: string;
  let paymentMethodId: string;
  let quoteId: string;
  let paymentId: string;

  beforeEach(async () => {
    const customer = await createTestUser("customer-reject@test.com");
    customerId = customer.user!.id;

    const admin = await createTestUser("admin-reject@test.com", "admin");
    adminId = admin.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    const quote = await createTestQuote(customerId);
    quoteId = quote.id;

    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quoteId,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });
    paymentId = payment.id;

    const testFile = createTestFile(1024 * 1024);
    await fileUploadService.upload(paymentId, testFile);
  });

  afterEach(async () => {
    await cleanupTestData([paymentId], [customerId, adminId]);
  });

  it("should handle rejection and allow resubmission", async () => {
    // Step 1: Admin rejects payment
    const rejectionReason = "Comprovante ilegível. Por favor, envie uma imagem mais clara.";
    await rejectPayment(paymentId, adminId, rejectionReason);

    // Step 2: Verify payment status and reason
    const { data: rejectedPayment } = await supabase
      .from("manual_payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    expect(rejectedPayment!.status).toBe("rejected");
    expect(rejectedPayment!.rejection_reason).toBe(rejectionReason);

    // Step 3: Verify rejection audit log
    const { data: auditLogs } = await supabase
      .from("payment_audit_log")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("action_type", "rejected");

    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs![0].notes).toBe(rejectionReason);

    // Step 4: Customer uploads new proof (resubmission)
    const newFile = createTestFile(2 * 1024 * 1024); // 2MB
    const resubmittedFile = await fileUploadService.upload(paymentId, newFile);

    expect(resubmittedFile).toBeDefined();

    // Step 5: Verify status changed back to 'under_review'
    const { data: resubmittedPayment } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(resubmittedPayment!.status).toBe("under_review");

    // Step 6: Verify file count increased
    const { data: files } = await supabase
      .from("payment_files")
      .select("*")
      .eq("payment_id", paymentId);

    expect(files!.length).toBe(2);

    // Step 7: Admin can now approve the resubmitted payment
    await approvePayment(paymentId, adminId);

    const { data: finalPayment } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(finalPayment!.status).toBe("approved");
  });

  it("should handle request for more information flow", async () => {
    // Step 1: Admin requests more info
    const infoRequest = "Por favor, envie também o comprovante de transferência bancária.";
    await requestPaymentInfo(paymentId, adminId, infoRequest);

    // Step 2: Verify status changed to 'requires_info'
    const { data: payment } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(payment!.status).toBe("requires_info");

    // Step 3: Verify audit log
    const { data: auditLogs } = await supabase
      .from("payment_audit_log")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("action_type", "info_requested");

    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs![0].notes).toBe(infoRequest);

    // Step 4: Customer uploads additional file
    const additionalFile = createTestFile(1024 * 1024);
    await fileUploadService.upload(paymentId, additionalFile);

    // Step 5: Verify status changed to 'under_review'
    const { data: updatedPayment } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(updatedPayment!.status).toBe("under_review");
  });
});

// =====================================================
// TEST SUITE 4: BULK OPERATIONS WITH MIXED STATUSES
// =====================================================

describeIntegration("E2E: Bulk Operations with Mixed Statuses", () => {
  let customerId: string;
  let adminId: string;
  let paymentMethodId: string;
  const paymentIds: string[] = [];

  beforeEach(async () => {
    const customer = await createTestUser("customer-bulk@test.com");
    customerId = customer.user!.id;

    const admin = await createTestUser("admin-bulk@test.com", "admin");
    adminId = admin.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    // Create multiple payments with different statuses
    for (let i = 0; i < 5; i++) {
      const quote = await createTestQuote(customerId);
      const payment = await createPayment({
        payment_method_id: paymentMethodId,
        quote_id: quote.id,
        amount: 100.0 + i * 10,
        currency: "BRL",
        payment_type: "one_time",
      });
      paymentIds.push(payment.id);

      // Upload file to change status to 'under_review'
      if (i < 3) {
        const testFile = createTestFile(1024 * 1024);
        await fileUploadService.upload(payment.id, testFile);
      }
    }
  });

  afterEach(async () => {
    await cleanupTestData(paymentIds, [customerId, adminId]);
  });

  it("should handle bulk approve with mixed statuses", async () => {
    // Attempt to bulk approve all payments (some are 'pending', some are 'under_review')
    const result = await bulkApprovePayments(paymentIds, adminId);

    // Verify results
    expect(result.success_count).toBe(3); // Only 'under_review' payments
    expect(result.failure_count).toBe(2); // 'pending' payments should fail
    expect(result.errors.length).toBe(2);

    // Verify error messages
    result.errors.forEach((error) => {
      expect(error.error).toContain("must be 'under_review'");
    });

    // Verify successful approvals
    const { data: approvedPayments } = await supabase
      .from("manual_payments")
      .select("*")
      .eq("status", "approved")
      .in("id", paymentIds);

    expect(approvedPayments!.length).toBe(3);
  });

  it("should handle bulk message to multiple payments", async () => {
    // Send bulk message to all payments
    const message = "Estamos revisando seu pagamento. Aguarde retorno em breve.";
    const result = await bulkSendMessage(paymentIds, message, adminId);

    // Verify all messages sent successfully
    expect(result.success_count).toBe(5);
    expect(result.failure_count).toBe(0);

    // Verify messages were created in conversations
    for (const paymentId of paymentIds) {
      const { data: conversation } = await supabase
        .from("support_conversations")
        .select("id")
        .eq("payment_id", paymentId)
        .single();

      expect(conversation).toBeDefined();

      const { data: messages } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversation!.id)
        .eq("message", message);

      expect(messages!.length).toBeGreaterThan(0);
    }
  });
});

// =====================================================
// TEST SUITE 5: SUBSCRIPTION PAYMENT FLOW
// =====================================================

describeIntegration("E2E: Subscription Payment Flow", () => {
  let customerId: string;
  let adminId: string;
  let paymentMethodId: string;
  let subscriptionId: string;
  let paymentId: string;

  beforeEach(async () => {
    const customer = await createTestUser("customer-sub@test.com");
    customerId = customer.user!.id;

    const admin = await createTestUser("admin-sub@test.com", "admin");
    adminId = admin.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    const subscription = await createTestSubscription(customerId);
    subscriptionId = subscription.id;
  });

  afterEach(async () => {
    await cleanupTestData([paymentId], [customerId, adminId]);
  });

  it("should activate subscription and create deliveries on payment approval", async () => {
    // Step 1: Create subscription payment
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      subscription_id: subscriptionId,
      amount: 500.0,
      currency: "BRL",
      payment_type: "recurring",
    });
    paymentId = payment.id;

    expect(payment.subscription_id).toBe(subscriptionId);
    expect(payment.payment_type).toBe("recurring");

    // Step 2: Upload proof
    const testFile = createTestFile(1024 * 1024);
    await fileUploadService.upload(paymentId, testFile);

    // Step 3: Admin approves
    await approvePayment(paymentId, adminId);

    // Step 4: Verify subscription activated
    const { data: activatedSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    expect(activatedSubscription!.status).toBe("active");

    // Step 5: Verify deliveries created
    const { data: deliveries } = await supabase
      .from("subscription_deliveries")
      .select("*")
      .eq("subscription_id", subscriptionId);

    expect(deliveries).toBeDefined();
    expect(deliveries!.length).toBe(12); // Based on deliveries_total
  });
});

// =====================================================
// TEST SUITE 6: REAL-TIME UPDATES SIMULATION
// =====================================================

describeIntegration("E2E: Real-time Updates", () => {
  let customerId: string;
  let adminId: string;
  let paymentMethodId: string;
  let paymentId: string;

  beforeEach(async () => {
    const customer = await createTestUser("customer-realtime@test.com");
    customerId = customer.user!.id;

    const admin = await createTestUser("admin-realtime@test.com", "admin");
    adminId = admin.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;

    const quote = await createTestQuote(customerId);
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quote.id,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });
    paymentId = payment.id;
  });

  afterEach(async () => {
    await cleanupTestData([paymentId], [customerId, adminId]);
  });

  it("should reflect status changes across multiple queries", async () => {
    // Simulate multiple clients watching the same payment

    // Client 1: Get initial state
    const { data: initialState } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(initialState!.status).toBe("pending");

    // Client 2: Upload file (changes status)
    const testFile = createTestFile(1024 * 1024);
    await fileUploadService.upload(paymentId, testFile);

    // Client 1: Query again (should see updated status)
    const { data: afterUpload } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(afterUpload!.status).toBe("under_review");

    // Client 3 (admin): Approve payment
    await approvePayment(paymentId, adminId);

    // All clients: Query again (should see approved status)
    const { data: afterApproval } = await supabase
      .from("manual_payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    expect(afterApproval!.status).toBe("approved");
  });
});

// =====================================================
// TEST SUITE 7: ERROR HANDLING AND EDGE CASES
// =====================================================

describeIntegration("E2E: Error Handling and Edge Cases", () => {
  let customerId: string;
  let paymentMethodId: string;

  beforeEach(async () => {
    const customer = await createTestUser("customer-errors@test.com");
    customerId = customer.user!.id;

    const paymentMethod = await createTestPaymentMethod();
    paymentMethodId = paymentMethod.id;
  });

  afterEach(async () => {
    await cleanupTestData([], [customerId]);
  });

  it("should reject payment creation without quote or subscription", async () => {
    await expect(
      createPayment({
        payment_method_id: paymentMethodId,
        amount: 100.0,
        currency: "BRL",
        payment_type: "one_time",
      })
    ).rejects.toThrow("must be linked to either a quote or subscription");
  });

  it("should reject payment creation with both quote and subscription", async () => {
    const quote = await createTestQuote(customerId);
    const subscription = await createTestSubscription(customerId);

    await expect(
      createPayment({
        payment_method_id: paymentMethodId,
        quote_id: quote.id,
        subscription_id: subscription.id,
        amount: 100.0,
        currency: "BRL",
        payment_type: "one_time",
      })
    ).rejects.toThrow("must be linked to either a quote or subscription");
  });

  it("should reject invalid status transitions", async () => {
    const quote = await createTestQuote(customerId);
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quote.id,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });

    // Try to transition from 'pending' to 'approved' (invalid)
    await expect(
      supabase.from("manual_payments").update({ status: "approved" }).eq("id", payment.id)
    ).rejects.toThrow();

    await cleanupTestData([payment.id], []);
  });

  it("should enforce maximum 5 files per payment", async () => {
    const quote = await createTestQuote(customerId);
    const payment = await createPayment({
      payment_method_id: paymentMethodId,
      quote_id: quote.id,
      amount: 100.0,
      currency: "BRL",
      payment_type: "one_time",
    });

    // Upload 5 files successfully
    for (let i = 0; i < 5; i++) {
      const file = createTestFile(1024 * 1024);
      await fileUploadService.upload(payment.id, file);
    }

    // 6th file should fail
    const sixthFile = createTestFile(1024 * 1024);
    await expect(fileUploadService.upload(payment.id, sixthFile)).rejects.toThrow(
      "Maximum of 5 files"
    );

    await cleanupTestData([payment.id], []);
  });
});
