/**
 * Audit Trail Service Tests
 * 
 * Property-based tests for audit trail recording functionality.
 * Tests that collection changes are properly recorded with all required fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { recordCollectionChange, RecordCollectionChangeParams } from './audit-trail-service';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

import { supabase } from '@/integrations/supabase/client';

describe('Audit Trail Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property-Based Tests
   * 
   * These tests use fast-check to verify properties hold across many random inputs.
   */
  describe('Property-Based Tests', () => {
    /**
     * Property 26: Collection Changes Create Audit Records
     * 
     * **Validates: Requirements 8.1, 8.2**
     * 
     * For any collection change, an audit record must be created with:
     * - delivery_id: The delivery being changed
     * - user_id: The subscriber making the change
     * - previous_collection_id: The old collection (can be null for first choice)
     * - new_collection_id: The new collection
     * - change_reason: Why the change occurred (manual, automatic_maintenance, admin_override)
     * - changed_by_admin: Whether an admin made the change
     * - admin_user_id: The admin who made the change (if applicable)
     * - ip_address: The IP address of the request
     * - user_agent: The browser/client user agent
     * - created_at: Timestamp of the change
     * 
     * This property test generates random collection change scenarios and verifies
     * that every change results in a properly populated audit record.
     */
    it('Property 26: Collection changes create audit records with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random collection change scenarios
          fc.record({
            deliveryId: fc.uuid(),
            userId: fc.uuid(),
            previousCollectionId: fc.option(fc.uuid(), { nil: null }),
            newCollectionId: fc.uuid(),
            changeReason: fc.constantFrom('manual', 'automatic_maintenance', 'admin_override'),
            changedByAdmin: fc.boolean(),
            adminUserId: fc.option(fc.uuid(), { nil: null }),
            ipAddress: fc.option(
              fc.tuple(
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 })
              ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
              { nil: null }
            ),
            userAgent: fc.option(
              fc.constantFrom(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
              ),
              { nil: null }
            )
          }),
          async (scenario) => {
            // Create the expected audit record
            const expectedRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              delivery_id: scenario.deliveryId,
              user_id: scenario.userId,
              previous_collection_id: scenario.previousCollectionId,
              new_collection_id: scenario.newCollectionId,
              change_reason: scenario.changeReason,
              changed_by_admin: scenario.changedByAdmin,
              admin_user_id: scenario.adminUserId,
              ip_address: scenario.ipAddress,
              user_agent: scenario.userAgent,
              created_at: new Date().toISOString()
            };

            // Mock the database response
            const mockInsert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: expectedRecord,
                  error: null
                })
              }))
            }));

            const mockFrom = vi.fn(() => ({
              insert: mockInsert
            }));

            vi.mocked(supabase.from).mockImplementation(mockFrom as any);

            // Create the parameters for recordCollectionChange
            const params: RecordCollectionChangeParams = {
              deliveryId: scenario.deliveryId,
              userId: scenario.userId,
              previousCollectionId: scenario.previousCollectionId,
              newCollectionId: scenario.newCollectionId,
              changeReason: scenario.changeReason as 'manual' | 'automatic_maintenance' | 'admin_override',
              changedByAdmin: scenario.changedByAdmin,
              adminUserId: scenario.adminUserId,
              ipAddress: scenario.ipAddress,
              userAgent: scenario.userAgent
            };

            // Call the function
            const result = await recordCollectionChange(params);

            // Verify the function was called with correct table name
            expect(supabase.from).toHaveBeenCalledWith('collection_choice_history');

            // Verify insert was called with correct data
            expect(mockInsert).toHaveBeenCalledWith({
              delivery_id: scenario.deliveryId,
              user_id: scenario.userId,
              previous_collection_id: scenario.previousCollectionId,
              new_collection_id: scenario.newCollectionId,
              change_reason: scenario.changeReason,
              changed_by_admin: scenario.changedByAdmin,
              admin_user_id: scenario.adminUserId,
              ip_address: scenario.ipAddress,
              user_agent: scenario.userAgent
            });

            // Verify all required fields are present in the result
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.delivery_id).toBe(scenario.deliveryId);
            expect(result.user_id).toBe(scenario.userId);
            expect(result.previous_collection_id).toBe(scenario.previousCollectionId);
            expect(result.new_collection_id).toBe(scenario.newCollectionId);
            expect(result.change_reason).toBe(scenario.changeReason);
            expect(result.changed_by_admin).toBe(scenario.changedByAdmin);
            expect(result.admin_user_id).toBe(scenario.adminUserId);
            expect(result.ip_address).toBe(scenario.ipAddress);
            expect(result.user_agent).toBe(scenario.userAgent);
            expect(result.created_at).toBeDefined();

            // Verify timestamp is a valid ISO string
            expect(() => new Date(result.created_at)).not.toThrow();
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in requirements
          verbose: true
        }
      );
    });

    /**
     * Property: Audit Records Preserve Change Reason
     * 
     * Verifies that the change_reason field is always one of the valid values
     * and is preserved correctly in the audit record.
     */
    it('Property: Audit records preserve change reason correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // deliveryId
          fc.uuid(), // userId
          fc.uuid(), // newCollectionId
          fc.constantFrom('manual', 'automatic_maintenance', 'admin_override'),
          async (deliveryId, userId, newCollectionId, changeReason) => {
            const expectedRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              delivery_id: deliveryId,
              user_id: userId,
              previous_collection_id: null,
              new_collection_id: newCollectionId,
              change_reason: changeReason,
              changed_by_admin: false,
              admin_user_id: null,
              ip_address: null,
              user_agent: null,
              created_at: new Date().toISOString()
            };

            const mockInsert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: expectedRecord,
                  error: null
                })
              }))
            }));

            vi.mocked(supabase.from).mockImplementation((() => ({
              insert: mockInsert
            })) as any);

            const result = await recordCollectionChange({
              deliveryId,
              userId,
              previousCollectionId: null,
              newCollectionId,
              changeReason: changeReason as 'manual' | 'automatic_maintenance' | 'admin_override'
            });

            // Verify change_reason is preserved and valid
            expect(result.change_reason).toBe(changeReason);
            expect(['manual', 'automatic_maintenance', 'admin_override']).toContain(result.change_reason);
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    /**
     * Property: Admin Changes Include Admin User ID
     * 
     * Verifies that when changed_by_admin is true, an admin_user_id must be provided.
     */
    it('Property: Admin changes include admin user ID when changed by admin', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // deliveryId
          fc.uuid(), // userId
          fc.uuid(), // newCollectionId
          fc.uuid(), // adminUserId
          async (deliveryId, userId, newCollectionId, adminUserId) => {
            const expectedRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              delivery_id: deliveryId,
              user_id: userId,
              previous_collection_id: null,
              new_collection_id: newCollectionId,
              change_reason: 'admin_override',
              changed_by_admin: true,
              admin_user_id: adminUserId,
              ip_address: null,
              user_agent: null,
              created_at: new Date().toISOString()
            };

            const mockInsert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: expectedRecord,
                  error: null
                })
              }))
            }));

            vi.mocked(supabase.from).mockImplementation((() => ({
              insert: mockInsert
            })) as any);

            const result = await recordCollectionChange({
              deliveryId,
              userId,
              previousCollectionId: null,
              newCollectionId,
              changeReason: 'admin_override',
              changedByAdmin: true,
              adminUserId
            });

            // Verify admin fields are set correctly
            expect(result.changed_by_admin).toBe(true);
            expect(result.admin_user_id).toBe(adminUserId);
            expect(result.change_reason).toBe('admin_override');
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    /**
     * Property: Automatic Maintenance Records Have Correct Reason
     * 
     * Verifies that automatic maintenance changes are recorded with the
     * correct change_reason value.
     */
    it('Property: Automatic maintenance records have correct reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // deliveryId
          fc.uuid(), // userId
          fc.uuid(), // previousCollectionId
          fc.uuid(), // newCollectionId
          async (deliveryId, userId, previousCollectionId, newCollectionId) => {
            const expectedRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              delivery_id: deliveryId,
              user_id: userId,
              previous_collection_id: previousCollectionId,
              new_collection_id: newCollectionId,
              change_reason: 'automatic_maintenance',
              changed_by_admin: false,
              admin_user_id: null,
              ip_address: null,
              user_agent: null,
              created_at: new Date().toISOString()
            };

            const mockInsert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: expectedRecord,
                  error: null
                })
              }))
            }));

            vi.mocked(supabase.from).mockImplementation((() => ({
              insert: mockInsert
            })) as any);

            const result = await recordCollectionChange({
              deliveryId,
              userId,
              previousCollectionId,
              newCollectionId,
              changeReason: 'automatic_maintenance'
            });

            // Verify automatic maintenance is recorded correctly
            expect(result.change_reason).toBe('automatic_maintenance');
            expect(result.changed_by_admin).toBe(false);
            expect(result.previous_collection_id).toBe(previousCollectionId);
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  /**
   * Unit Tests
   * 
   * Traditional unit tests for specific scenarios and edge cases.
   */
  describe('Unit Tests', () => {
    it('should record a manual collection change', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: 'collection-old',
        newCollectionId: 'collection-new',
        changeReason: 'manual',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const expectedRecord = {
        id: 'record-789',
        delivery_id: params.deliveryId,
        user_id: params.userId,
        previous_collection_id: params.previousCollectionId,
        new_collection_id: params.newCollectionId,
        change_reason: params.changeReason,
        changed_by_admin: false,
        admin_user_id: null,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        created_at: new Date().toISOString()
      };

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: expectedRecord,
            error: null
          })
        }))
      }));

      vi.mocked(supabase.from).mockImplementation((() => ({
        insert: mockInsert
      })) as any);

      const result = await recordCollectionChange(params);

      expect(result).toEqual(expectedRecord);
      expect(supabase.from).toHaveBeenCalledWith('collection_choice_history');
    });

    it('should record first collection choice with null previous collection', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: null,
        newCollectionId: 'collection-new',
        changeReason: 'manual'
      };

      const expectedRecord = {
        id: 'record-789',
        delivery_id: params.deliveryId,
        user_id: params.userId,
        previous_collection_id: null,
        new_collection_id: params.newCollectionId,
        change_reason: params.changeReason,
        changed_by_admin: false,
        admin_user_id: null,
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString()
      };

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: expectedRecord,
            error: null
          })
        }))
      }));

      vi.mocked(supabase.from).mockImplementation((() => ({
        insert: mockInsert
      })) as any);

      const result = await recordCollectionChange(params);

      expect(result.previous_collection_id).toBeNull();
      expect(result.new_collection_id).toBe(params.newCollectionId);
    });

    it('should throw error when database insert fails', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: null,
        newCollectionId: 'collection-new',
        changeReason: 'manual'
      };

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        }))
      }));

      vi.mocked(supabase.from).mockImplementation((() => ({
        insert: mockInsert
      })) as any);

      await expect(recordCollectionChange(params)).rejects.toThrow(
        'Failed to record collection change: Database connection failed'
      );
    });
  });
});
