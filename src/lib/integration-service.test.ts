/**
 * Tests for IntegrationService
 * 
 * Requirements: 15.1-15.15
 * Design: .kiro/specs/manual-payment-system/design.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handlePaymentApproval,
  updateQuoteStatus,
  activateSubscription,
  createSubscriptionDeliveries,
  calculateNextDeliveryDate,
} from './integration-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('IntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateQuoteStatus', () => {
    it('should update quote status to paid', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await updateQuoteStatus('quote-123', 'paid');

      expect(supabase.from).toHaveBeenCalledWith('quotes');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'paid' });
    });

    it('should throw error if quote update fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await expect(updateQuoteStatus('quote-123', 'paid')).rejects.toThrow(
        'Failed to update quote status: Database error'
      );
    });
  });

  describe('calculateNextDeliveryDate', () => {
    it('should calculate next delivery date for trimestral plan (3 months)', () => {
      const now = new Date();
      const nextDate = calculateNextDeliveryDate('trimestral');

      // Should be 3 months in the future
      const expectedMonth = (now.getMonth() + 3) % 12;
      expect(nextDate.getMonth()).toBe(expectedMonth);
      expect(nextDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate next delivery date for semestral plan (6 months)', () => {
      const now = new Date();
      const nextDate = calculateNextDeliveryDate('semestral');

      // Should be 6 months in the future
      const expectedMonth = (now.getMonth() + 6) % 12;
      expect(nextDate.getMonth()).toBe(expectedMonth);
      expect(nextDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate next delivery date for anual plan (12 months)', () => {
      const now = new Date();
      const nextDate = calculateNextDeliveryDate('anual');

      // Should be 12 months in the future (same month, next year)
      expect(nextDate.getMonth()).toBe(now.getMonth());
      expect(nextDate.getFullYear()).toBe(now.getFullYear() + 1);
      expect(nextDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should default to 3 months for unknown plan type', () => {
      const now = new Date('2024-01-15');
      vi.setSystemTime(now);

      const nextDate = calculateNextDeliveryDate('unknown');

      expect(nextDate.getMonth()).toBe(3); // April (0-indexed)
    });
  });

  describe('createSubscriptionDeliveries', () => {
    it('should create delivery records for trimestral subscription', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              plan_type: 'trimestral',
              deliveries_total: 3,
            },
            error: null,
          }),
        }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return { select: mockSelect } as any;
        }
        if (table === 'subscription_deliveries') {
          return { insert: mockInsert } as any;
        }
        return {} as any;
      });

      await createSubscriptionDeliveries('sub-123');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            subscription_id: 'sub-123',
            delivery_number: 1,
            status: 'scheduled',
          }),
          expect.objectContaining({
            subscription_id: 'sub-123',
            delivery_number: 2,
            status: 'scheduled',
          }),
          expect.objectContaining({
            subscription_id: 'sub-123',
            delivery_number: 3,
            status: 'scheduled',
          }),
        ])
      );
    });

    it('should throw error if subscription not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(createSubscriptionDeliveries('sub-123')).rejects.toThrow(
        'Subscription not found'
      );
    });

    it('should throw error if delivery creation fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              plan_type: 'trimestral',
              deliveries_total: 3,
            },
            error: null,
          }),
        }),
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return { select: mockSelect } as any;
        }
        if (table === 'subscription_deliveries') {
          return { insert: mockInsert } as any;
        }
        return {} as any;
      });

      await expect(createSubscriptionDeliveries('sub-123')).rejects.toThrow(
        'Failed to create subscription deliveries: Insert failed'
      );
    });
  });

  describe('activateSubscription', () => {
    it('should activate subscription and create deliveries', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-123',
              plan_type: 'trimestral',
              deliveries_total: 3,
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      // Track which call we're on for subscriptions table
      let subscriptionsCallCount = 0;

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          subscriptionsCallCount++;
          if (subscriptionsCallCount === 1 || subscriptionsCallCount === 3) {
            // First and third calls: fetch subscription (for activateSubscription and createSubscriptionDeliveries)
            return { select: mockSelect } as any;
          } else {
            // Second call: update subscription
            return { update: mockUpdate } as any;
          }
        }
        if (table === 'subscription_deliveries') {
          return { insert: mockInsert } as any;
        }
        return {} as any;
      });

      await activateSubscription('sub-123', 'payment-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          next_delivery_date: expect.any(String),
          next_production_start: expect.any(String),
        })
      );
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should throw error if subscription not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(
        activateSubscription('sub-123', 'payment-123')
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('handlePaymentApproval', () => {
    it('should update quote status when payment is for a quote', async () => {
      const mockPaymentSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-123',
              status: 'approved',
              quote_id: 'quote-123',
              subscription_id: null,
            },
            error: null,
          }),
        }),
      });

      const mockQuoteUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return { select: mockPaymentSelect } as any;
        }
        if (table === 'quotes') {
          return { update: mockQuoteUpdate } as any;
        }
        return {} as any;
      });

      await handlePaymentApproval('payment-123');

      expect(mockQuoteUpdate).toHaveBeenCalledWith({ status: 'paid' });
    });

    it('should activate subscription when payment is for a subscription', async () => {
      const mockPaymentSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-123',
              status: 'approved',
              quote_id: null,
              subscription_id: 'sub-123',
            },
            error: null,
          }),
        }),
      });

      const mockSubSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-123',
              plan_type: 'trimestral',
              deliveries_total: 3,
            },
            error: null,
          }),
        }),
      });

      const mockSubUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockDeliveriesInsert = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return { select: mockPaymentSelect } as any;
        }
        if (table === 'subscriptions') {
          if (mockSubSelect.mock.calls.length === 0) {
            return { select: mockSubSelect } as any;
          }
          return { update: mockSubUpdate, select: mockSubSelect } as any;
        }
        if (table === 'subscription_deliveries') {
          return { insert: mockDeliveriesInsert, select: mockSubSelect } as any;
        }
        return {} as any;
      });

      await handlePaymentApproval('payment-123');

      expect(mockSubUpdate).toHaveBeenCalled();
      expect(mockDeliveriesInsert).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(handlePaymentApproval('payment-123')).rejects.toThrow(
        'Payment not found'
      );
    });

    it('should throw error if payment is not approved', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-123',
              status: 'pending',
              quote_id: 'quote-123',
            },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(handlePaymentApproval('payment-123')).rejects.toThrow(
        'Payment must be approved before integration'
      );
    });

    it('should throw error if payment has no linked entity', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-123',
              status: 'approved',
              quote_id: null,
              subscription_id: null,
            },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(handlePaymentApproval('payment-123')).rejects.toThrow(
        'Payment must be linked to either a quote or subscription'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundary correctly for delivery dates', () => {
      const now = new Date('2024-11-15');
      vi.setSystemTime(now);

      const nextDate = calculateNextDeliveryDate('trimestral');

      expect(nextDate.getFullYear()).toBe(2025);
      expect(nextDate.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should handle leap year correctly', () => {
      const now = new Date('2024-02-29'); // Leap year
      vi.setSystemTime(now);

      const nextDate = calculateNextDeliveryDate('trimestral');

      expect(nextDate.getMonth()).toBe(4); // May (0-indexed)
    });
  });
});
