/**
 * Tests for Delivery Service
 * 
 * Requirements: 6.2, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { activateDelivery, activateDeliveryWithService, batchActivateDeliveriesForMonth } from './delivery-service';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'user-789' } },
          error: null,
        })
      ),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

// Mock the automatic maintenance service
vi.mock('./automatic-maintenance-service', () => ({
  applyAutomaticMaintenance: vi.fn(),
}));

describe('Delivery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any) = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as any) = vi.fn();
  });

  describe('activateDelivery', () => {
    it('should call the database function to activate delivery', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.rpc as any) = mockRpc;

      const deliveryId = 'delivery-123';
      await activateDelivery(deliveryId);

      expect(mockRpc).toHaveBeenCalledWith('activate_delivery_with_auto_maintenance', {
        p_delivery_id: deliveryId,
      });
    });

    it('should throw error if database function fails', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      (supabase.rpc as any) = mockRpc;

      const deliveryId = 'delivery-123';
      await expect(activateDelivery(deliveryId)).rejects.toThrow('Failed to activate delivery: Database error');
    });
  });

  describe('activateDeliveryWithService', () => {
    it('should delegate activation and maintenance to the atomic delivery RPC', async () => {
      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      await activateDeliveryWithService(deliveryId, subscriptionId);

      expect(supabase.rpc).toHaveBeenCalledWith('activate_delivery_with_auto_maintenance', {
        p_delivery_id: deliveryId,
      });
    });

    it('should propagate activation RPC failures', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Activation failed' },
      });
      
      await expect(
        activateDeliveryWithService('delivery-123', 'sub-123')
      ).rejects.toThrow('Failed to activate delivery: Activation failed');
    });
  });

  describe('batchActivateDeliveriesForMonth', () => {
    it('should activate all scheduled deliveries for the month', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [
                { id: 'delivery-1', subscription_id: 'sub-1', delivery_number: 1 },
                { id: 'delivery-2', subscription_id: 'sub-2', delivery_number: 2 },
              ],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));

      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.rpc as any) = mockRpc;

      const result = await batchActivateDeliveriesForMonth(3, 2026);

      expect(result).toEqual({ activated: 2, failed: 0 });
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it('should handle activation failures gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [
                { id: 'delivery-1', subscription_id: 'sub-1', delivery_number: 1 },
                { id: 'delivery-2', subscription_id: 'sub-2', delivery_number: 2 },
              ],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));

      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Activation failed' } });
      (supabase.rpc as any) = mockRpc;

      const result = await batchActivateDeliveriesForMonth(3, 2026);

      expect(result).toEqual({ activated: 1, failed: 1 });
    });

    it('should return zero counts if no deliveries found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));

      const result = await batchActivateDeliveriesForMonth(3, 2026);

      expect(result).toEqual({ activated: 0, failed: 0 });
    });
  });

  describe('canChangeCollection', () => {
    it('should return true if delivery is pending_choice and before cutoff', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'pending_choice', cycle_id: 'cycle-123' },
            error: null,
          }),
        }),
      });

      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));
      (supabase.rpc as any) = mockRpc;

      const { canChangeCollection } = await import('./delivery-service');
      const result = await canChangeCollection('delivery-123');

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('is_before_cutoff');
    });

    it('should return false if delivery status is not pending_choice or confirmed', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'shipped', cycle_id: 'cycle-123' },
            error: null,
          }),
        }),
      });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));

      const { canChangeCollection } = await import('./delivery-service');
      const result = await canChangeCollection('delivery-123');

      expect(result).toBe(false);
    });

    it('should return false if after cutoff', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'pending_choice', cycle_id: 'cycle-123' },
            error: null,
          }),
        }),
      });

      const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));
      (supabase.rpc as any) = mockRpc;

      const { canChangeCollection } = await import('./delivery-service');
      const result = await canChangeCollection('delivery-123');

      expect(result).toBe(false);
    });
  });

  describe('changeCollectionChoice', () => {
    it('should change delivery collection through the current-user RPC when allowed', async () => {
      const mockDeliveryStatusQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              status: 'pending_choice',
              cycle_id: 'cycle-123',
            },
            error: null,
          }),
        }),
      };
      const mockSelect = vi.fn().mockReturnValueOnce(mockDeliveryStatusQuery);

      const mockRpc = vi.fn((fn: string) => {
        if (fn === 'is_before_cutoff') {
          return Promise.resolve({ data: true, error: null });
        }

        return Promise.resolve({ data: 'choice-change-id', error: null });
      });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
          };
        }
        return {};
      });
      (supabase.rpc as any) = mockRpc;

      const { changeCollectionChoice } = await import('./delivery-service');
      await changeCollectionChoice(
        'delivery-123',
        'new-collection-456',
        'user-789',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockRpc).toHaveBeenCalledWith('change_delivery_collection_choice_for_current_user', {
        p_delivery_id: 'delivery-123',
        p_new_collection_id: 'new-collection-456',
        p_user_id: 'user-789',
        p_ip_address: '192.168.1.1',
        p_user_agent: 'Mozilla/5.0',
      });
    });

    it('should throw error if cutoff has passed', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'pending_choice', cycle_id: 'cycle-123' },
            error: null,
          }),
        }),
      });

      const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });

      (supabase.from as any) = vi.fn(() => ({
        select: mockSelect,
      }));
      (supabase.rpc as any) = mockRpc;

      const { changeCollectionChoice } = await import('./delivery-service');
      await expect(
        changeCollectionChoice('delivery-123', 'new-collection-456', 'user-789')
      ).rejects.toThrow('CUTOFF_PASSED');
    });

    it('should send nullable request metadata to the current-user change RPC', async () => {
      const mockDeliveryStatusQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              status: 'pending_choice',
              cycle_id: 'cycle-123',
            },
            error: null,
          }),
        }),
      };
      const mockSelect = vi.fn().mockReturnValueOnce(mockDeliveryStatusQuery);
      const mockRpc = vi.fn((fn: string) => {
        if (fn === 'is_before_cutoff') {
          return Promise.resolve({ data: true, error: null });
        }

        return Promise.resolve({ data: 'choice-change-id', error: null });
      });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
          };
        }
        return {};
      });
      (supabase.rpc as any) = mockRpc;

      const { changeCollectionChoice } = await import('./delivery-service');
      await changeCollectionChoice('delivery-123', 'new-collection-456', 'user-789');

      expect(mockRpc).toHaveBeenCalledWith('change_delivery_collection_choice_for_current_user', {
        p_delivery_id: 'delivery-123',
        p_new_collection_id: 'new-collection-456',
        p_user_id: 'user-789',
        p_ip_address: null,
        p_user_agent: null,
      });
    });
  });
});
