/**
 * Unit tests for DeliveryService.
 *
 * Administrative mutations go through the authenticated admin RPC gateway.
 * User-owned character changes remain on their dedicated RPC. Read queries
 * continue to use PostgREST.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deliveryService, Delivery, PlanType } from './deliveryService';
import { cycleService, Cycle } from './cycleService';
import { callAdminRpc } from '@/services/admin/rpc/admin-rpc-gateway';

vi.mock('@/services/admin/rpc/admin-rpc-gateway', () => ({
  callAdminRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('./cycleService', () => ({
  cycleService: {
    getCycleById: vi.fn(),
    createCycleIfNotExists: vi.fn(),
  },
  Cycle: {},
}));

const { supabase: mockSupabase } = await import('@/integrations/supabase/client');
const mockCallAdminRpc = vi.mocked(callAdminRpc);

const SUBSCRIPTION_ID = '10000000-0000-4000-8000-000000000001';
const DELIVERY_ID = '20000000-0000-4000-8000-000000000001';
const CYCLE_ID = '30000000-0000-4000-8000-000000000001';
const CHARACTER_ID = '40000000-0000-4000-8000-000000000001';

function uuidFromIndex(index: number): string {
  return `50000000-0000-4000-8000-${String(index).padStart(12, '0').slice(-12)}`;
}

describe('DeliveryService', () => {
  const mockCycle: Cycle = {
    id: CYCLE_ID,
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    cycle_number: 1,
    month: 3,
    year: 2026,
    open_start: '2026-03-01T00:00:00-03:00',
    open_end: '2026-03-15T23:59:59-03:00',
    production_start: '2026-03-16T00:00:00-03:00',
    production_end: '2026-03-31T23:59:59-03:00',
    shipping_date: '2026-04-07',
    status: 'open',
    status_changed_at: null,
    capacity_max: 100,
    capacity_current: 0,
  };

  const mockDelivery: Delivery = {
    id: DELIVERY_ID,
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    subscription_id: SUBSCRIPTION_ID,
    cycle_id: CYCLE_ID,
    character_id: null,
    delivery_number: 1,
    status: 'scheduled',
    status_changed_at: null,
    scheduled_date: '2026-04-07',
    shipped_at: null,
    delivered_at: null,
    tracking_code: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockScheduledDeliveries(count: number): Delivery[] {
    return Array.from({ length: count }, (_, index) => ({
      ...mockDelivery,
      id: uuidFromIndex(index + 1),
      cycle_id: uuidFromIndex(100 + index),
      delivery_number: index + 1,
    }));
  }

  function schedulingEnvelope(planType: PlanType) {
    const deliveries = mockScheduledDeliveries(planType === 'trimestral' ? 3 : 6);
    return {
      deliveries,
      bonusPiece:
        planType === 'semestral'
          ? {
              id: uuidFromIndex(900),
              subscription_id: SUBSCRIPTION_ID,
              delivery_id: deliveries[5].id,
              description: 'Exclusive bonus piece for Semestral plan',
              status: 'pending',
            }
          : null,
    };
  }

  describe('scheduleConsecutiveDeliveries', () => {
    it('agenda 3 entregas para plano trimestral via gateway administrativo', async () => {
      const planType: PlanType = 'trimestral';
      const entryCycleId = CYCLE_ID;
      mockCallAdminRpc.mockResolvedValueOnce(schedulingEnvelope(planType));

      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        SUBSCRIPTION_ID,
        planType,
        entryCycleId,
      );

      expect(deliveries).toHaveLength(3);
      expect(deliveries.map((delivery) => delivery.delivery_number)).toEqual([1, 2, 3]);
      expect(mockCallAdminRpc).toHaveBeenCalledWith('admin_schedule_subscription_deliveries', {
        p_subscription_id: SUBSCRIPTION_ID,
        p_plan_type: planType,
        p_entry_cycle_id: entryCycleId,
      });
    });

    it('agenda 6 entregas e valida o bonus do plano semestral', async () => {
      mockCallAdminRpc.mockResolvedValueOnce(schedulingEnvelope('semestral'));

      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        SUBSCRIPTION_ID,
        'semestral',
        CYCLE_ID,
      );

      expect(deliveries).toHaveLength(6);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[5].delivery_number).toBe(6);
    });

    it('propaga falha do gateway de agendamento', async () => {
      mockCallAdminRpc.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        deliveryService.scheduleConsecutiveDeliveries(
          SUBSCRIPTION_ID,
          'trimestral',
          CYCLE_ID,
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateDeliveryStatus', () => {
    it('atualiza status para shipped via gateway administrativo', async () => {
      mockCallAdminRpc.mockResolvedValueOnce({
        ...mockDelivery,
        status: 'shipped',
      });

      await deliveryService.updateDeliveryStatus(DELIVERY_ID, 'shipped');

      expect(mockCallAdminRpc).toHaveBeenCalledWith('admin_update_delivery_status_legacy', {
        p_delivery_id: DELIVERY_ID,
        p_status: 'shipped',
      });
    });

    it('atualiza status para delivered via gateway administrativo', async () => {
      mockCallAdminRpc.mockResolvedValueOnce({
        ...mockDelivery,
        status: 'delivered',
      });

      await deliveryService.updateDeliveryStatus(DELIVERY_ID, 'delivered');

      expect(mockCallAdminRpc).toHaveBeenCalledWith('admin_update_delivery_status_legacy', {
        p_delivery_id: DELIVERY_ID,
        p_status: 'delivered',
      });
    });

    it('falha fechado quando o gateway de status falha', async () => {
      mockCallAdminRpc.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        deliveryService.updateDeliveryStatus(DELIVERY_ID, 'shipped'),
      ).rejects.toThrow('Erro ao atualizar status da entrega: Update failed');
    });
  });

  describe('getDeliveriesBySubscription', () => {
    it('retorna entregas ordenadas por numero', async () => {
      const mockDeliveries = [
        { ...mockDelivery, delivery_number: 1 },
        { ...mockDelivery, delivery_number: 2 },
        { ...mockDelivery, delivery_number: 3 },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockDeliveries,
              error: null,
            }),
          })),
        })),
      });

      const deliveries = await deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID);

      expect(deliveries).toHaveLength(3);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[2].delivery_number).toBe(3);
    });

    it('retorna array vazio quando nao ha entregas', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      await expect(
        deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID),
      ).resolves.toEqual([]);
    });

    it('propaga falha da consulta de entregas', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed' },
            }),
          })),
        })),
      });

      await expect(
        deliveryService.getDeliveriesBySubscription(SUBSCRIPTION_ID),
      ).rejects.toThrow('Erro ao buscar entregas: Query failed');
    });
  });

  describe('canChangeCharacter', () => {
    it('retorna true se o ciclo esta open', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: CYCLE_ID },
              error: null,
            }),
          })),
        })),
      });
      vi.mocked(cycleService.getCycleById).mockResolvedValue({ ...mockCycle, status: 'open' });

      await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(true);
    });

    it('retorna false se o ciclo esta em production', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: CYCLE_ID },
              error: null,
            }),
          })),
        })),
      });
      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'production',
      });

      await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(false);
    });

    it('retorna false se nao houver cycle_id', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: null },
              error: null,
            }),
          })),
        })),
      });

      await expect(deliveryService.canChangeCharacter(DELIVERY_ID)).resolves.toBe(false);
    });
  });

  describe('changeCharacter', () => {
    it('troca personagem pela RPC dedicada ao usuario', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          ...mockDelivery,
          character_id: CHARACTER_ID,
        },
        error: null,
      });

      await deliveryService.changeCharacter(DELIVERY_ID, CHARACTER_ID);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'change_delivery_character_for_current_user',
        {
          p_delivery_id: DELIVERY_ID,
          p_character_id: CHARACTER_ID,
        },
      );
    });

    it('retorna erro amigavel quando a troca nao e permitida', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Character changes are not allowed after the cycle enters production',
        },
      });

      await expect(
        deliveryService.changeCharacter(DELIVERY_ID, CHARACTER_ID),
      ).rejects.toThrow('Nao e possivel trocar o personagem');
    });
  });

  describe('getCurrentDelivery', () => {
    it('retorna a entrega atual em andamento', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockDelivery, error: null }),
                })),
              })),
            })),
          })),
        })),
      });

      const delivery = await deliveryService.getCurrentDelivery(SUBSCRIPTION_ID);

      expect(delivery).toBeDefined();
      expect(delivery?.id).toBe(DELIVERY_ID);
    });

    it('retorna null se nao houver entrega atual', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      await expect(deliveryService.getCurrentDelivery(SUBSCRIPTION_ID)).resolves.toBeNull();
    });
  });
});
