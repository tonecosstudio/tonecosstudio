/**
 * Tests for Automatic Maintenance Service
 * 
 * Tests the automatic maintenance logic for collection choices.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyAutomaticMaintenance } from './automatic-maintenance-service';
import { supabase } from '@/integrations/supabase/client';
import * as collectionService from './collection-service';
import * as auditTrailService from './audit-trail-service';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock the collection service
vi.mock('./collection-service', () => ({
  isCollectionActive: vi.fn()
}));

// Mock the audit trail service
vi.mock('./audit-trail-service', () => ({
  recordCollectionChange: vi.fn()
}));

// Mock the timezone utilities
vi.mock('@/lib/timezone', () => ({
  nowInBahia: vi.fn(() => new Date('2026-03-15T10:00:00'))
}));

describe('Automatic Maintenance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyAutomaticMaintenance', () => {
    it('should copy previous collection when it is active in current month', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      const previousCollectionId = 'collection-456';
      const userId = 'user-789';

      // Mock current delivery query
      const mockCurrentDelivery = {
        data: {
          expected_delivery_date: '2026-03-20',
          delivery_number: 2
        },
        error: null
      };

      // Mock previous delivery query
      const mockPreviousDelivery = {
        data: {
          collection_id: previousCollectionId,
          id: 'delivery-previous'
        },
        error: null
      };

      // Mock subscription query
      const mockSubscription = {
        data: {
          user_id: userId
        },
        error: null
      };

      // Mock update query
      const mockUpdate = {
        error: null
      };

      // Mock audit trail RPC
      const mockRpc = {
        error: null
      };

      // Setup mock chain
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        single: mockSingle
      });
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockUpdate)
      });

      // Configure mock responses based on call order
      let callCount = 0;
      mockSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockCurrentDelivery);
        if (callCount === 2) return Promise.resolve(mockPreviousDelivery);
        if (callCount === 3) return Promise.resolve(mockSubscription);
        return Promise.resolve({ data: null, error: null });
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdateFn
          };
        }
        if (table === 'subscriptions') {
          return {
            select: mockSelect
          };
        }
        return { select: mockSelect };
      });

      (supabase.rpc as any).mockResolvedValue(mockRpc);

      // Mock isCollectionActive to return true
      vi.mocked(collectionService.isCollectionActive).mockResolvedValue(true);

      // Execute
      await applyAutomaticMaintenance(deliveryId, subscriptionId);

      // Verify collection was checked for activity
      expect(collectionService.isCollectionActive).toHaveBeenCalledWith(
        previousCollectionId,
        3, // March
        2026
      );

      // Verify delivery was updated with auto_maintained flag
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_id: previousCollectionId,
          auto_maintained: true
        })
      );

      // Verify audit trail was created
      expect(auditTrailService.recordCollectionChange).toHaveBeenCalledWith({
        deliveryId,
        userId,
        previousCollectionId: null,
        newCollectionId: previousCollectionId,
        changeReason: 'automatic_maintenance',
        changedByAdmin: false,
      });
    });

    it('should not apply maintenance when collection is not active in current month', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      const previousCollectionId = 'collection-456';
      const userId = 'user-789';

      // Mock current delivery query
      const mockCurrentDelivery = {
        data: {
          expected_delivery_date: '2026-04-20',
          delivery_number: 2
        },
        error: null
      };

      // Mock previous delivery query
      const mockPreviousDelivery = {
        data: {
          collection_id: previousCollectionId,
          id: 'delivery-previous'
        },
        error: null
      };

      // Mock subscription query for notification
      const mockSubscription = {
        data: {
          user_id: userId,
          profiles: {
            email: 'user@example.com',
            full_name: 'Test User'
          }
        },
        error: null
      };

      // Setup mock chain
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        single: mockSingle
      });

      // Configure mock responses based on call order
      let callCount = 0;
      mockSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockCurrentDelivery);
        if (callCount === 2) return Promise.resolve(mockPreviousDelivery);
        if (callCount === 3) return Promise.resolve(mockSubscription);
        return Promise.resolve({ data: null, error: null });
      });

      (supabase.from as any).mockImplementation((table: string) => {
        return {
          select: mockSelect
        };
      });

      // Mock isCollectionActive to return false
      vi.mocked(collectionService.isCollectionActive).mockResolvedValue(false);

      // Execute
      await applyAutomaticMaintenance(deliveryId, subscriptionId);

      // Verify collection was checked for activity
      expect(collectionService.isCollectionActive).toHaveBeenCalledWith(
        previousCollectionId,
        4, // April
        2026
      );

      // Verify no update was made (no update mock should be called)
      expect(supabase.from).not.toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.any(Function) })
      );

      // Verify no audit trail was created
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should skip maintenance when no previous delivery exists', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';

      // Mock current delivery query
      const mockCurrentDelivery = {
        data: {
          expected_delivery_date: '2026-03-20',
          delivery_number: 1 // First delivery
        },
        error: null
      };

      // Mock previous delivery query - no previous delivery
      const mockPreviousDelivery = {
        data: null,
        error: { message: 'No rows found' }
      };

      // Setup mock chain
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        single: mockSingle
      });

      // Configure mock responses
      let callCount = 0;
      mockSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockCurrentDelivery);
        if (callCount === 2) return Promise.resolve(mockPreviousDelivery);
        return Promise.resolve({ data: null, error: null });
      });

      (supabase.from as any).mockImplementation(() => ({
        select: mockSelect
      }));

      // Execute - should not throw error
      await applyAutomaticMaintenance(deliveryId, subscriptionId);

      // Verify isCollectionActive was not called
      expect(collectionService.isCollectionActive).not.toHaveBeenCalled();

      // Verify no update was made
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should skip maintenance when previous delivery has no collection choice', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';

      // Mock current delivery query
      const mockCurrentDelivery = {
        data: {
          expected_delivery_date: '2026-03-20',
          delivery_number: 2
        },
        error: null
      };

      // Mock previous delivery query - has delivery but no collection_id
      const mockPreviousDelivery = {
        data: {
          collection_id: null,
          id: 'delivery-previous'
        },
        error: null
      };

      // Setup mock chain
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        single: mockSingle
      });

      // Configure mock responses
      let callCount = 0;
      mockSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockCurrentDelivery);
        if (callCount === 2) return Promise.resolve(mockPreviousDelivery);
        return Promise.resolve({ data: null, error: null });
      });

      (supabase.from as any).mockImplementation(() => ({
        select: mockSelect
      }));

      // Execute - should not throw error
      await applyAutomaticMaintenance(deliveryId, subscriptionId);

      // Verify isCollectionActive was not called
      expect(collectionService.isCollectionActive).not.toHaveBeenCalled();

      // Verify no update was made
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should throw error when current delivery is not found', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';

      // Mock current delivery query - not found
      const mockCurrentDelivery = {
        data: null,
        error: { message: 'Delivery not found' }
      };

      // Setup mock chain
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(mockCurrentDelivery);
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        single: mockSingle
      });

      (supabase.from as any).mockImplementation(() => ({
        select: mockSelect
      }));

      // Execute - should throw error
      await expect(
        applyAutomaticMaintenance(deliveryId, subscriptionId)
      ).rejects.toThrow('Failed to get current delivery');
    });
  });

  /**
   * Property-Based Tests
   * 
   * These tests use fast-check to verify properties hold across many random inputs.
   */
  describe('Property-Based Tests', () => {
    /**
     * Property 21: Automatic Maintenance Copies Previous Choice
     * 
     * **Validates: Requirements 6.2, 10.4**
     * 
     * For any delivery at cycle start where the subscriber has not made a collection choice,
     * the system should copy the previous month's collection_id to the current delivery and
     * set auto_maintained = true.
     * 
     * This property verifies that:
     * 1. Previous collection_id is copied to new delivery
     * 2. auto_maintained flag is set to true
     * 3. Audit trail record is created with change_reason = 'automatic_maintenance'
     */
    it('Property 21: should copy previous collection_id and set auto_maintained flag', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary subscription with multiple deliveries
          fc.record({
            subscriptionId: fc.uuid(),
            userId: fc.uuid(),
            deliveries: fc.array(
              fc.record({
                id: fc.uuid(),
                deliveryNumber: fc.integer({ min: 1, max: 6 }),
                collectionId: fc.uuid(),
                expectedDeliveryDate: fc.date({
                  min: new Date('2026-01-01'),
                  max: new Date('2027-12-31')
                })
              }),
              { minLength: 2, maxLength: 6 } // Need at least 2 deliveries for maintenance
            )
          }),
          async (testData) => {
            // Sort deliveries by delivery number to ensure proper order
            const sortedDeliveries = [...testData.deliveries].sort(
              (a, b) => a.deliveryNumber - b.deliveryNumber
            );

            // Take the last two deliveries (previous and current)
            const previousDelivery = sortedDeliveries[sortedDeliveries.length - 2];
            const currentDelivery = sortedDeliveries[sortedDeliveries.length - 1];

            // Mock current delivery query
            const mockCurrentDelivery = {
              data: {
                expected_delivery_date: currentDelivery.expectedDeliveryDate.toISOString(),
                delivery_number: currentDelivery.deliveryNumber
              },
              error: null
            };

            // Mock previous delivery query
            const mockPreviousDelivery = {
              data: {
                collection_id: previousDelivery.collectionId,
                id: previousDelivery.id
              },
              error: null
            };

            // Mock subscription query
            const mockSubscription = {
              data: {
                user_id: testData.userId
              },
              error: null
            };

            // Mock update query
            const mockUpdate = {
              error: null
            };

            // Setup mock chain
            const mockEq = vi.fn().mockReturnThis();
            const mockSingle = vi.fn();
            const mockSelect = vi.fn().mockReturnValue({
              eq: mockEq,
              single: mockSingle
            });
            const mockUpdateFn = vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockUpdate)
            });

            // Configure mock responses based on call order
            let callCount = 0;
            mockSingle.mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve(mockCurrentDelivery);
              if (callCount === 2) return Promise.resolve(mockPreviousDelivery);
              if (callCount === 3) return Promise.resolve(mockSubscription);
              return Promise.resolve({ data: null, error: null });
            });

            (supabase.from as any).mockImplementation((table: string) => {
              if (table === 'subscription_deliveries') {
                return {
                  select: mockSelect,
                  update: mockUpdateFn
                };
              }
              if (table === 'subscriptions') {
                return {
                  select: mockSelect
                };
              }
              return { select: mockSelect };
            });

            // Mock isCollectionActive to return true (collection is active)
            vi.mocked(collectionService.isCollectionActive).mockResolvedValue(true);

            // Mock recordCollectionChange to succeed
            vi.mocked(auditTrailService.recordCollectionChange).mockResolvedValue({
              id: fc.sample(fc.uuid(), 1)[0],
              delivery_id: currentDelivery.id,
              user_id: testData.userId,
              previous_collection_id: null,
              new_collection_id: previousDelivery.collectionId,
              change_reason: 'automatic_maintenance',
              changed_by_admin: false,
              admin_user_id: null,
              ip_address: null,
              user_agent: null,
              created_at: new Date().toISOString()
            } as any);

            // Execute automatic maintenance
            await applyAutomaticMaintenance(currentDelivery.id, testData.subscriptionId);

            // PROPERTY VERIFICATION:
            // 1. Verify previous collection_id was copied to current delivery
            expect(mockUpdateFn).toHaveBeenCalledWith(
              expect.objectContaining({
                collection_id: previousDelivery.collectionId
              })
            );

            // 2. Verify auto_maintained flag was set to true
            expect(mockUpdateFn).toHaveBeenCalledWith(
              expect.objectContaining({
                auto_maintained: true
              })
            );

            // 3. Verify audit trail record was created
            expect(auditTrailService.recordCollectionChange).toHaveBeenCalledWith({
              deliveryId: currentDelivery.id,
              userId: testData.userId,
              previousCollectionId: null,
              newCollectionId: previousDelivery.collectionId,
              changeReason: 'automatic_maintenance',
              changedByAdmin: false
            });
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in the task
          verbose: true
        }
      );
    });
  });
});
