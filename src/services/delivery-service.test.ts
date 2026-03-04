// @ts-nocheck
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
    it('should activate delivery and apply automatic maintenance for non-first delivery', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'scheduled', delivery_number: 2 },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const automaticMaintenanceModule = await import('./automatic-maintenance-service');
      const applyAutomaticMaintenanceSpy = vi.spyOn(automaticMaintenanceModule, 'applyAutomaticMaintenance').mockResolvedValue(undefined);

      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      await activateDeliveryWithService(deliveryId, subscriptionId);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'pending_choice',
        updated_at: expect.any(String),
      });
      expect(applyAutomaticMaintenanceSpy).toHaveBeenCalledWith(deliveryId, subscriptionId);
    });

    it('should skip automatic maintenance for first delivery', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'scheduled', delivery_number: 1 },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const automaticMaintenanceModule = await import('./automatic-maintenance-service');
      const applyAutomaticMaintenanceSpy = vi.spyOn(automaticMaintenanceModule, 'applyAutomaticMaintenance');

      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      await activateDeliveryWithService(deliveryId, subscriptionId);

      expect(mockUpdate).toHaveBeenCalled();
      expect(applyAutomaticMaintenanceSpy).not.toHaveBeenCalled();
    });

    it('should skip activation if delivery is not in scheduled status', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'confirmed', delivery_number: 2 },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn();

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      await activateDeliveryWithService(deliveryId, subscriptionId);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should not fail activation if automatic maintenance fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'scheduled', delivery_number: 2 },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const automaticMaintenanceModule = await import('./automatic-maintenance-service');
      vi.spyOn(automaticMaintenanceModule, 'applyAutomaticMaintenance').mockRejectedValue(new Error('Maintenance failed'));

      const deliveryId = 'delivery-123';
      const subscriptionId = 'sub-123';
      
      // Should not throw
      await expect(activateDeliveryWithService(deliveryId, subscriptionId)).resolves.not.toThrow();
      
      expect(mockUpdate).toHaveBeenCalled();
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
    it('should update delivery and create audit trail when allowed', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              status: 'pending_choice', 
              cycle_id: 'cycle-123',
              collection_id: 'old-collection-123',
              auto_maintained: true
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'collection_choice_history') {
          return {
            insert: mockInsert,
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

      expect(mockUpdate).toHaveBeenCalledWith({
        collection_id: 'new-collection-456',
        auto_maintained: false,
        updated_at: expect.any(String),
      });

      expect(mockInsert).toHaveBeenCalledWith({
        delivery_id: 'delivery-123',
        user_id: 'user-789',
        previous_collection_id: 'old-collection-123',
        new_collection_id: 'new-collection-456',
        change_reason: 'manual',
        changed_by_admin: false,
        admin_user_id: null,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
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

    it('should reset auto_maintained flag when manually changed', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              status: 'pending_choice', 
              cycle_id: 'cycle-123',
              collection_id: 'old-collection-123',
              auto_maintained: true
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });

      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'subscription_deliveries') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'collection_choice_history') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });
      (supabase.rpc as any) = mockRpc;

      const { changeCollectionChoice } = await import('./delivery-service');
      await changeCollectionChoice('delivery-123', 'new-collection-456', 'user-789');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          auto_maintained: false,
        })
      );
    });
  });
});
