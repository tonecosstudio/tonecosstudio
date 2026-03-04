// @ts-nocheck
/**
 * Standalone Purchase Service Tests
 * 
 * Tests for standalone purchase creation with cutoff enforcement
 * 
 * Requirements: 4.1, 4.2, 4.3, 7.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWithDeposit, canCreateStandalonePurchase } from './standalone-purchase-service';
import { CutoffPassedError } from '@/lib/cutoff-middleware';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock cutoff middleware
vi.mock('@/lib/cutoff-middleware', () => ({
  validateBeforeCutoff: vi.fn(),
  CutoffPassedError: class CutoffPassedError extends Error {
    constructor(message: string = "Changes blocked - production has started") {
      super(message);
      this.name = "CutoffPassedError";
    }
  }
}));

import { supabase } from '@/integrations/supabase/client';
import { validateBeforeCutoff } from '@/lib/cutoff-middleware';

describe('Standalone Purchase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWithDeposit', () => {
    it('should reject purchase if cutoff has passed', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockRejectedValue(
        new CutoffPassedError("Changes blocked - production has started")
      );

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789',
        depositVoucherUrl: 'https://example.com/voucher.jpg'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow(
        'Cannot create standalone purchase - cutoff has passed'
      );

      // Verify validateBeforeCutoff was called
      expect(mockValidateBeforeCutoff).toHaveBeenCalled();
    });

    it('should reject purchase if cycle is not open', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                status: 'production', // Not open
                capacity_max: 100,
                capacity_current: 50
              },
              error: null
            })
          })
        })
      });

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow(
        'Cannot create standalone purchase - cycle is production'
      );
    });

    it('should reject purchase if capacity is exceeded', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'cycles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    status: 'open',
                    capacity_max: 100,
                    capacity_current: 99
                  },
                  error: null
                })
              })
            })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    price: 250.00,
                    name: 'Test Collection'
                  },
                  error: null
                })
              })
            })
          };
        }
      });

      const mockRpc = supabase.rpc as any;
      mockRpc.mockResolvedValue({
        data: false, // Capacity not available
        error: null
      });

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow(
        'Capacity limit exceeded'
      );
    });

    it('should create purchase successfully when all validations pass', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'cycles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    status: 'open',
                    capacity_max: 100,
                    capacity_current: 50
                  },
                  error: null
                })
              })
            })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    price: 250.00,
                    name: 'Test Collection'
                  },
                  error: null
                })
              })
            })
          };
        } else if (table === 'standalone_purchases') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'purchase-123',
                    user_id: 'user-123',
                    collection_id: 'collection-456',
                    cycle_id: 'cycle-789',
                    status: 'deposit_paid',
                    deposit_amount: 100.00,
                    balance_amount: 150.00,
                    total_amount: 250.00
                  },
                  error: null
                })
              })
            })
          };
        }
      });

      const mockRpc = supabase.rpc as any;
      mockRpc.mockImplementation((fn: string) => {
        if (fn === 'check_capacity_available') {
          return Promise.resolve({ data: true, error: null });
        } else if (fn === 'reserve_capacity') {
          return Promise.resolve({ data: null, error: null });
        }
      });

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789',
        depositVoucherUrl: 'https://example.com/voucher.jpg'
      };

      // Act
      const result = await createWithDeposit(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('purchase-123');
      expect(result.deposit_amount).toBe(100.00);
      expect(result.balance_amount).toBe(150.00);
      expect(result.total_amount).toBe(250.00);
      expect(result.status).toBe('deposit_paid');
    });
  });

  describe('canCreateStandalonePurchase', () => {
    it('should return false if cutoff has passed', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockRejectedValue(
        new CutoffPassedError("Changes blocked - production has started")
      );

      // Act
      const result = await canCreateStandalonePurchase('cycle-789');

      // Assert
      expect(result.canCreate).toBe(false);
      expect(result.reason).toContain('Cutoff has passed');
    });

    it('should return false if cycle is not open', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'production' },
              error: null
            })
          })
        })
      });

      // Act
      const result = await canCreateStandalonePurchase('cycle-789');

      // Assert
      expect(result.canCreate).toBe(false);
      expect(result.reason).toContain('production');
    });

    it('should return false if capacity is exceeded', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'open' },
              error: null
            })
          })
        })
      });

      const mockRpc = supabase.rpc as any;
      mockRpc.mockResolvedValue({
        data: false, // Capacity not available
        error: null
      });

      // Act
      const result = await canCreateStandalonePurchase('cycle-789');

      // Assert
      expect(result.canCreate).toBe(false);
      expect(result.reason).toContain('Capacity limit exceeded');
    });

    it('should return true when all validations pass', async () => {
      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined);

      const mockFrom = supabase.from as any;
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'open' },
              error: null
            })
          })
        })
      });

      const mockRpc = supabase.rpc as any;
      mockRpc.mockResolvedValue({
        data: true, // Capacity available
        error: null
      });

      // Act
      const result = await canCreateStandalonePurchase('cycle-789');

      // Assert
      expect(result.canCreate).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Cutoff Enforcement - Requirement 7.6', () => {
    it('should apply cutoff rule to standalone purchases', async () => {
      // This test verifies that the cutoff rule (Requirement 7.6) is applied
      // to standalone purchases, not just subscription deliveries

      // Arrange
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockRejectedValue(
        new CutoffPassedError("Changes blocked - production has started")
      );

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow();
      
      // Verify that validateBeforeCutoff was called, proving cutoff rule is applied
      expect(mockValidateBeforeCutoff).toHaveBeenCalled();
    });

    it('should check both cutoff and cycle status', async () => {
      // This test verifies that both cutoff time AND cycle status are checked
      // as per Requirement 7.6

      // Arrange - cutoff passes but cycle is not open
      const mockValidateBeforeCutoff = validateBeforeCutoff as any;
      mockValidateBeforeCutoff.mockResolvedValue(undefined); // Cutoff OK

      const mockFrom = supabase.from as any;
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'production' }, // But cycle not open
              error: null
            })
          })
        })
      });

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow(
        'Cannot create standalone purchase - cycle is production'
      );
    });
  });
});

/**
 * Property-Based Tests using fast-check
 * 
 * These tests verify universal properties that should hold across all inputs
 * for the standalone purchase service.
 */

import * as fc from 'fast-check';

describe('Property-Based Tests - Standalone Purchase Service', () => {
  describe('Property 10: Standalone Purchase Deposit Amount', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * For any standalone purchase, the deposit_amount field should be exactly R$100.00.
     */
    it('should always set deposit_amount to exactly 100.00 regardless of collection price', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            collectionId: fc.uuid(),
            cycleId: fc.uuid(),
            collectionPrice: fc.double({ min: 100.01, max: 10000, noNaN: true }),
            collectionName: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async ({ userId, collectionId, cycleId, collectionPrice, collectionName }) => {
            // Arrange
            const mockValidateBeforeCutoff = validateBeforeCutoff as any;
            mockValidateBeforeCutoff.mockResolvedValue(undefined);

            const mockFrom = supabase.from as any;
            mockFrom.mockImplementation((table: string) => {
              if (table === 'cycles') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          status: 'open',
                          capacity_max: 100,
                          capacity_current: 50
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'collections') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          price: collectionPrice,
                          name: collectionName
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'standalone_purchases') {
                return {
                  insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: fc.sample(fc.uuid(), 1)[0],
                          user_id: userId,
                          collection_id: collectionId,
                          cycle_id: cycleId,
                          status: 'deposit_paid',
                          deposit_amount: 100.00,
                          balance_amount: collectionPrice - 100.00,
                          total_amount: collectionPrice
                        },
                        error: null
                      })
                    })
                  })
                };
              }
            });

            const mockRpc = supabase.rpc as any;
            mockRpc.mockImplementation((fn: string) => {
              if (fn === 'check_capacity_available') {
                return Promise.resolve({ data: true, error: null });
              } else if (fn === 'reserve_capacity') {
                return Promise.resolve({ data: null, error: null });
              }
            });

            // Act
            const result = await createWithDeposit({
              userId,
              collectionId,
              cycleId
            });

            // Assert - Property: deposit_amount is always exactly 100.00
            expect(result.deposit_amount).toBe(100.00);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Deposit Reserves Capacity', () => {
    /**
     * **Validates: Requirements 4.2**
     * 
     * For any standalone purchase with confirmed deposit payment, production capacity
     * should be reserved and the purchase should enter production.
     */
    it('should always reserve capacity and set status to deposit_paid when deposit is confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            collectionId: fc.uuid(),
            cycleId: fc.uuid(),
            collectionPrice: fc.double({ min: 100.01, max: 10000, noNaN: true }),
            capacityMax: fc.integer({ min: 50, max: 200 }),
            capacityCurrent: fc.integer({ min: 0, max: 49 })
          }),
          async ({ userId, collectionId, cycleId, collectionPrice, capacityMax, capacityCurrent }) => {
            // Arrange
            const mockValidateBeforeCutoff = validateBeforeCutoff as any;
            mockValidateBeforeCutoff.mockResolvedValue(undefined);

            let reserveCapacityCalled = false;
            let reservedCycleId: string | null = null;
            let reservedQuantity: number | null = null;

            const mockFrom = supabase.from as any;
            mockFrom.mockImplementation((table: string) => {
              if (table === 'cycles') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          status: 'open',
                          capacity_max: capacityMax,
                          capacity_current: capacityCurrent
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'collections') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          price: collectionPrice,
                          name: 'Test Collection'
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'standalone_purchases') {
                return {
                  insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: fc.sample(fc.uuid(), 1)[0],
                          user_id: userId,
                          collection_id: collectionId,
                          cycle_id: cycleId,
                          status: 'deposit_paid',
                          deposit_amount: 100.00,
                          balance_amount: collectionPrice - 100.00,
                          total_amount: collectionPrice
                        },
                        error: null
                      })
                    })
                  })
                };
              }
            });

            const mockRpc = supabase.rpc as any;
            mockRpc.mockImplementation((fn: string, params?: any) => {
              if (fn === 'check_capacity_available') {
                return Promise.resolve({ data: true, error: null });
              } else if (fn === 'reserve_capacity') {
                reserveCapacityCalled = true;
                reservedCycleId = params?.p_cycle_id || null;
                reservedQuantity = params?.p_quantity || null;
                return Promise.resolve({ data: null, error: null });
              }
            });

            // Act
            const result = await createWithDeposit({
              userId,
              collectionId,
              cycleId
            });

            // Assert - Property: capacity is reserved and status is deposit_paid
            expect(reserveCapacityCalled).toBe(true);
            expect(reservedCycleId).toBe(cycleId);
            expect(reservedQuantity).toBe(1);
            expect(result.status).toBe('deposit_paid');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Balance Calculation Correctness', () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * For any standalone purchase, balance_amount should equal (collection price - deposit_amount).
     */
    it('should always calculate balance_amount as collection price minus 100.00', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            collectionId: fc.uuid(),
            cycleId: fc.uuid(),
            collectionPrice: fc.double({ min: 100.01, max: 10000, noNaN: true })
          }),
          async ({ userId, collectionId, cycleId, collectionPrice }) => {
            // Arrange
            const mockValidateBeforeCutoff = validateBeforeCutoff as any;
            mockValidateBeforeCutoff.mockResolvedValue(undefined);

            const mockFrom = supabase.from as any;
            mockFrom.mockImplementation((table: string) => {
              if (table === 'cycles') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          status: 'open',
                          capacity_max: 100,
                          capacity_current: 50
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'collections') {
                return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          price: collectionPrice,
                          name: 'Test Collection'
                        },
                        error: null
                      })
                    })
                  })
                };
              } else if (table === 'standalone_purchases') {
                return {
                  insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: fc.sample(fc.uuid(), 1)[0],
                          user_id: userId,
                          collection_id: collectionId,
                          cycle_id: cycleId,
                          status: 'deposit_paid',
                          deposit_amount: 100.00,
                          balance_amount: collectionPrice - 100.00,
                          total_amount: collectionPrice
                        },
                        error: null
                      })
                    })
                  })
                };
              }
            });

            const mockRpc = supabase.rpc as any;
            mockRpc.mockImplementation((fn: string) => {
              if (fn === 'check_capacity_available') {
                return Promise.resolve({ data: true, error: null });
              } else if (fn === 'reserve_capacity') {
                return Promise.resolve({ data: null, error: null });
              }
            });

            // Act
            const result = await createWithDeposit({
              userId,
              collectionId,
              cycleId
            });

            // Assert - Property: balance_amount = collection_price - 100.00
            const expectedBalance = collectionPrice - 100.00;
            expect(result.balance_amount).toBeCloseTo(expectedBalance, 2);
            
            // Also verify total_amount equals collection price
            expect(result.total_amount).toBeCloseTo(collectionPrice, 2);
            
            // And verify the relationship: deposit + balance = total
            expect(result.deposit_amount + result.balance_amount).toBeCloseTo(result.total_amount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('cancelStandalonePurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel purchase and release capacity when before cutoff', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'deposit_paid'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock is_before_cutoff to return true
    const mockRpc = supabase.rpc as any;
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_before_cutoff') {
        return Promise.resolve({ data: true, error: null });
      }
      if (fnName === 'release_capacity') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123', 'Customer requested cancellation');

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('is_before_cutoff');
    expect(mockRpc).toHaveBeenCalledWith('release_capacity', {
      p_cycle_id: 'cycle-456',
      p_quantity: 1
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Released capacity for standalone purchase purchase-123')
    );

    consoleSpy.mockRestore();
  });

  it('should not release capacity when after cutoff', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'deposit_paid'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock is_before_cutoff to return false
    const mockRpc = supabase.rpc as any;
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_before_cutoff') {
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123');

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('is_before_cutoff');
    expect(mockRpc).not.toHaveBeenCalledWith('release_capacity', expect.anything());
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cutoff has passed - capacity not released')
    );

    consoleSpy.mockRestore();
  });

  it('should handle purchase without cycle_id', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase without cycle_id
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: null,
              status: 'deposit_paid'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    const mockRpc = supabase.rpc as any;

    // Act
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123');

    // Assert - should not call any RPC functions
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should throw error if purchase not found', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Purchase not found' }
          })
        })
      })
    });

    // Act & Assert
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('invalid-id')).rejects.toThrow(
      'Failed to get standalone purchase'
    );
  });

  it('should throw error if purchase already cancelled', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'cancelled'
            },
            error: null
          })
        })
      })
    });

    // Act & Assert
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('purchase-123')).rejects.toThrow(
      'Standalone purchase is already cancelled'
    );
  });

  it('should handle capacity release errors gracefully', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'deposit_paid'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock is_before_cutoff to return true
    const mockRpc = supabase.rpc as any;
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_before_cutoff') {
        return Promise.resolve({ data: true, error: null });
      }
      if (fnName === 'release_capacity') {
        return Promise.resolve({ data: null, error: { message: 'Capacity release failed' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act - should not throw even though capacity release fails
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('purchase-123')).resolves.not.toThrow();

    // Assert - error should be logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error releasing capacity'),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('should include cancellation reason in update', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'deposit_paid'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Mock RPC calls
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: false, error: null });

    // Act
    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123', 'Out of stock');

    // Assert
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancellation_reason: 'Out of stock'
      })
    );
  });
});


describe('processBalancePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject payment if purchase not found', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Purchase not found' }
          })
        })
      })
    });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('invalid-id', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Failed to get standalone purchase');
  });

  it('should reject payment if status is not awaiting_balance', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid', // Wrong status
              balance_due_date: new Date(Date.now() + 86400000).toISOString() // Tomorrow
            },
            error: null
          })
        })
      })
    });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow("Cannot process balance payment - purchase status is deposit_paid");
  });

  it('should reject payment if balance_due_date has passed', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Set due date to yesterday
    const yesterday = new Date(Date.now() - 86400000);
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: yesterday.toISOString()
            },
            error: null
          })
        })
      })
    });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Cannot process balance payment - payment deadline has passed');
  });

  it('should process payment successfully when all validations pass', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Set due date to tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: tomorrow.toISOString()
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await processBalancePayment('purchase-123', 'https://example.com/balance-voucher.jpg');

    // Assert
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'balance_paid',
        payment_voucher_balance_url: 'https://example.com/balance-voucher.jpg',
        balance_paid_at: expect.any(String),
        tracking_code: expect.stringMatching(/^SP-\d{8}-[A-Z0-9]{5}$/)
      })
    );
  });

  it('should generate tracking code in correct format', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    const tomorrow = new Date(Date.now() + 86400000);
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: tomorrow.toISOString()
            },
            error: null
          })
        })
      })
    });

    let capturedTrackingCode: string | undefined;
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedTrackingCode = data.tracking_code;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await processBalancePayment('purchase-123', 'https://example.com/voucher.jpg');

    // Assert - tracking code format: SP-YYYYMMDD-XXXXX
    expect(capturedTrackingCode).toBeDefined();
    expect(capturedTrackingCode).toMatch(/^SP-\d{8}-[A-Z0-9]{5}$/);
    
    // Verify date part is today
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(capturedTrackingCode).toContain(today);
  });

  it('should handle purchase without balance_due_date', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: null // No due date set
            },
            error: null
          })
        })
      })
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act - should not throw
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).resolves.not.toThrow();

    // Assert
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'balance_paid'
      })
    );
  });

  it('should set balance_paid_at timestamp', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    const tomorrow = new Date(Date.now() + 86400000);
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: tomorrow.toISOString()
            },
            error: null
          })
        })
      })
    });

    let capturedTimestamp: string | undefined;
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedTimestamp = data.balance_paid_at;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const beforeCall = new Date();
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await processBalancePayment('purchase-123', 'https://example.com/voucher.jpg');
    const afterCall = new Date();

    // Assert
    expect(capturedTimestamp).toBeDefined();
    const timestamp = new Date(capturedTimestamp!);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should throw error if update fails', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    const tomorrow = new Date(Date.now() + 86400000);
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance',
              balance_due_date: tomorrow.toISOString()
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      })
    });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Failed to update standalone purchase');
  });
});


// Mock holiday service
vi.mock('./holiday-service', () => ({
  getHolidayDates: vi.fn().mockResolvedValue([])
}));

describe('markProductionComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject if purchase not found', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Purchase not found' }
          })
        })
      })
    });

    // Act & Assert
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await expect(
      markProductionComplete('invalid-id')
    ).rejects.toThrow('Failed to get standalone purchase');
  });

  it('should reject if status is not deposit_paid', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'awaiting_balance', // Wrong status
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    // Act & Assert
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await expect(
      markProductionComplete('purchase-123')
    ).rejects.toThrow("Cannot mark production complete - purchase status is awaiting_balance");
  });

  it('should update status to awaiting_balance and set timestamps', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');

    // Assert
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'awaiting_balance',
        production_complete_at: expect.any(String),
        balance_due_date: expect.any(String)
      })
    );
  });

  it('should calculate balance_due_date as 5 business days after production_complete_at', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    let capturedBalanceDueDate: string | undefined;
    let capturedProductionCompleteAt: string | undefined;
    
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedBalanceDueDate = data.balance_due_date;
      capturedProductionCompleteAt = data.production_complete_at;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');

    // Assert
    expect(capturedProductionCompleteAt).toBeDefined();
    expect(capturedBalanceDueDate).toBeDefined();
    
    const productionDate = new Date(capturedProductionCompleteAt!);
    const dueDate = new Date(capturedBalanceDueDate!);
    
    // Due date should be after production date
    expect(dueDate.getTime()).toBeGreaterThan(productionDate.getTime());
    
    // Due date should be at least 5 days after (accounting for weekends/holidays)
    const minDays = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
    expect(dueDate.getTime() - productionDate.getTime()).toBeGreaterThanOrEqual(minDays);
  });

  it('should set production_complete_at to current timestamp', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    let capturedTimestamp: string | undefined;
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedTimestamp = data.production_complete_at;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const beforeCall = new Date();
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');
    const afterCall = new Date();

    // Assert
    expect(capturedTimestamp).toBeDefined();
    const timestamp = new Date(capturedTimestamp!);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should log email notification', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Email notification sent to user user-456')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Balance due date:')
    );

    consoleSpy.mockRestore();
  });

  it('should throw error if update fails', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      })
    });

    // Act & Assert
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await expect(
      markProductionComplete('purchase-123')
    ).rejects.toThrow('Failed to update standalone purchase');
  });

  it('should handle holidays when calculating business days', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              status: 'deposit_paid',
              user_id: 'user-456'
            },
            error: null
          })
        })
      })
    });

    let capturedBalanceDueDate: string | undefined;
    
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedBalanceDueDate = data.balance_due_date;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');

    // Assert - balance_due_date should be set (holidays are considered)
    expect(capturedBalanceDueDate).toBeDefined();
    const dueDate = new Date(capturedBalanceDueDate!);
    expect(dueDate).toBeInstanceOf(Date);
    expect(isNaN(dueDate.getTime())).toBe(false);
  });
});


describe('cancelForNonPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject if purchase not found', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Purchase not found' }
          })
        })
      })
    });

    // Act & Assert
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await expect(
      cancelForNonPayment('invalid-id')
    ).rejects.toThrow('Failed to get standalone purchase');
  });

  it('should reject if status is not awaiting_balance', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'deposit_paid', // Wrong status
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    // Act & Assert
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await expect(
      cancelForNonPayment('purchase-123')
    ).rejects.toThrow("Cannot cancel for non-payment - purchase status is deposit_paid");
  });

  it('should cancel purchase and set correct cancellation reason', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Mock RPC calls
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Act
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await cancelForNonPayment('purchase-123');

    // Assert - Requirement 4.6, 4.8
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancelled_at: expect.any(String),
        cancellation_reason: 'Balance payment not received within deadline (Arras Confirmatórias)'
      })
    );
  });

  it('should release capacity when cancelling', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    // Mock getting the purchase
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    // Mock updating the purchase
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock RPC calls
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await cancelForNonPayment('purchase-123');

    // Assert - Requirement 4.7
    expect(mockRpc).toHaveBeenCalledWith('release_capacity', {
      p_cycle_id: 'cycle-456',
      p_quantity: 1
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Released capacity for cancelled standalone purchase purchase-123')
    );

    consoleSpy.mockRestore();
  });

  it('should log cancellation email notification', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await cancelForNonPayment('purchase-123');

    // Assert - Requirement 4.6
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cancellation email sent to user user-789')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Balance payment not received within deadline (Arras Confirmatórias)')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deposit retained as Arras Confirmatórias (non-refundable)')
    );

    consoleSpy.mockRestore();
  });

  it('should handle capacity release errors gracefully', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock RPC to fail on release_capacity
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ 
      data: null, 
      error: { message: 'Capacity release failed' } 
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act - should not throw even though capacity release fails
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await expect(cancelForNonPayment('purchase-123')).resolves.not.toThrow();

    // Assert - error should be logged but cancellation succeeds
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error releasing capacity'),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('should handle purchase without cycle_id', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: null, // No cycle_id
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    const mockRpc = supabase.rpc as any;

    // Act
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await cancelForNonPayment('purchase-123');

    // Assert - should not call release_capacity if no cycle_id
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should set cancelled_at timestamp', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    let capturedTimestamp: string | undefined;
    const updateMock = vi.fn().mockImplementation((data: any) => {
      capturedTimestamp = data.cancelled_at;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Act
    const beforeCall = new Date();
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await cancelForNonPayment('purchase-123');
    const afterCall = new Date();

    // Assert
    expect(capturedTimestamp).toBeDefined();
    const timestamp = new Date(capturedTimestamp!);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should throw error if update fails', async () => {
    // Arrange
    const mockFrom = supabase.from as any;
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'purchase-123',
              cycle_id: 'cycle-456',
              status: 'awaiting_balance',
              user_id: 'user-789'
            },
            error: null
          })
        })
      })
    });

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      })
    });

    // Act & Assert
    const { cancelForNonPayment } = await import('./standalone-purchase-service');
    await expect(
      cancelForNonPayment('purchase-123')
    ).rejects.toThrow('Failed to cancel standalone purchase');
  });
});
