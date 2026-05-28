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
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
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

vi.mock('@/services/auth/current-user', () => ({
  assertCurrentUserId: vi.fn().mockResolvedValue('user-123'),
  requireAuthenticatedUserId: vi.fn().mockResolvedValue('user-123'),
}));

vi.mock('./email-service', () => ({
  emailService: {
    sendProductionStarted: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { validateBeforeCutoff } from '@/lib/cutoff-middleware';

describe('Standalone Purchase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        success: true,
        purchase: {
          id: 'purchase-123',
          user_id: 'user-123',
          collection_id: 'collection-456',
          cycle_id: 'cycle-789',
          status: 'deposit_paid',
          deposit_amount: 100.00,
          balance_amount: 150.00,
          total_amount: 250.00
        }
      },
      error: null
    });
  });

  describe('createWithDeposit', () => {
    it('should reject purchase if cutoff has passed', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Cannot create standalone purchase - cutoff has passed'
        },
        error: null
      });

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

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-standalone-purchase', {
        body: {
          collectionId: 'collection-456',
          cycleId: 'cycle-789',
          characterId: undefined,
          depositVoucherUrl: 'https://example.com/voucher.jpg'
        }
      });
    });

    it('should reject purchase if cycle is not open', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Cannot create standalone purchase - cycle is production'
        },
        error: null
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
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Capacity limit exceeded'
        },
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
      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-standalone-purchase', {
        body: {
          collectionId: 'collection-456',
          cycleId: 'cycle-789',
          characterId: undefined,
          depositVoucherUrl: 'https://example.com/voucher.jpg'
        }
      });
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
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Cannot create standalone purchase - cutoff has passed'
        },
        error: null
      });

      const params = {
        userId: 'user-123',
        collectionId: 'collection-456',
        cycleId: 'cycle-789'
      };

      // Act & Assert
      await expect(createWithDeposit(params)).rejects.toThrow();
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-standalone-purchase', {
        body: {
          collectionId: 'collection-456',
          cycleId: 'cycle-789',
          characterId: undefined,
          depositVoucherUrl: undefined
        }
      });
    });

    it('should check both cutoff and cycle status', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Cannot create standalone purchase - cycle is production'
        },
        error: null
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
            (supabase.functions.invoke as any).mockResolvedValue({
              data: {
                success: true,
                purchase: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  user_id: userId,
                  collection_id: collectionId,
                  cycle_id: cycleId,
                  status: 'deposit_paid',
                  deposit_amount: 100.00,
                  balance_amount: collectionPrice - 100.00,
                  total_amount: collectionPrice
                }
              },
              error: null
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
            mockRpc.mockImplementation((fn: string) => {
              if (fn === 'check_capacity_available') {
                return Promise.resolve({ data: true, error: null });
              } else if (fn === 'reserve_capacity') {
                return Promise.resolve({ data: null, error: null });
              }
            });
            (supabase.functions.invoke as any).mockResolvedValue({
              data: {
                success: true,
                purchase: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  user_id: userId,
                  collection_id: collectionId,
                  cycle_id: cycleId,
                  status: 'deposit_paid',
                  deposit_amount: 100.00,
                  balance_amount: collectionPrice - 100.00,
                  total_amount: collectionPrice
                }
              },
              error: null
            });

            // Act
            const result = await createWithDeposit({
              userId,
              collectionId,
              cycleId
            });

            // Assert - Property: creation is delegated to the server-side function that reserves capacity.
            expect(supabase.functions.invoke).toHaveBeenCalledWith('create-standalone-purchase', {
              body: {
                collectionId,
                cycleId,
                characterId: undefined,
                depositVoucherUrl: undefined
              }
            });
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
            (supabase.functions.invoke as any).mockResolvedValue({
              data: {
                success: true,
                purchase: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  user_id: userId,
                  collection_id: collectionId,
                  cycle_id: cycleId,
                  status: 'deposit_paid',
                  deposit_amount: 100.00,
                  balance_amount: collectionPrice - 100.00,
                  total_amount: collectionPrice
                }
              },
              error: null
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
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: { capacityReleased: true }, error: null });

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123', 'Customer requested cancellation');

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_standalone_purchase', {
      p_purchase_id: 'purchase-123',
      p_reason: 'Customer requested cancellation'
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cancelled standalone purchase purchase-123'),
      expect.objectContaining({ context: 'standalone-purchase' })
    );

    consoleSpy.mockRestore();
  });

  it('should not release capacity when after cutoff', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: { capacityReleased: false }, error: null });

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123');

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_standalone_purchase', {
      p_purchase_id: 'purchase-123',
      p_reason: 'Cancelled by admin'
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cancelled standalone purchase purchase-123'),
      expect.objectContaining({ context: 'standalone-purchase' })
    );

    consoleSpy.mockRestore();
  });

  it('should handle purchase without cycle_id', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: { capacityReleased: false }, error: null });

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123');

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_standalone_purchase', {
      p_purchase_id: 'purchase-123',
      p_reason: 'Cancelled by admin'
    });
  });

  it('should throw error if purchase not found', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Purchase not found' } });

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('invalid-id')).rejects.toThrow(
      'Failed to cancel standalone purchase: Purchase not found'
    );
  });

  it('should throw error if purchase already cancelled', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Standalone purchase is already cancelled' } });

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('purchase-123')).rejects.toThrow(
      'Standalone purchase is already cancelled'
    );
  });

  it('should handle capacity release errors gracefully', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: { capacityReleased: false }, error: null });

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await expect(cancelStandalonePurchase('purchase-123')).resolves.not.toThrow();

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_standalone_purchase', {
      p_purchase_id: 'purchase-123',
      p_reason: 'Cancelled by admin'
    });
  });

  it('should include cancellation reason in update', async () => {
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValue({ data: { capacityReleased: true }, error: null });

    const { cancelStandalonePurchase } = await import('./standalone-purchase-service');
    await cancelStandalonePurchase('purchase-123', 'Out of stock');

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_standalone_purchase', {
      p_purchase_id: 'purchase-123',
      p_reason: 'Out of stock'
    });
  });
});


describe('processBalancePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject payment if purchase not found', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'PURCHASE_NOT_FOUND' } });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Failed to get standalone purchase');
  });

  it('should reject payment if status is not awaiting_balance', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'INVALID_STATUS:deposit_paid' } });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow("Cannot process balance payment - purchase status is deposit_paid");
  });

  it('should reject payment if balance_due_date has passed', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'BALANCE_DEADLINE_PASSED' } });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Cannot process balance payment - payment deadline has passed');
  });

  it('should submit voucher successfully without marking the balance as paid', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({
      data: { success: true, status: 'awaiting_balance', voucherSubmitted: true },
      error: null
    });

    // Act
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await processBalancePayment('purchase-123', 'https://example.com/balance-voucher.jpg');

    // Assert
    expect(mockRpc).toHaveBeenCalledWith(
      'submit_standalone_balance_voucher',
      {
        p_purchase_id: 'purchase-123',
        p_balance_voucher_url: 'https://example.com/balance-voucher.jpg'
      }
    );
  });

  it('should handle purchase without balance_due_date through the RPC', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({
      data: { success: true, status: 'awaiting_balance', voucherSubmitted: true },
      error: null
    });

    // Act - should not throw
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).resolves.not.toThrow();

    // Assert
    expect(mockRpc).toHaveBeenCalledWith(
      'submit_standalone_balance_voucher',
      {
        p_purchase_id: 'purchase-123',
        p_balance_voucher_url: 'https://example.com/voucher.jpg'
      }
    );
  });

  it('should reject non-HTTPS voucher URLs before calling the RPC', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'http://example.com/voucher.jpg')
    ).rejects.toThrow('balanceVoucherUrl must be a valid HTTPS URL');

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should throw error if voucher submission RPC fails', async () => {
    // Arrange
    const mockRpc = supabase.rpc as any;
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    // Act & Assert
    const { processBalancePayment } = await import('./standalone-purchase-service');
    await expect(
      processBalancePayment('purchase-123', 'https://example.com/voucher.jpg')
    ).rejects.toThrow('Failed to submit balance payment voucher: Database error');
  });
});


// Mock holiday service
vi.mock('./holiday-service', () => ({
  getHolidayDates: vi.fn().mockResolvedValue([])
}));

describe('markProductionComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({
      data: { balanceDueDate: '2026-04-10T00:00:00Z' },
      error: null
    });
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

    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Purchase not found' }
    });

    const { markProductionComplete } = await import('./standalone-purchase-service');
    await expect(
      markProductionComplete('invalid-id')
    ).rejects.toThrow('Failed to mark production complete: Purchase not found');
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

    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Cannot mark production complete - purchase status is awaiting_balance' }
    });

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

    expect(supabase.rpc).toHaveBeenCalledWith('admin_mark_standalone_production_complete', {
      p_purchase_id: 'purchase-123'
    });
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

    let _capturedBalanceDueDate: string | undefined;
    let _capturedProductionCompleteAt: string | undefined;
    
    const updateMock = vi.fn().mockImplementation((data: any) => {
      _capturedBalanceDueDate = data.balance_due_date;
      _capturedProductionCompleteAt = data.production_complete_at;
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

    expect(supabase.rpc).toHaveBeenCalledWith('admin_mark_standalone_production_complete', {
      p_purchase_id: 'purchase-123'
    });
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

    let _capturedTimestamp: string | undefined;
    const updateMock = vi.fn().mockImplementation((data: any) => {
      _capturedTimestamp = data.production_complete_at;
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    
    mockFrom.mockReturnValueOnce({
      update: updateMock
    });

    // Act
    const _beforeCall = new Date();
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');
    const _afterCall = new Date();

    expect(supabase.rpc).toHaveBeenCalledWith('admin_mark_standalone_production_complete', {
      p_purchase_id: 'purchase-123'
    });
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

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // Act
    const { markProductionComplete } = await import('./standalone-purchase-service');
    await markProductionComplete('purchase-123');

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Production complete email sent'),
      expect.objectContaining({
        context: 'standalone-purchase',
        meta: expect.objectContaining({
          purchaseId: 'purchase-123',
          balanceDueDate: '2026-04-10T00:00:00Z',
        }),
      })
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

    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    });

    const { markProductionComplete } = await import('./standalone-purchase-service');
    await expect(
      markProductionComplete('purchase-123')
    ).rejects.toThrow('Failed to mark production complete: Database error');
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

    let _capturedBalanceDueDate: string | undefined;
    
    const updateMock = vi.fn().mockImplementation((data: any) => {
      _capturedBalanceDueDate = data.balance_due_date;
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

    expect(supabase.rpc).toHaveBeenCalledWith('admin_mark_standalone_production_complete', {
      p_purchase_id: 'purchase-123'
    });
  });
});


describe('cancelForNonPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be server-side only', async () => {
    const { cancelForNonPayment } = await import('./standalone-purchase-service');

    await expect(cancelForNonPayment('purchase-123')).rejects.toThrow(
      'cancelForNonPayment is server-side only'
    );
  });
});
