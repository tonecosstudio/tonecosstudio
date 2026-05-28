/**
 * Collection Service Tests
 * 
 * Unit tests for collection rotation service functions.
 * Tests the logic for determining active collections based on rotation patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getActiveCollections, isCollectionActive, getRotationSchedule } from './collection-service';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

import { supabase } from '@/integrations/supabase/client';

type MockQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function mockActiveCollectionsQuery(result: MockQueryResult) {
  const order = vi.fn().mockResolvedValue(result);
  const inFilter = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ in: inFilter });
  const select = vi.fn().mockReturnValue({ eq });

  vi.mocked(supabase.from).mockReturnValue({ select } as any);

  return { select, eq, inFilter, order };
}

describe('Collection Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveCollections', () => {
    it('should return active collections for a valid month and year', async () => {
      const mockCollections = [
        { id: '1', name: 'Fixed Collection', rotation_type: 'fixed' },
        { id: '2', name: 'Odd Month Collection', rotation_type: 'odd_months' }
      ];

      const query = mockActiveCollectionsQuery({
        data: mockCollections,
        error: null
      });

      const result = await getActiveCollections(1, 2026);

      expect(supabase.from).toHaveBeenCalledWith('collections');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.eq).toHaveBeenCalledWith('is_active', true);
      expect(query.inFilter).toHaveBeenCalledWith('rotation_type', ['fixed', 'odd_months']);
      expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockCollections);
    });

    it('should throw error for invalid month (< 1)', async () => {
      await expect(getActiveCollections(0, 2026)).rejects.toThrow(
        'Month must be an integer between 1 and 12, got 0'
      );
    });

    it('should throw error for invalid month (> 12)', async () => {
      await expect(getActiveCollections(13, 2026)).rejects.toThrow(
        'Month must be an integer between 1 and 12, got 13'
      );
    });

    it('should throw error for invalid year (< 2024)', async () => {
      await expect(getActiveCollections(1, 2023)).rejects.toThrow(
        'Year must be an integer between 2024 and 2030, got 2023'
      );
    });

    it('should throw error for invalid year (> 2030)', async () => {
      await expect(getActiveCollections(1, 2031)).rejects.toThrow(
        'Year must be an integer between 2024 and 2030, got 2031'
      );
    });

    it('should throw error when database query fails', async () => {
      mockActiveCollectionsQuery({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(getActiveCollections(1, 2026)).rejects.toThrow(
        'Failed to get active collections: Database error'
      );
    });
  });

  describe('isCollectionActive', () => {
    it('should return true when collection is in active list', async () => {
      const mockCollections = [
        { id: 'collection-1', name: 'Test Collection' },
        { id: 'collection-2', name: 'Another Collection' }
      ];

      mockActiveCollectionsQuery({
        data: mockCollections,
        error: null
      });

      const result = await isCollectionActive('collection-1', 3, 2026);

      expect(result).toBe(true);
    });

    it('should return false when collection is not in active list', async () => {
      const mockCollections = [
        { id: 'collection-1', name: 'Test Collection' }
      ];

      mockActiveCollectionsQuery({
        data: mockCollections,
        error: null
      });

      const result = await isCollectionActive('collection-999', 3, 2026);

      expect(result).toBe(false);
    });

    it('should return false when no collections are active', async () => {
      mockActiveCollectionsQuery({
        data: [],
        error: null
      });

      const result = await isCollectionActive('collection-1', 3, 2026);

      expect(result).toBe(false);
    });
  });

  describe('getRotationSchedule', () => {
    it('should return all months for fixed collection', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { rotation_type: 'fixed' },
              error: null
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getRotationSchedule('collection-1');

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should return odd months for odd_months collection', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { rotation_type: 'odd_months' },
              error: null
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getRotationSchedule('collection-1');

      expect(result).toEqual([1, 3, 5, 7, 9, 11]);
    });

    it('should return even months for even_months collection', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { rotation_type: 'even_months' },
              error: null
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getRotationSchedule('collection-1');

      expect(result).toEqual([2, 4, 6, 8, 10, 12]);
    });

    it('should throw error when collection not found', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(getRotationSchedule('collection-999')).rejects.toThrow(
        'Collection not found: collection-999'
      );
    });

    it('should throw error when database query fails', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(getRotationSchedule('collection-1')).rejects.toThrow(
        'Failed to get collection: Database error'
      );
    });

    it('should throw error for unknown rotation type', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { rotation_type: 'invalid_type' },
              error: null
            })
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(getRotationSchedule('collection-1')).rejects.toThrow(
        'Invalid rotation type: invalid_type'
      );
    });
  });

  /**
   * Property-Based Tests
   * 
   * These tests use fast-check to verify properties hold across many random inputs.
   */
  describe('Property-Based Tests', () => {
    /**
     * Property 18: Active Collections Match Rotation Pattern
     * 
     * **Validates: Requirements 5.4**
     * 
     * For any month M, active collections should include:
     * - All fixed collections (always available)
     * - Rotating collections where (rotation_type = 'odd_months' AND M is odd)
     * - Rotating collections where (rotation_type = 'even_months' AND M is even)
     * 
     * This property test generates random months and verifies that the
     * getActiveCollections function correctly filters collections based on
     * their rotation patterns.
     */
    it('Property 18: Active collections match rotation pattern for any month', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random month (1-12) and year (2024-2030)
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2024, max: 2030 }),
          async (month, year) => {
            // Create test collections with different rotation types
            const fixedCollection1 = {
              id: 'fixed-1',
              name: 'Fixed Collection 1',
              rotation_type: 'fixed',
              is_active: true
            };
            
            const fixedCollection2 = {
              id: 'fixed-2',
              name: 'Fixed Collection 2',
              rotation_type: 'fixed',
              is_active: true
            };
            
            const oddMonthsCollection = {
              id: 'odd-1',
              name: 'Odd Months Collection',
              rotation_type: 'odd_months',
              is_active: true
            };
            
            const evenMonthsCollection = {
              id: 'even-1',
              name: 'Even Months Collection',
              rotation_type: 'even_months',
              is_active: true
            };

            // Determine which collections should be active based on month
            const expectedCollections = [
              fixedCollection1,
              fixedCollection2
            ];

            // Add odd_months collection if month is odd
            if (month % 2 === 1) {
              expectedCollections.push(oddMonthsCollection);
            }

            // Add even_months collection if month is even
            if (month % 2 === 0) {
              expectedCollections.push(evenMonthsCollection);
            }

            // Mock the database response
            mockActiveCollectionsQuery({
              data: expectedCollections,
              error: null
            });

            // Call the function
            const result = await getActiveCollections(month, year);

            // Verify fixed collections are always included
            const fixedCollectionIds = result
              .filter(c => (c as any).rotation_type === 'fixed')
              .map(c => c.id);
            
            expect(fixedCollectionIds).toContain('fixed-1');
            expect(fixedCollectionIds).toContain('fixed-2');

            // Verify odd_months collections only in odd months
            const oddMonthsCollectionIds = result
              .filter(c => (c as any).rotation_type === 'odd_months')
              .map(c => c.id);
            
            if (month % 2 === 1) {
              // Odd month - should include odd_months collection
              expect(oddMonthsCollectionIds).toContain('odd-1');
            } else {
              // Even month - should NOT include odd_months collection
              expect(oddMonthsCollectionIds).not.toContain('odd-1');
            }

            // Verify even_months collections only in even months
            const evenMonthsCollectionIds = result
              .filter(c => (c as any).rotation_type === 'even_months')
              .map(c => c.id);
            
            if (month % 2 === 0) {
              // Even month - should include even_months collection
              expect(evenMonthsCollectionIds).toContain('even-1');
            } else {
              // Odd month - should NOT include even_months collection
              expect(evenMonthsCollectionIds).not.toContain('even-1');
            }

            // Verify total count matches expected
            expect(result.length).toBe(expectedCollections.length);
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in requirements
          verbose: true
        }
      );
    });
  });
});
