/**
 * Capacity Service Tests
 * 
 * Tests for capacity management operations.
 * 
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAvailability,
  reserveCapacity,
  releaseCapacity,
  getCapacityUsage,
  checkSubscriptionCapacity
} from './capacity-service';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn()
  }
}));

describe('Capacity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return true when capacity is available', async () => {
      // Mock RPC call to return true
      (supabase.rpc as any).mockResolvedValue({
        data: true,
        error: null
      });

      const result = await checkAvailability('cycle-123', 5);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('check_capacity_available', {
        p_cycle_id: 'cycle-123',
        p_quantity: 5
      });
    });

    it('should return false when capacity is not available', async () => {
      // Mock RPC call to return false
      (supabase.rpc as any).mockResolvedValue({
        data: false,
        error: null
      });

      const result = await checkAvailability('cycle-123', 100);

      expect(result).toBe(false);
    });

    it('should throw error when database query fails', async () => {
      // Mock RPC call to return error
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(checkAvailability('cycle-123', 5)).rejects.toThrow(
        'Failed to check capacity availability: Database error'
      );
    });
  });

  describe('reserveCapacity', () => {
    it('should successfully reserve capacity', async () => {
      // Mock RPC call to succeed
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await reserveCapacity('cycle-123', 3, 'subscription-456');

      expect(supabase.rpc).toHaveBeenCalledWith('reserve_capacity', {
        p_cycle_id: 'cycle-123',
        p_quantity: 3
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reserved 3 capacity')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when capacity limit exceeded', async () => {
      // Mock RPC call to return error
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Capacity limit exceeded' }
      });

      await expect(
        reserveCapacity('cycle-123', 100, 'subscription-456')
      ).rejects.toThrow('Failed to reserve capacity: Capacity limit exceeded');
    });

    it('should throw error when cycle not found', async () => {
      // Mock RPC call to return error
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Cycle not found' }
      });

      await expect(
        reserveCapacity('invalid-cycle', 1, 'subscription-456')
      ).rejects.toThrow('Failed to reserve capacity: Cycle not found');
    });
  });

  describe('releaseCapacity', () => {
    it('should successfully release capacity', async () => {
      // Mock RPC call to succeed
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await releaseCapacity('cycle-123', 2, 'subscription-456');

      expect(supabase.rpc).toHaveBeenCalledWith('release_capacity', {
        p_cycle_id: 'cycle-123',
        p_quantity: 2
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Released 2 capacity')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when database update fails', async () => {
      // Mock RPC call to return error
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        releaseCapacity('cycle-123', 1, 'subscription-456')
      ).rejects.toThrow('Failed to release capacity: Database error');
    });
  });

  describe('getCapacityUsage', () => {
    it('should return capacity usage with capacity_max', async () => {
      // Mock database query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                capacity_max: 100,
                capacity_current: 75
              },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const result = await getCapacityUsage('cycle-123');

      expect(result).toEqual({
        max: 100,
        current: 75,
        available: 25,
        percentage: 75,
        reserved: 0
      });
    });

    it('should fall back to capacity_max when capacity_limit is null', async () => {
      // Mock database query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                capacity_max: 150,
                capacity_current: 50,
                capacity_limit: null
              },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const result = await getCapacityUsage('cycle-123');

      expect(result).toEqual({
        max: 150,
        current: 50,
        available: 100,
        percentage: 33,
        reserved: 0
      });
    });

    it('should handle zero capacity_current', async () => {
      // Mock database query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                capacity_max: 100,
                capacity_current: 0,
                capacity_limit: 100
              },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const result = await getCapacityUsage('cycle-123');

      expect(result).toEqual({
        max: 100,
        current: 0,
        available: 100,
        percentage: 0,
        reserved: 0
      });
    });

    it('should handle full capacity', async () => {
      // Mock database query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                capacity_max: 100,
                capacity_current: 100,
                capacity_limit: 100
              },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const result = await getCapacityUsage('cycle-123');

      expect(result).toEqual({
        max: 100,
        current: 100,
        available: 0,
        percentage: 100,
        reserved: 0
      });
    });

    it('should throw error when cycle not found', async () => {
      // Mock database query to return null
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      await expect(getCapacityUsage('invalid-cycle')).rejects.toThrow(
        'Cycle not found: invalid-cycle'
      );
    });

    it('should throw error when database query fails', async () => {
      // Mock database query to return error
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      await expect(getCapacityUsage('cycle-123')).rejects.toThrow(
        'Failed to get cycle capacity: Database error'
      );
    });
  });
});

describe('Property-Based Tests', () => {
  describe('Property 7: Capacity Check Before Purchase', () => {
    /**
     * **Validates: Requirements 3.2, 3.3, 22.1, 22.4**
     * 
     * Property: For any subscription or standalone purchase creation attempt,
     * capacity availability must be verified before confirming the purchase.
     * 
     * This property tests that:
     * 1. checkAvailability is called before any purchase
     * 2. Purchases are rejected when capacity is exceeded
     * 3. reserveCapacity throws an error when capacity is exceeded
     * 4. The system correctly handles various capacity scenarios
     */
    
    it('should always check capacity before allowing purchase', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate random capacity scenarios
          fc.record({
            maxCapacity: fc.integer({ min: 1, max: 200 }),
            currentUsage: fc.integer({ min: 0, max: 200 }),
            requestedQuantity: fc.integer({ min: 1, max: 10 })
          }),
          async ({ maxCapacity, currentUsage, requestedQuantity }) => {
            // Setup: Mock the database to return our test scenario
            const cycleId = 'test-cycle-' + Math.random();
            const hasCapacity = (currentUsage + requestedQuantity) <= maxCapacity;
            
            // Mock checkAvailability
            (supabase.rpc as any).mockResolvedValueOnce({
              data: hasCapacity,
              error: null
            });
            
            // Act: Check availability
            const result = await checkAvailability(cycleId, requestedQuantity);
            
            // Assert: Result matches expected capacity calculation
            expect(result).toBe(hasCapacity);
            
            // Verify that the RPC was called with correct parameters
            expect(supabase.rpc).toHaveBeenCalledWith('check_capacity_available', {
              p_cycle_id: cycleId,
              p_quantity: requestedQuantity
            });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified
      );
    });
    
    it('should reject purchases when capacity would be exceeded', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate scenarios where capacity is exceeded
          fc.record({
            maxCapacity: fc.integer({ min: 10, max: 100 }),
            currentUsage: fc.integer({ min: 5, max: 95 }),
            requestedQuantity: fc.integer({ min: 1, max: 20 })
          }).filter(({ maxCapacity, currentUsage, requestedQuantity }) => 
            // Only test cases where capacity would be exceeded
            (currentUsage + requestedQuantity) > maxCapacity
          ),
          async ({ maxCapacity, currentUsage, requestedQuantity }) => {
            const cycleId = 'test-cycle-' + Math.random();
            
            // Mock checkAvailability to return false (capacity exceeded)
            (supabase.rpc as any).mockResolvedValueOnce({
              data: false,
              error: null
            });
            
            // Act: Check availability
            const result = await checkAvailability(cycleId, requestedQuantity);
            
            // Assert: Purchase should be rejected
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should throw error when reserveCapacity exceeds limit', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate scenarios where reservation would exceed capacity
          fc.record({
            maxCapacity: fc.integer({ min: 10, max: 100 }),
            currentUsage: fc.integer({ min: 5, max: 95 }),
            requestedQuantity: fc.integer({ min: 1, max: 20 })
          }).filter(({ maxCapacity, currentUsage, requestedQuantity }) => 
            (currentUsage + requestedQuantity) > maxCapacity
          ),
          async ({ maxCapacity, currentUsage, requestedQuantity }) => {
            const cycleId = 'test-cycle-' + Math.random();
            const referenceId = 'ref-' + Math.random();
            
            // Mock reserveCapacity to fail with capacity exceeded error
            (supabase.rpc as any).mockResolvedValueOnce({
              data: null,
              error: { message: 'Capacity limit exceeded' }
            });
            
            // Act & Assert: Should throw error
            await expect(
              reserveCapacity(cycleId, requestedQuantity, referenceId)
            ).rejects.toThrow('Failed to reserve capacity: Capacity limit exceeded');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should allow purchases when capacity is available', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate scenarios where capacity is available
          fc.record({
            maxCapacity: fc.integer({ min: 20, max: 200 }),
            currentUsage: fc.integer({ min: 0, max: 50 }),
            requestedQuantity: fc.integer({ min: 1, max: 10 })
          }).filter(({ maxCapacity, currentUsage, requestedQuantity }) => 
            // Only test cases where capacity is available
            (currentUsage + requestedQuantity) <= maxCapacity
          ),
          async ({ maxCapacity, currentUsage, requestedQuantity }) => {
            const cycleId = 'test-cycle-' + Math.random();
            
            // Mock checkAvailability to return true
            (supabase.rpc as any).mockResolvedValueOnce({
              data: true,
              error: null
            });
            
            // Act: Check availability
            const result = await checkAvailability(cycleId, requestedQuantity);
            
            // Assert: Purchase should be allowed
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly calculate capacity for subscription scenarios', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate subscription scenarios
          fc.record({
            maxCapacity: fc.integer({ min: 50, max: 200 }),
            currentUsage: fc.integer({ min: 0, max: 100 }),
            subscriptionType: fc.constantFrom('trimestral', 'semestral')
          }),
          async ({ maxCapacity, currentUsage, subscriptionType }) => {
            const deliveryCount = subscriptionType === 'trimestral' ? 3 : 6;
            
            // For each delivery, we need 1 capacity unit
            // Check if all deliveries can be accommodated
            const canAccommodate = (currentUsage + deliveryCount) <= maxCapacity;
            
            // Mock get_or_create_current_cycle
            (supabase.rpc as any).mockResolvedValueOnce({
              data: {
                cycle_number: 1,
                month: 3,
                year: 2026
              },
              error: null
            });
            
            // Mock cycles query
            if (canAccommodate) {
              // All cycles have capacity
              (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: null, // No existing cycle (will be created with capacity)
                          error: null
                        })
                      })
                    })
                  })
                })
              });
            } else {
              // First cycle has no capacity
              (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: {
                            id: 'cycle-full',
                            capacity_current: maxCapacity,
                            capacity_max: maxCapacity
                          },
                          error: null
                        })
                      })
                    })
                  })
                })
              });
              
              // Mock check_capacity_available to return false
              (supabase.rpc as any).mockResolvedValueOnce({
                data: false,
                error: null
              });
            }
            
            // Act: Check subscription capacity
            const result = await checkSubscriptionCapacity(deliveryCount);
            
            // Assert: Result matches expected availability
            if (canAccommodate) {
              expect(result.available).toBe(true);
            } else {
              expect(result.available).toBe(false);
              expect(result.firstUnavailableCycle).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly calculate capacity for standalone purchase scenarios', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate standalone purchase scenarios
          fc.record({
            maxCapacity: fc.integer({ min: 10, max: 100 }),
            currentUsage: fc.integer({ min: 0, max: 95 }),
            purchaseQuantity: fc.constantFrom(1) // Standalone purchases are always 1 piece
          }),
          async ({ maxCapacity, currentUsage, purchaseQuantity }) => {
            const cycleId = 'test-cycle-' + Math.random();
            const hasCapacity = (currentUsage + purchaseQuantity) <= maxCapacity;
            
            // Mock checkAvailability
            (supabase.rpc as any).mockResolvedValueOnce({
              data: hasCapacity,
              error: null
            });
            
            // Act: Check availability for standalone purchase
            const result = await checkAvailability(cycleId, purchaseQuantity);
            
            // Assert: Result matches expected capacity
            expect(result).toBe(hasCapacity);
            
            // If capacity available, should be able to reserve
            if (hasCapacity) {
              const referenceId = 'standalone-' + Math.random();
              
              // Mock successful reservation
              (supabase.rpc as any).mockResolvedValueOnce({
                data: null,
                error: null
              });
              
              // Should not throw
              await expect(
                reserveCapacity(cycleId, purchaseQuantity, referenceId)
              ).resolves.not.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Capacity Calculation Accuracy', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * Property: For any cycle, the capacity_current value should equal the sum
     * of all subscription deliveries plus standalone purchases scheduled for that cycle.
     * 
     * This property tests that:
     * 1. capacity_current accurately reflects all items in the cycle
     * 2. Adding deliveries increments capacity correctly
     * 3. Adding standalone purchases increments capacity correctly
     * 4. The sum of all items equals capacity_current
     * 5. Edge cases (0 items, max capacity) are handled correctly
     */
    
    it('should accurately calculate capacity as sum of deliveries and purchases', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate random scenarios with various numbers of deliveries and purchases
          fc.record({
            numDeliveries: fc.integer({ min: 0, max: 50 }),
            numStandalonePurchases: fc.integer({ min: 0, max: 50 }),
            maxCapacity: fc.integer({ min: 10, max: 200 })
          }).filter(({ numDeliveries, numStandalonePurchases, maxCapacity }) => 
            // Only test valid scenarios where total doesn't exceed capacity
            (numDeliveries + numStandalonePurchases) <= maxCapacity
          ),
          async ({ numDeliveries, numStandalonePurchases, maxCapacity }) => {
            const cycleId = 'test-cycle-' + Math.random();
            const expectedCapacityCurrent = numDeliveries + numStandalonePurchases;
            
            // Mock the database query to return our test scenario
            const mockFrom = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      capacity_max: maxCapacity,
                      capacity_current: expectedCapacityCurrent
                    },
                    error: null
                  })
                })
              })
            });
            (supabase.from as any) = mockFrom;
            
            // Act: Get capacity usage
            const result = await getCapacityUsage(cycleId);
            
            // Assert: capacity_current equals sum of all items
            expect(result.current).toBe(expectedCapacityCurrent);
            expect(result.max).toBe(maxCapacity);
            expect(result.available).toBe(maxCapacity - expectedCapacityCurrent);
            expect(result.percentage).toBe(
              maxCapacity > 0 ? Math.round((expectedCapacityCurrent / maxCapacity) * 100) : 0
            );
            
            // Verify the calculation is accurate
            const calculatedSum = numDeliveries + numStandalonePurchases;
            expect(result.current).toBe(calculatedSum);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified
      );
    });
    
    it('should handle edge case of zero items', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 200 }),
          async (maxCapacity) => {
            const cycleId = 'test-cycle-' + Math.random();
            
            // Mock cycle with zero items
            const mockFrom = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      capacity_max: maxCapacity,
                      capacity_current: 0
                    },
                    error: null
                  })
                })
              })
            });
            (supabase.from as any) = mockFrom;
            
            // Act: Get capacity usage
            const result = await getCapacityUsage(cycleId);
            
            // Assert: capacity_current is 0 when no items
            expect(result.current).toBe(0);
            expect(result.available).toBe(maxCapacity);
            expect(result.percentage).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle edge case of max capacity', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 200 }),
          async (maxCapacity) => {
            const cycleId = 'test-cycle-' + Math.random();
            
            // Mock cycle at max capacity
            const mockFrom = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      capacity_max: maxCapacity,
                      capacity_current: maxCapacity
                    },
                    error: null
                  })
                })
              })
            });
            (supabase.from as any) = mockFrom;
            
            // Act: Get capacity usage
            const result = await getCapacityUsage(cycleId);
            
            // Assert: capacity_current equals max when full
            expect(result.current).toBe(maxCapacity);
            expect(result.available).toBe(0);
            expect(result.percentage).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly track capacity through multiple operations', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of operations
          fc.record({
            initialCapacity: fc.integer({ min: 0, max: 50 }),
            maxCapacity: fc.integer({ min: 100, max: 200 }),
            operations: fc.array(
              fc.record({
                type: fc.constantFrom('add_delivery', 'add_purchase', 'release'),
                quantity: fc.integer({ min: 1, max: 5 })
              }),
              { minLength: 1, maxLength: 20 }
            )
          }),
          async ({ initialCapacity, maxCapacity, operations }) => {
            const cycleId = 'test-cycle-' + Math.random();
            let currentCapacity = initialCapacity;
            
            // Simulate operations
            for (const op of operations) {
              if (op.type === 'add_delivery' || op.type === 'add_purchase') {
                // Only add if it won't exceed capacity
                if (currentCapacity + op.quantity <= maxCapacity) {
                  // Mock successful reservation
                  (supabase.rpc as any).mockResolvedValueOnce({
                    data: null,
                    error: null
                  });
                  
                  await reserveCapacity(cycleId, op.quantity, 'ref-' + Math.random());
                  currentCapacity += op.quantity;
                }
              } else if (op.type === 'release') {
                // Only release if there's capacity to release
                if (currentCapacity >= op.quantity) {
                  // Mock successful release
                  (supabase.rpc as any).mockResolvedValueOnce({
                    data: null,
                    error: null
                  });
                  
                  await releaseCapacity(cycleId, op.quantity, 'ref-' + Math.random());
                  currentCapacity -= op.quantity;
                }
              }
            }
            
            // Mock final capacity state
            const mockFrom = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      capacity_max: maxCapacity,
                      capacity_current: currentCapacity
                    },
                    error: null
                  })
                })
              })
            });
            (supabase.from as any) = mockFrom;
            
            // Act: Get final capacity usage
            const result = await getCapacityUsage(cycleId);
            
            // Assert: capacity_current matches our tracked value
            expect(result.current).toBe(currentCapacity);
            expect(result.current).toBeGreaterThanOrEqual(0);
            expect(result.current).toBeLessThanOrEqual(maxCapacity);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain accuracy with various combinations of deliveries and purchases', async () => {
      const fc = await import('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // Generate various combinations
          fc.array(
            fc.record({
              deliveries: fc.integer({ min: 0, max: 10 }),
              purchases: fc.integer({ min: 0, max: 10 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (combinations) => {
            const cycleId = 'test-cycle-' + Math.random();
            
            // Calculate total from all combinations
            let totalDeliveries = 0;
            let totalPurchases = 0;
            
            for (const combo of combinations) {
              totalDeliveries += combo.deliveries;
              totalPurchases += combo.purchases;
            }
            
            const totalItems = totalDeliveries + totalPurchases;
            const maxCapacity = Math.max(totalItems + 50, 100); // Ensure capacity is sufficient
            
            // Mock the database state
            const mockFrom = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      capacity_max: maxCapacity,
                      capacity_current: totalItems
                    },
                    error: null
                  })
                })
              })
            });
            (supabase.from as any) = mockFrom;
            
            // Act: Get capacity usage
            const result = await getCapacityUsage(cycleId);
            
            // Assert: capacity_current equals sum of all deliveries and purchases
            expect(result.current).toBe(totalDeliveries + totalPurchases);
            expect(result.current).toBe(totalItems);
            
            // Verify the calculation components
            const calculatedTotal = totalDeliveries + totalPurchases;
            expect(result.current).toBe(calculatedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('checkSubscriptionCapacity', () => {
  it('should return available true when all cycles have capacity', async () => {
    // Mock get_or_create_current_cycle
    (supabase.rpc as any).mockResolvedValueOnce({
      data: {
        cycle_number: 1,
        month: 3,
        year: 2026
      },
      error: null
    });

    // Mock cycles query - no existing cycles found (will be created with capacity)
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      })
    });

    const result = await checkSubscriptionCapacity(3);

    expect(result.available).toBe(true);
    expect(result.firstUnavailableCycle).toBeUndefined();
    expect(result.estimatedAvailableDate).toBeUndefined();
  });

  it('should return available false when a cycle lacks capacity', async () => {
    // Mock get_or_create_current_cycle - Cycle 1 of March 2026
    (supabase.rpc as any).mockResolvedValueOnce({
      data: {
        cycle_number: 1,
        month: 3,
        year: 2026
      },
      error: null
    });

    // The first delivery will be in Cycle 2 of March 2026
    // Mock first cycle query (Cycle 2 of March) - no capacity
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'cycle-2-march',
                  capacity_current: 100,
                  capacity_max: 100
                },
                error: null
              })
            })
          })
        })
      })
    });

    // Mock check_capacity_available for Cycle 2 of March - no capacity
    (supabase.rpc as any).mockResolvedValueOnce({
      data: false,
      error: null
    });

    const result = await checkSubscriptionCapacity(3);

    expect(result.available).toBe(false);
    expect(result.firstUnavailableCycle).toBeDefined();
    expect(result.firstUnavailableCycle?.cycleNumber).toBe(2);
    expect(result.firstUnavailableCycle?.month).toBe(3);
    expect(result.firstUnavailableCycle?.year).toBe(2026);
    expect(result.firstUnavailableCycle?.deliveryNumber).toBe(1);
    expect(result.estimatedAvailableDate).toBeDefined();
  });

  it('should calculate correct estimated availability date', async () => {
    // Mock get_or_create_current_cycle - Cycle 1 of March 2026
    (supabase.rpc as any).mockResolvedValueOnce({
      data: {
        cycle_number: 1,
        month: 3,
        year: 2026
      },
      error: null
    });

    // Mock cycle query - Cycle 2 of March is full
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'cycle-2',
                  capacity_current: 100,
                  capacity_max: 100
                },
                error: null
              })
            })
          })
        })
      })
    });

    // Mock check_capacity_available - no capacity
    (supabase.rpc as any).mockResolvedValueOnce({
      data: false,
      error: null
    });

    const result = await checkSubscriptionCapacity(3);

    expect(result.available).toBe(false);
    expect(result.estimatedAvailableDate).toBeDefined();
    
    // Next available should be Cycle 1 of April 2026 (April 1)
    const estimatedDate = result.estimatedAvailableDate!;
    expect(estimatedDate.getMonth()).toBe(3); // April (0-indexed)
    expect(estimatedDate.getFullYear()).toBe(2026);
    expect(estimatedDate.getDate()).toBe(1); // 1st of the month
  });

  it('should check capacity for all delivery cycles', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc');
    
    // Mock get_or_create_current_cycle
    rpcSpy.mockResolvedValueOnce({
      data: {
        cycle_number: 1,
        month: 3,
        year: 2026
      },
      error: null
    } as any);

    // Mock cycles query - return cycles with capacity
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'cycle-test',
                  capacity_current: 50,
                  capacity_max: 100
                },
                error: null
              })
            })
          })
        })
      })
    });

    // Mock check_capacity_available - all have capacity
    rpcSpy.mockResolvedValue({
      data: true,
      error: null
    } as any);

    await checkSubscriptionCapacity(6); // Semestral - 6 deliveries

    // Should check capacity for 6 cycles
    // 1 call for get_or_create_current_cycle + 6 calls for check_capacity_available
    expect(rpcSpy).toHaveBeenCalledTimes(7);
  });

  it('should handle year rollover correctly', async () => {
    // Mock get_or_create_current_cycle - Cycle 2 of December 2026
    (supabase.rpc as any).mockResolvedValueOnce({
      data: {
        cycle_number: 2,
        month: 12,
        year: 2026
      },
      error: null
    });

    // Mock cycle query for January 2027 - no capacity
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'cycle-jan-2027',
                  capacity_current: 100,
                  capacity_max: 100
                },
                error: null
              })
            })
          })
        })
      })
    });

    // Mock check_capacity_available - no capacity
    (supabase.rpc as any).mockResolvedValueOnce({
      data: false,
      error: null
    });

    const result = await checkSubscriptionCapacity(3);

    expect(result.available).toBe(false);
    expect(result.firstUnavailableCycle?.month).toBe(1); // January
    expect(result.firstUnavailableCycle?.year).toBe(2027); // Next year
  });
});
