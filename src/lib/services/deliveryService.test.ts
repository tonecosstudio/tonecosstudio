/**
 * Testes unitarios - DeliveryService
 *
 * Mantem mutacoes na fronteira RPC e consultas como PostgREST.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deliveryService, Delivery, PlanType } from './deliveryService';
import { cycleService, Cycle } from './cycleService';

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

describe('DeliveryService', () => {
  const mockCycle: Cycle = {
    id: 'cycle-1',
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
    id: 'delivery-1',
    created_at: '2026-03-01T00:00:00-03:00',
    updated_at: '2026-03-01T00:00:00-03:00',
    subscription_id: 'sub-1',
    cycle_id: 'cycle-1',
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
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  function mockScheduledDeliveries(count: number): Delivery[] {
    return Array.from({ length: count }, (_, index) => ({
      ...mockDelivery,
      id: `delivery-${index + 1}`,
      delivery_number: index + 1,
    }));
  }

  describe('scheduleConsecutiveDeliveries', () => {
    it('deve agendar 3 entregas para plano trimestral via RPC', async () => {
      const subscriptionId = 'sub-123';
      const planType: PlanType = 'trimestral';
      const entryCycleId = 'cycle-2-march-2026';
      mockSupabase.rpc.mockResolvedValue({
        data: { deliveries: mockScheduledDeliveries(3) },
        error: null,
      });

      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        subscriptionId,
        planType,
        entryCycleId
      );

      expect(deliveries).toHaveLength(3);
      expect(deliveries.map((delivery) => delivery.delivery_number)).toEqual([1, 2, 3]);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_schedule_subscription_deliveries', {
        p_subscription_id: subscriptionId,
        p_plan_type: planType,
        p_entry_cycle_id: entryCycleId,
      });
    });

    it('deve agendar 6 entregas para plano semestral via RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { deliveries: mockScheduledDeliveries(6) },
        error: null,
      });

      const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
        'sub-456',
        'semestral',
        'cycle-1-march-2026'
      );

      expect(deliveries).toHaveLength(6);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[5].delivery_number).toBe(6);
    });

    it('deve propagar erro se a RPC de agendamento falhar', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        deliveryService.scheduleConsecutiveDeliveries('sub-1', 'trimestral', 'cycle-1')
      ).rejects.toThrow('Erro ao agendar entregas: Database error');
    });
  });

  describe('updateDeliveryStatus', () => {
    it('deve atualizar status para shipped via RPC', async () => {
      await deliveryService.updateDeliveryStatus('delivery-1', 'shipped');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_update_delivery_status_legacy', {
        p_delivery_id: 'delivery-1',
        p_status: 'shipped',
      });
    });

    it('deve atualizar status para delivered via RPC', async () => {
      await deliveryService.updateDeliveryStatus('delivery-1', 'delivered');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_update_delivery_status_legacy', {
        p_delivery_id: 'delivery-1',
        p_status: 'delivered',
      });
    });

    it('deve lancar erro se a RPC de status falhar', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        deliveryService.updateDeliveryStatus('delivery-1', 'shipped')
      ).rejects.toThrow('Erro ao atualizar status da entrega: Update failed');
    });
  });

  describe('getDeliveriesBySubscription', () => {
    it('deve retornar entregas ordenadas por numero', async () => {
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

      const deliveries = await deliveryService.getDeliveriesBySubscription('sub-1');

      expect(deliveries).toHaveLength(3);
      expect(deliveries[0].delivery_number).toBe(1);
      expect(deliveries[2].delivery_number).toBe(3);
    });

    it('deve retornar array vazio se nao houver entregas', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      });

      await expect(deliveryService.getDeliveriesBySubscription('sub-1')).resolves.toEqual([]);
    });

    it('deve lancar erro se falhar ao buscar', async () => {
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
        deliveryService.getDeliveriesBySubscription('sub-1')
      ).rejects.toThrow('Erro ao buscar entregas: Query failed');
    });
  });

  describe('canChangeCharacter', () => {
    it('deve retornar true se ciclo esta open', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'open',
      });

      await expect(deliveryService.canChangeCharacter('delivery-1')).resolves.toBe(true);
    });

    it('deve retornar false se ciclo esta em production', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { cycle_id: 'cycle-1' },
              error: null,
            }),
          })),
        })),
      });

      vi.mocked(cycleService.getCycleById).mockResolvedValue({
        ...mockCycle,
        status: 'production',
      });

      await expect(deliveryService.canChangeCharacter('delivery-1')).resolves.toBe(false);
    });

    it('deve retornar false se nao houver cycle_id', async () => {
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

      await expect(deliveryService.canChangeCharacter('delivery-1')).resolves.toBe(false);
    });
  });

  describe('changeCharacter', () => {
    it('deve trocar personagem via RPC', async () => {
      await deliveryService.changeCharacter('delivery-1', 'character-2');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('change_delivery_character_for_current_user', {
        p_delivery_id: 'delivery-1',
        p_character_id: 'character-2',
      });
    });

    it('deve lancar erro amigavel se troca nao for permitida', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          message: 'Character changes are not allowed after the cycle enters production',
        },
      });

      await expect(
        deliveryService.changeCharacter('delivery-1', 'character-2')
      ).rejects.toThrow('Nao e possivel trocar o personagem');
    });
  });

  describe('getCurrentDelivery', () => {
    it('deve retornar entrega atual em andamento', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: mockDelivery,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      const delivery = await deliveryService.getCurrentDelivery('sub-1');

      expect(delivery).toBeDefined();
      expect(delivery?.id).toBe('delivery-1');
    });

    it('deve retornar null se nao houver entrega atual', async () => {
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

      await expect(deliveryService.getCurrentDelivery('sub-1')).resolves.toBeNull();
    });
  });
});
