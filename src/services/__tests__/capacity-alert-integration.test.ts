// @ts-nocheck
/**
 * Capacity Alert Integration Tests
 * 
 * Integration tests for capacity alert triggering when capacity increases.
 * These tests verify the complete flow from capacity reservation to alert triggering.
 * 
 * Requirements: 16.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  configureAlert,
  getAlertStatus,
  resetAlert
} from '../capacity-alert-service';
import {
  reserveCapacity,
  getCapacityUsage
} from '../capacity-service';

describe('Capacity Alert Integration', () => {
  let testCycleId: string;

  beforeEach(async () => {
    // Create a test cycle for integration testing
    const { data: cycle, error } = await supabase
      .from('cycles')
      .insert({
        cycle_number: 1,
        month: 3,
        year: 2026,
        open_start: new Date('2026-03-01T00:00:00Z').toISOString(),
        open_end: new Date('2026-03-15T23:59:59Z').toISOString(),
        production_start: new Date('2026-03-16T00:00:00Z').toISOString(),
        production_end: new Date('2026-03-30T23:59:59Z').toISOString(),
        shipping_date: '2026-04-05',
        status: 'open',
        capacity_max: 100,
        capacity_current: 0,
        alert_threshold: 80
      })
      .select()
      .single();

    if (error) throw error;
    testCycleId = cycle.id;

    // Reset alert to ensure clean state
    await resetAlert(testCycleId);
  });

  it('should trigger alert when capacity reaches threshold', async () => {
    // Configure alert
    await configureAlert(testCycleId, {
      threshold: 80,
      email: 'test@ordax.com',
      sms: null
    });

    // Check initial status
    let status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(false);
    expect(status.currentPercentage).toBe(0);

    // Reserve capacity to reach 80%
    await reserveCapacity(testCycleId, 80, 'test-subscription-1');

    // Check capacity usage
    const usage = await getCapacityUsage(testCycleId);
    expect(usage.percentage).toBe(80);

    // Check alert status - should be triggered
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.triggeredAt).not.toBeNull();
    expect(status.currentPercentage).toBe(80);
  });

  it('should not trigger alert when below threshold', async () => {
    // Configure alert
    await configureAlert(testCycleId, {
      threshold: 80,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve capacity below threshold (70%)
    await reserveCapacity(testCycleId, 70, 'test-subscription-1');

    // Check alert status - should not be triggered
    const status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(false);
    expect(status.currentPercentage).toBe(70);
  });

  it('should trigger alert when capacity exceeds threshold', async () => {
    // Configure alert
    await configureAlert(testCycleId, {
      threshold: 75,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve capacity above threshold (85%)
    await reserveCapacity(testCycleId, 85, 'test-subscription-1');

    // Check alert status - should be triggered
    const status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.currentPercentage).toBe(85);
  });

  it('should only trigger alert once per cycle', async () => {
    // Configure alert
    await configureAlert(testCycleId, {
      threshold: 80,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve capacity to trigger alert
    await reserveCapacity(testCycleId, 80, 'test-subscription-1');

    // Get first trigger time
    let status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    const firstTriggerTime = status.triggeredAt;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reserve more capacity
    await reserveCapacity(testCycleId, 5, 'test-subscription-2');

    // Check alert status - should still show first trigger time
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.triggeredAt).toEqual(firstTriggerTime);
  });

  it('should allow alert to trigger again after reset', async () => {
    // Configure alert
    await configureAlert(testCycleId, {
      threshold: 80,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve capacity to trigger alert
    await reserveCapacity(testCycleId, 80, 'test-subscription-1');

    // Verify alert triggered
    let status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);

    // Reset alert
    await resetAlert(testCycleId);

    // Verify alert is reset
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(false);
    expect(status.triggeredAt).toBeNull();

    // Reserve more capacity
    await reserveCapacity(testCycleId, 5, 'test-subscription-2');

    // Alert should trigger again
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.triggeredAt).not.toBeNull();
  });

  it('should work with different threshold values', async () => {
    // Test with 90% threshold
    await configureAlert(testCycleId, {
      threshold: 90,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve 85% - should not trigger
    await reserveCapacity(testCycleId, 85, 'test-subscription-1');
    let status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(false);

    // Reserve 5% more to reach 90% - should trigger
    await reserveCapacity(testCycleId, 5, 'test-subscription-2');
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
  });

  it('should handle edge case of 100% capacity', async () => {
    // Configure alert at 100%
    await configureAlert(testCycleId, {
      threshold: 100,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve 99% - should not trigger
    await reserveCapacity(testCycleId, 99, 'test-subscription-1');
    let status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(false);

    // Reserve 1% more to reach 100% - should trigger
    await reserveCapacity(testCycleId, 1, 'test-subscription-2');
    status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.currentPercentage).toBe(100);
  });

  it('should handle edge case of 1% threshold', async () => {
    // Configure alert at 1%
    await configureAlert(testCycleId, {
      threshold: 1,
      email: 'test@ordax.com',
      sms: null
    });

    // Reserve 1% - should trigger immediately
    await reserveCapacity(testCycleId, 1, 'test-subscription-1');
    const status = await getAlertStatus(testCycleId);
    expect(status.triggered).toBe(true);
    expect(status.currentPercentage).toBe(1);
  });
});
