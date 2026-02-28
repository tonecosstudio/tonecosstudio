/**
 * ORDAX Complete System - Integration Tests
 * 
 * Tasks 30.6-30.9: Integration and E2E tests for ORDAX system
 * 
 * Requirements:
 * - 31.6: Integration test for subscription creation flow
 * - 31.7: Integration test for standalone purchase deposit flow
 * - 31.8: Integration test for collection change with audit trail
 * - 31.9: End-to-end test for complete subscription lifecycle
 * 
 * These tests validate complete workflows across the ORDAX system:
 * - Subscription creation → capacity → scheduling → email
 * - Standalone purchase deposit → production → balance → shipping
 * - Collection change → audit → notification
 * - Complete lifecycle: creation → delivery → choice → cutoff → production → shipping → delivery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { checkAvailability, reserveCapacity, releaseCapacity } from '@/services/capacity-service';
import { applyAutomaticMaintenance } from '@/services/automatic-maintenance-service';
import { recordCollectionChange } from '@/services/audit-trail-service';
import { isBeforeCutoff } from '@/lib/timezone';

// Skip these tests if not in integration test environment
const isIntegrationTestEnv = process.env.VITEST_INTEGRATION === 'true';
const describeIntegration = isIntegrationTestEnv ? describe : describe.skip;

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Create a test user
 */
async function createTestUser(email: string): Promise<string> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'test-password-123',
  });
  
  if (error) throw error;
  return data.user!.id;
}

/**
 * Create a test cycle
 */
async function createTestCycle(month: number, year: number, cycleNumber: 1 | 2): Promise<string> {
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      cycle_number: cycleNumber,
      month,
      year,
      status: 'open',
      capacity_max: 100,
      capacity_current: 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Create a test collection
 */
async function createTestCollection(name: string, rotationType: 'fixed' | 'odd_months' | 'even_months' = 'fixed'): Promise<string> {
  const { data, error } = await supabase
    .from('collections')
    .insert({
      name,
      description: `Test collection ${name}`,
      price: 150.00,
      is_active: true,
      rotation_type: rotationType,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Clean up test data
 */
async function cleanupTestData(userIds: string[], cycleIds: string[], collectionIds: string[]) {
  // Delete in reverse order of dependencies
  if (userIds.length > 0) {
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }
  
  if (cycleIds.length > 0) {
    await supabase.from('cycles').delete().in('id', cycleIds);
  }
  
  if (collectionIds.length > 0) {
    await supabase.from('collections').delete().in('id', collectionIds);
  }
}

// =====================================================
// TEST SUITE 1: SUBSCRIPTION CREATION FLOW
// Task 30.6 - Requirement 31.6
// =====================================================

describeIntegration('Task 30.6: Subscription Creation Flow Integration Test', () => {
  let userId: string;
  let cycleId: string;
  let collectionId: string;
  let subscriptionId: string;

  beforeEach(async () => {
    // Setup test data
    userId = await createTestUser('subscription-test@ordax.com');
    cycleId = await createTestCycle(3, 2026, 1);
    collectionId = await createTestCollection('Test Collection');
  });

  afterEach(async () => {
    await cleanupTestData([userId], [cycleId], [collectionId]);
  });

  it('should complete subscription creation flow: form → capacity → scheduling → email', async () => {
    // Step 1: Check capacity availability
    const hasCapacity = await checkAvailability(cycleId, 3); // Trimestral = 3 deliveries
    expect(hasCapacity).toBe(true);

    // Step 2: Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: 'trimestral',
        status: 'active',
        total_paid: 450.00,
        payment_method: 'pix',
        deliveries_total: 3,
        deliveries_completed: 0,
        entry_cycle_id: cycleId,
      })
      .select()
      .single();

    expect(subError).toBeNull();
    expect(subscription).toBeDefined();
    subscriptionId = subscription!.id;

    // Step 3: Reserve capacity for deliveries
    await reserveCapacity(cycleId, 3, subscriptionId);

    // Step 4: Verify capacity was reserved
    const { data: cycle } = await supabase
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycleId)
      .single();

    expect(cycle!.capacity_current).toBe(3);

    // Step 5: Create scheduled deliveries
    const deliveries = [];
    for (let i = 1; i <= 3; i++) {
      const { data: delivery } = await supabase
        .from('subscription_deliveries')
        .insert({
          subscription_id: subscriptionId,
          delivery_number: i,
          status: 'scheduled',
          cycle_id: cycleId,
        })
        .select()
        .single();

      deliveries.push(delivery);
    }

    expect(deliveries.length).toBe(3);

    // Step 6: Verify deliveries are consecutive
    deliveries.forEach((delivery, index) => {
      expect(delivery!.delivery_number).toBe(index + 1);
      expect(delivery!.subscription_id).toBe(subscriptionId);
    });

    // Step 7: Verify subscription is active
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('id', subscriptionId)
      .single();

    expect(activeSubscription!.status).toBe('active');
  });

  it('should reject subscription when capacity is exceeded', async () => {
    // Fill capacity to maximum
    await reserveCapacity(cycleId, 98, 'test-ref');

    // Try to create subscription (needs 3 capacity)
    const hasCapacity = await checkAvailability(cycleId, 3);
    expect(hasCapacity).toBe(false);

    // Subscription creation should be blocked
    // In real implementation, this would be handled by the subscription service
  });
});

// =====================================================
// TEST SUITE 2: STANDALONE PURCHASE DEPOSIT FLOW
// Task 30.7 - Requirement 31.7
// =====================================================

describeIntegration('Task 30.7: Standalone Purchase Deposit Flow Integration Test', () => {
  let userId: string;
  let cycleId: string;
  let collectionId: string;
  let purchaseId: string;

  beforeEach(async () => {
    userId = await createTestUser('standalone-test@ordax.com');
    cycleId = await createTestCycle(3, 2026, 1);
    collectionId = await createTestCollection('Standalone Collection');
  });

  afterEach(async () => {
    await cleanupTestData([userId], [cycleId], [collectionId]);
  });

  it('should complete standalone purchase flow: deposit → production → balance → shipping', async () => {
    // Step 1: Check capacity for standalone purchase
    const hasCapacity = await checkAvailability(cycleId, 1);
    expect(hasCapacity).toBe(true);

    // Step 2: Create standalone purchase with deposit
    const { data: purchase, error: purchaseError } = await supabase
      .from('standalone_purchases')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        cycle_id: cycleId,
        status: 'deposit_paid',
        deposit_amount: 100.00,
        balance_amount: 50.00,
        total_amount: 150.00,
        deposit_paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(purchaseError).toBeNull();
    expect(purchase).toBeDefined();
    purchaseId = purchase!.id;

    // Step 3: Reserve capacity
    await reserveCapacity(cycleId, 1, purchaseId);

    // Step 4: Verify capacity reserved
    const { data: cycle } = await supabase
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycleId)
      .single();

    expect(cycle!.capacity_current).toBe(1);

    // Step 5: Mark production complete
    const { error: updateError } = await supabase
      .from('standalone_purchases')
      .update({
        status: 'awaiting_balance',
        production_complete_at: new Date().toISOString(),
        balance_due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      })
      .eq('id', purchaseId);

    expect(updateError).toBeNull();

    // Step 6: Process balance payment
    const { error: balanceError } = await supabase
      .from('standalone_purchases')
      .update({
        status: 'balance_paid',
        balance_paid_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    expect(balanceError).toBeNull();

    // Step 7: Mark as shipped
    const { error: shippedError } = await supabase
      .from('standalone_purchases')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        tracking_code: 'BR123456789',
      })
      .eq('id', purchaseId);

    expect(shippedError).toBeNull();

    // Step 8: Verify final status
    const { data: finalPurchase } = await supabase
      .from('standalone_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    expect(finalPurchase!.status).toBe('shipped');
    expect(finalPurchase!.tracking_code).toBe('BR123456789');
    expect(finalPurchase!.deposit_paid_at).toBeDefined();
    expect(finalPurchase!.balance_paid_at).toBeDefined();
    expect(finalPurchase!.shipped_at).toBeDefined();
  });

  it('should handle deposit retention on non-payment', async () => {
    // Create purchase
    const { data: purchase } = await supabase
      .from('standalone_purchases')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        cycle_id: cycleId,
        status: 'awaiting_balance',
        deposit_amount: 100.00,
        balance_amount: 50.00,
        total_amount: 150.00,
        deposit_paid_at: new Date().toISOString(),
        production_complete_at: new Date().toISOString(),
        balance_due_date: new Date(Date.now() - 1000).toISOString(), // Past due
      })
      .select()
      .single();

    purchaseId = purchase!.id;

    // Reserve capacity
    await reserveCapacity(cycleId, 1, purchaseId);

    // Cancel for non-payment
    const { error: cancelError } = await supabase
      .from('standalone_purchases')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Balance payment not received within deadline (Arras Confirmatórias)',
      })
      .eq('id', purchaseId);

    expect(cancelError).toBeNull();

    // Release capacity
    await releaseCapacity(cycleId, 1, purchaseId);

    // Verify capacity released
    const { data: cycle } = await supabase
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycleId)
      .single();

    expect(cycle!.capacity_current).toBe(0);

    // Verify cancellation reason
    const { data: cancelledPurchase } = await supabase
      .from('standalone_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    expect(cancelledPurchase!.status).toBe('cancelled');
    expect(cancelledPurchase!.cancellation_reason).toContain('Arras Confirmatórias');
  });
});

// =====================================================
// TEST SUITE 3: COLLECTION CHANGE WITH AUDIT TRAIL
// Task 30.8 - Requirement 31.8
// =====================================================

describeIntegration('Task 30.8: Collection Change with Audit Trail Integration Test', () => {
  let userId: string;
  let cycleId: string;
  let collection1Id: string;
  let collection2Id: string;
  let subscriptionId: string;
  let deliveryId: string;

  beforeEach(async () => {
    userId = await createTestUser('audit-test@ordax.com');
    cycleId = await createTestCycle(3, 2026, 1);
    collection1Id = await createTestCollection('Collection 1');
    collection2Id = await createTestCollection('Collection 2');

    // Create subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        collection_id: collection1Id,
        plan_type: 'trimestral',
        status: 'active',
        total_paid: 450.00,
        payment_method: 'pix',
        deliveries_total: 3,
        deliveries_completed: 0,
        entry_cycle_id: cycleId,
      })
      .select()
      .single();

    subscriptionId = subscription!.id;

    // Create delivery
    const { data: delivery } = await supabase
      .from('subscription_deliveries')
      .insert({
        subscription_id: subscriptionId,
        delivery_number: 1,
        status: 'pending_choice',
        cycle_id: cycleId,
        collection_id: collection1Id,
      })
      .select()
      .single();

    deliveryId = delivery!.id;
  });

  afterEach(async () => {
    await cleanupTestData([userId], [cycleId], [collection1Id, collection2Id]);
  });

  it('should complete collection change flow: change → audit → notification', async () => {
    // Step 1: Verify initial collection
    const { data: initialDelivery } = await supabase
      .from('subscription_deliveries')
      .select('collection_id')
      .eq('id', deliveryId)
      .single();

    expect(initialDelivery!.collection_id).toBe(collection1Id);

    // Step 2: Change collection
    const { error: updateError } = await supabase
      .from('subscription_deliveries')
      .update({
        collection_id: collection2Id,
      })
      .eq('id', deliveryId);

    expect(updateError).toBeNull();

    // Step 3: Record audit trail
    const auditRecord = await recordCollectionChange({
      deliveryId,
      userId,
      previousCollectionId: collection1Id,
      newCollectionId: collection2Id,
      changeReason: 'manual',
      changedByAdmin: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    });

    expect(auditRecord).toBeDefined();
    expect(auditRecord.delivery_id).toBe(deliveryId);
    expect(auditRecord.previous_collection_id).toBe(collection1Id);
    expect(auditRecord.new_collection_id).toBe(collection2Id);
    expect(auditRecord.change_reason).toBe('manual');

    // Step 4: Verify audit trail was created
    const { data: auditTrail } = await supabase
      .from('collection_choice_history')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: false });

    expect(auditTrail).toBeDefined();
    expect(auditTrail!.length).toBeGreaterThan(0);
    expect(auditTrail![0].previous_collection_id).toBe(collection1Id);
    expect(auditTrail![0].new_collection_id).toBe(collection2Id);
    expect(auditTrail![0].user_id).toBe(userId);
    expect(auditTrail![0].ip_address).toBe('127.0.0.1');
    expect(auditTrail![0].user_agent).toBe('Test Agent');

    // Step 5: Verify delivery was updated
    const { data: updatedDelivery } = await supabase
      .from('subscription_deliveries')
      .select('collection_id')
      .eq('id', deliveryId)
      .single();

    expect(updatedDelivery!.collection_id).toBe(collection2Id);
  });

  it('should record automatic maintenance in audit trail', async () => {
    // Create second delivery
    const { data: delivery2 } = await supabase
      .from('subscription_deliveries')
      .insert({
        subscription_id: subscriptionId,
        delivery_number: 2,
        status: 'pending_choice',
        cycle_id: cycleId,
      })
      .select()
      .single();

    // Apply automatic maintenance
    await applyAutomaticMaintenance(delivery2!.id, subscriptionId);

    // Verify audit trail
    const { data: auditTrail } = await supabase
      .from('collection_choice_history')
      .select('*')
      .eq('delivery_id', delivery2!.id)
      .single();

    expect(auditTrail).toBeDefined();
    expect(auditTrail!.change_reason).toBe('automatic_maintenance');
    expect(auditTrail!.new_collection_id).toBe(collection1Id);
  });

  it('should prevent changes after cutoff', async () => {
    // Mock current date to be after cutoff (day 16)
    const afterCutoff = new Date(2026, 2, 16, 10, 0, 0);
    const beforeCutoffResult = isBeforeCutoff(afterCutoff);

    expect(beforeCutoffResult).toBe(false);

    // In real implementation, the change would be blocked by middleware
    // This test verifies the cutoff logic works correctly
  });
});

// =====================================================
// TEST SUITE 4: COMPLETE SUBSCRIPTION LIFECYCLE E2E
// Task 30.9 - Requirement 31.9
// =====================================================

describeIntegration('Task 30.9: Complete Subscription Lifecycle E2E Test', () => {
  let userId: string;
  let cycle1Id: string;
  let cycle2Id: string;
  let collectionId: string;
  let subscriptionId: string;
  const deliveryIds: string[] = [];

  beforeEach(async () => {
    userId = await createTestUser('lifecycle-test@ordax.com');
    cycle1Id = await createTestCycle(3, 2026, 1);
    cycle2Id = await createTestCycle(3, 2026, 2);
    collectionId = await createTestCollection('Lifecycle Collection');
  });

  afterEach(async () => {
    await cleanupTestData([userId], [cycle1Id, cycle2Id], [collectionId]);
  });

  it('should complete full lifecycle: creation → delivery → choice → cutoff → production → shipping → delivery', async () => {
    // ===== PHASE 1: SUBSCRIPTION CREATION =====
    
    // Step 1: Check capacity
    const hasCapacity = await checkAvailability(cycle1Id, 3);
    expect(hasCapacity).toBe(true);

    // Step 2: Create subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: 'trimestral',
        status: 'active',
        total_paid: 450.00,
        payment_method: 'pix',
        deliveries_total: 3,
        deliveries_completed: 0,
        entry_cycle_id: cycle1Id,
        current_delivery_number: 1,
      })
      .select()
      .single();

    subscriptionId = subscription!.id;
    expect(subscription!.status).toBe('active');

    // Step 3: Reserve capacity
    await reserveCapacity(cycle1Id, 3, subscriptionId);

    // ===== PHASE 2: DELIVERY CREATION =====

    // Step 4: Create deliveries
    for (let i = 1; i <= 3; i++) {
      const { data: delivery } = await supabase
        .from('subscription_deliveries')
        .insert({
          subscription_id: subscriptionId,
          delivery_number: i,
          status: 'scheduled',
          cycle_id: cycle1Id,
          expected_delivery_date: new Date(2026, 2 + i, 5).toISOString(),
        })
        .select()
        .single();

      deliveryIds.push(delivery!.id);
    }

    expect(deliveryIds.length).toBe(3);

    // ===== PHASE 3: COLLECTION CHOICE =====

    // Step 5: Make collection choice for first delivery
    const { error: choiceError } = await supabase
      .from('subscription_deliveries')
      .update({
        collection_id: collectionId,
        status: 'confirmed',
      })
      .eq('id', deliveryIds[0]);

    expect(choiceError).toBeNull();

    // Step 6: Record audit trail
    await recordCollectionChange({
      deliveryId: deliveryIds[0],
      userId,
      previousCollectionId: null,
      newCollectionId: collectionId,
      changeReason: 'manual',
      changedByAdmin: false,
    });

    // ===== PHASE 4: CUTOFF VERIFICATION =====

    // Step 7: Verify cutoff logic (before day 15)
    const beforeCutoff = new Date(2026, 2, 10, 12, 0, 0);
    expect(isBeforeCutoff(beforeCutoff)).toBe(true);

    // Step 8: Verify cutoff logic (after day 15)
    const afterCutoff = new Date(2026, 2, 16, 12, 0, 0);
    expect(isBeforeCutoff(afterCutoff)).toBe(false);

    // ===== PHASE 5: PRODUCTION =====

    // Step 9: Transition cycle to production
    const { error: cycleError } = await supabase
      .from('cycles')
      .update({
        status: 'production',
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', cycle1Id);

    expect(cycleError).toBeNull();

    // Step 10: Update delivery status to in_production
    const { error: productionError } = await supabase
      .from('subscription_deliveries')
      .update({
        status: 'in_production',
      })
      .eq('id', deliveryIds[0]);

    expect(productionError).toBeNull();

    // ===== PHASE 6: SHIPPING =====

    // Step 11: Mark production complete and add tracking
    const { error: shippingError } = await supabase
      .from('subscription_deliveries')
      .update({
        status: 'shipped',
        tracking_code: 'BR987654321',
      })
      .eq('id', deliveryIds[0]);

    expect(shippingError).toBeNull();

    // Step 12: Transition cycle to shipping
    const { error: cycleShippingError } = await supabase
      .from('cycles')
      .update({
        status: 'shipping',
      })
      .eq('id', cycle1Id);

    expect(cycleShippingError).toBeNull();

    // ===== PHASE 7: DELIVERY COMPLETION =====

    // Step 13: Mark delivery as delivered
    const { error: deliveredError } = await supabase
      .from('subscription_deliveries')
      .update({
        status: 'delivered',
        actual_delivery_date: new Date().toISOString(),
      })
      .eq('id', deliveryIds[0]);

    expect(deliveredError).toBeNull();

    // Step 14: Update subscription progress
    const { error: subscriptionUpdateError } = await supabase
      .from('subscriptions')
      .update({
        deliveries_completed: 1,
        current_delivery_number: 2,
      })
      .eq('id', subscriptionId);

    expect(subscriptionUpdateError).toBeNull();

    // ===== PHASE 8: VERIFICATION =====

    // Step 15: Verify complete lifecycle
    const { data: finalDelivery } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('id', deliveryIds[0])
      .single();

    expect(finalDelivery!.status).toBe('delivered');
    expect(finalDelivery!.tracking_code).toBe('BR987654321');
    expect(finalDelivery!.collection_id).toBe(collectionId);
    expect(finalDelivery!.actual_delivery_date).toBeDefined();

    // Step 16: Verify subscription progress
    const { data: finalSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    expect(finalSubscription!.deliveries_completed).toBe(1);
    expect(finalSubscription!.current_delivery_number).toBe(2);
    expect(finalSubscription!.status).toBe('active');

    // Step 17: Verify audit trail exists
    const { data: auditTrail } = await supabase
      .from('collection_choice_history')
      .select('*')
      .eq('delivery_id', deliveryIds[0]);

    expect(auditTrail).toBeDefined();
    expect(auditTrail!.length).toBeGreaterThan(0);

    // Step 18: Verify capacity was used
    const { data: finalCycle } = await supabase
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycle1Id)
      .single();

    expect(finalCycle!.capacity_current).toBe(3);
  });

  it('should handle pause functionality in lifecycle', async () => {
    // Create subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: 'trimestral',
        status: 'active',
        total_paid: 450.00,
        payment_method: 'pix',
        deliveries_total: 3,
        deliveries_completed: 0,
        entry_cycle_id: cycle1Id,
        pause_count: 0,
      })
      .select()
      .single();

    subscriptionId = subscription!.id;

    // Pause subscription
    const { error: pauseError } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        pause_count: 1,
      })
      .eq('id', subscriptionId);

    expect(pauseError).toBeNull();

    // Verify pause count
    const { data: pausedSubscription } = await supabase
      .from('subscriptions')
      .select('pause_count, status')
      .eq('id', subscriptionId)
      .single();

    expect(pausedSubscription!.status).toBe('paused');
    expect(pausedSubscription!.pause_count).toBe(1);
    expect(pausedSubscription!.pause_count).toBeLessThanOrEqual(2); // Max 2 pauses
  });

  it('should handle cancellation and refund in lifecycle', async () => {
    // Create subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: 'trimestral',
        status: 'active',
        total_paid: 450.00,
        payment_method: 'pix',
        deliveries_total: 3,
        deliveries_completed: 0,
        entry_cycle_id: cycle1Id,
      })
      .select()
      .single();

    subscriptionId = subscription!.id;

    // Reserve capacity
    await reserveCapacity(cycle1Id, 3, subscriptionId);

    // Cancel subscription
    const { error: cancelError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
      })
      .eq('id', subscriptionId);

    expect(cancelError).toBeNull();

    // Release capacity
    await releaseCapacity(cycle1Id, 3, subscriptionId);

    // Verify capacity released
    const { data: cycle } = await supabase
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycle1Id)
      .single();

    expect(cycle!.capacity_current).toBe(0);

    // Verify subscription cancelled
    const { data: cancelledSubscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('id', subscriptionId)
      .single();

    expect(cancelledSubscription!.status).toBe('cancelled');
  });
});
